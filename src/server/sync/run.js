import prisma from "../db.js";
import { invalidateUserCache } from "../cache.js";
import { getGitHubAccessToken } from "../auth/tokens.js";
import { createGitHubClient, GitHubError, RateLimitError } from "../github/client.js";
import {
  MAX_COMMITS_PER_REPO,
  fetchCommits,
  fetchContributionCalendar,
  fetchIssues,
  fetchPullRequests,
  fetchRepositories,
  fetchViewer,
} from "../github/api.js";
import {
  normalizeCommit,
  normalizeContributionCalendar,
  normalizeIssue,
  normalizeLanguages,
  normalizeProfile,
  normalizePullRequest,
  normalizeRepository,
} from "../github/normalize.js";
import {
  insertCommits,
  markMissingRepositoriesRemoved,
  markRepositoryRemoved,
  replaceContributionDays,
  replaceLanguageStats,
  setCommitCursor,
  upsertConnectedAccount,
  upsertIssues,
  upsertPullRequests,
  upsertRepositories,
} from "./store.js";
import { claimJob, enqueueSync, getLastCompletedSync, getLatestSyncJob } from "./jobs.js";

const DAY = 24 * 60 * 60_000;
// Overlap windows absorb clock skew and late-pushed commits. Duplicates are
// harmless because every write is keyed on a natural id.
const PR_ISSUE_OVERLAP_MS = 60 * 60_000;
const COMMIT_OVERLAP_MS = 7 * DAY;

// Per-repository failures that should skip that repository, not fail the sync.
const SKIPPABLE_REPO_ERRORS = new Set(["NOT_FOUND", "FORBIDDEN", "UNAVAILABLE"]);

class SyncFailure extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function classifyError(error) {
  if (error instanceof RateLimitError) {
    return { errorCode: "RATE_LIMITED", errorMessage: error.message, retryAfter: error.resetAt };
  }
  if (error instanceof SyncFailure) return { errorCode: error.code, errorMessage: error.message };
  if (error instanceof GitHubError) {
    return { errorCode: error.code === "UNAUTHORIZED" ? "UNAUTHORIZED" : error.code, errorMessage: error.message };
  }
  return { errorCode: "SYNC_ERROR", errorMessage: error?.message || "Unexpected error" };
}

/**
 * Execute a queued sync job end to end.
 *
 * Dependencies are injectable so tests can run the full pipeline against a
 * fake GitHub API.
 */
export async function runSyncJob(
  jobId,
  { createClient = createGitHubClient, getToken = getGitHubAccessToken, now = () => new Date() } = {},
) {
  if (!(await claimJob(jobId, now()))) return null;

  const job = await prisma.syncJob.findUnique({ where: { id: jobId } });
  const { userId } = job;
  const stages = { ...job.stages };

  async function saveProgress(stageKey, patch, extra = {}) {
    stages[stageKey] = { ...stages[stageKey], ...patch };
    await prisma.syncJob.update({
      where: { id: jobId },
      data: { stages, currentStage: stageKey, heartbeatAt: now(), ...extra },
    });
  }

  async function stage(key, fn) {
    await saveProgress(key, { status: "running" });
    try {
      const result = (await fn((progress) => saveProgress(key, progress))) || {};
      await saveProgress(key, { status: "done", ...result });
    } catch (error) {
      await saveProgress(key, { status: "failed" });
      throw error;
    }
  }

  try {
    const token = await getToken(userId);
    if (!token) throw new SyncFailure("NO_TOKEN", "No GitHub token stored for this user");
    const client = createClient(token);

    const lastCompleted = await getLastCompletedSync(userId, { excludeId: jobId });
    const updatedSince = lastCompleted?.startedAt
      ? new Date(lastCompleted.startedAt.getTime() - PR_ISSUE_OVERLAP_MS)
      : null;

    let login;
    let repoNodes = [];
    const repoIds = new Map();

    await stage("profile", async () => {
      const viewer = await fetchViewer(client);
      const profile = normalizeProfile(viewer);
      login = profile.login;
      await upsertConnectedAccount(userId, profile);
      return { count: 1 };
    });

    await stage("repositories", async () => {
      repoNodes = await fetchRepositories(client);
      const repos = repoNodes.map((node) => normalizeRepository(node, login)).filter(Boolean);
      for (const [externalId, id] of await upsertRepositories(userId, repos)) repoIds.set(externalId, id);
      const removed = await markMissingRepositoriesRemoved(userId, new Set(repos.map((r) => r.externalId)), now());
      return { count: repos.length, removed };
    });

    await stage("contributions", async () => {
      const to = now();
      const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) - 364 * DAY);
      const calendar = await fetchContributionCalendar(client, { from, to });
      await replaceContributionDays(userId, normalizeContributionCalendar(calendar));
      return { count: calendar?.totalContributions ?? 0 };
    });

    await stage("commits", async (report) => {
      const repos = await prisma.repository.findMany({
        where: { userId, removedAt: null },
        select: { id: true, fullName: true, repoPushedAt: true, commitsSyncedAt: true },
        orderBy: { repoPushedAt: { sort: "desc", nulls: "last" } },
      });
      let count = 0;
      let skipped = 0;
      let truncated = 0;
      for (const [index, repo] of repos.entries()) {
        const upToDate = repo.commitsSyncedAt && repo.repoPushedAt && repo.repoPushedAt <= repo.commitsSyncedAt;
        if (!upToDate) {
          const startedAt = now();
          const since = repo.commitsSyncedAt ? new Date(repo.commitsSyncedAt.getTime() - COMMIT_OVERLAP_MS) : null;
          try {
            const items = await fetchCommits(client, { fullName: repo.fullName, login, since });
            if (items.length >= MAX_COMMITS_PER_REPO) truncated += 1;
            count += await insertCommits(userId, repo.id, items.map(normalizeCommit).filter(Boolean));
            await setCommitCursor(userId, repo.id, startedAt);
          } catch (error) {
            if (!(error instanceof GitHubError) || !SKIPPABLE_REPO_ERRORS.has(error.code)) throw error;
            if (error.code === "NOT_FOUND") await markRepositoryRemoved(userId, repo.id, now());
            skipped += 1;
          }
        }
        if (index % 5 === 4 || index === repos.length - 1) {
          await report({ progress: { done: index + 1, total: repos.length }, count });
        }
      }
      return { count, skipped, truncated };
    });

    // Repositories discovered via PRs/issues (e.g. open source contributions)
    async function resolveRepositoryIds(nodes) {
      const unknown = new Map();
      for (const node of nodes) {
        const repo = normalizeRepository(node.repository, login, { affiliated: false });
        if (repo && !repoIds.has(repo.externalId)) unknown.set(repo.externalId, repo);
      }
      if (unknown.size > 0) {
        for (const [externalId, id] of await upsertRepositories(userId, [...unknown.values()])) {
          repoIds.set(externalId, id);
        }
      }
    }

    await stage("pull_requests", async () => {
      const nodes = (await fetchPullRequests(client, { updatedSince })).filter((n) => n.repository);
      await resolveRepositoryIds(nodes);
      const items = nodes
        .map((node) => ({ repositoryId: repoIds.get(String(node.repository.databaseId)), pr: normalizePullRequest(node) }))
        .filter((item) => item.repositoryId && item.pr);
      return { count: await upsertPullRequests(userId, items) };
    });

    await stage("issues", async () => {
      const nodes = (await fetchIssues(client, { updatedSince })).filter((n) => n.repository);
      await resolveRepositoryIds(nodes);
      const items = nodes
        .map((node) => ({ repositoryId: repoIds.get(String(node.repository.databaseId)), issue: normalizeIssue(node) }))
        .filter((item) => item.repositoryId && item.issue);
      return { count: await upsertIssues(userId, items) };
    });

    await stage("languages", async () => {
      const languages = new Set();
      for (const node of repoNodes) {
        const repositoryId = repoIds.get(String(node.databaseId));
        if (!repositoryId) continue;
        const stats = normalizeLanguages(node);
        stats.forEach((s) => languages.add(s.language));
        await replaceLanguageStats(repositoryId, stats);
      }
      return { count: languages.size };
    });

    await prisma.syncJob.update({
      where: { id: jobId },
      data: { status: "completed", currentStage: null, finishedAt: now(), heartbeatAt: now() },
    });
  } catch (error) {
    const failure = classifyError(error);
    await prisma.syncJob.update({
      where: { id: jobId },
      data: { status: "failed", finishedAt: now(), ...failure },
    });
  } finally {
    await invalidateUserCache(userId);
  }

  return prisma.syncJob.findUnique({ where: { id: jobId } });
}

/**
 * Run a job in this Node process without blocking the request.
 * Suitable for a single long-lived server (the Docker deployment). A
 * dedicated worker can call runSyncJob() instead; jobs are claimed atomically.
 */
export function startSyncInBackground(jobId) {
  runSyncJob(jobId).catch((error) => {
    console.error(`[sync] job ${jobId} crashed:`, error);
  });
}

/**
 * When the last sync hit GitHub's rate limit, retry once the limit resets.
 * Called when the client polls sync status.
 */
export async function retryIfRateLimitExpired(userId, now = new Date()) {
  const latest = await getLatestSyncJob(userId);
  if (latest?.status === "failed" && latest.errorCode === "RATE_LIMITED" && latest.retryAfter && latest.retryAfter <= now) {
    const { job, created } = await enqueueSync(userId, { trigger: "retry", now });
    if (created) startSyncInBackground(job.id);
    return job;
  }
  return latest;
}
