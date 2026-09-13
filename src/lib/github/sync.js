import prisma from '@/lib/db';
import {
  createGitHubClient,
  fetchUser,
  fetchRepositories,
  fetchCommits,
  fetchPullRequests,
  fetchIssues,
  fetchLanguages,
  waitForRateLimit,
} from '@/lib/github/client';
import { invalidateCache } from '@/lib/redis';

/**
 * Run a full or incremental sync for a user.
 * @param {string} userId
 * @param {string} accessToken
 * @returns {Promise<object>} syncJob record
 */
export async function runSync(userId, accessToken) {
  const octokit = createGitHubClient(accessToken);

  // Check for an already-running sync
  const existing = await prisma.syncJob.findFirst({
    where: { userId, status: 'running' },
  });
  if (existing) {
    return existing;
  }

  // Find last completed sync for incremental updates
  const lastSync = await prisma.syncJob.findFirst({
    where: { userId, status: 'completed' },
    orderBy: { completedAt: 'desc' },
  });
  const since = lastSync?.completedAt?.toISOString() || undefined;

  // Create sync job
  const syncJob = await prisma.syncJob.create({
    data: { userId, status: 'running', stage: 'profile' },
  });

  try {
    // ── Stage: Profile ─────────────────────────────────────────
    await updateStage(syncJob.id, 'profile');
    const ghUser = await fetchUser(octokit);
    await upsertGitHubProfile(userId, ghUser);

    // ── Stage: Repositories ────────────────────────────────────
    await updateStage(syncJob.id, 'repositories');
    await waitForRateLimit(octokit);
    const repos = await fetchRepositories(octokit);
    const repoMap = await upsertRepositories(userId, repos);
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: { repositoriesSynced: repos.length },
    });

    // ── Stage: Commits ─────────────────────────────────────────
    await updateStage(syncJob.id, 'commits');
    let totalCommits = 0;
    for (const repo of repos) {
      if (repo.size === 0) continue; // skip empty repos
      await waitForRateLimit(octokit, 20);
      const [owner, repoName] = repo.full_name.split('/');
      try {
        const commits = await fetchCommits(octokit, owner, repoName, {
          author: ghUser.login,
          ...(since ? { since } : { per_page: 100 }),
        });
        const dbRepoId = repoMap.get(repo.id);
        if (dbRepoId && commits.length > 0) {
          await upsertCommits(userId, dbRepoId, commits);
          totalCommits += commits.length;
        }
      } catch (error) {
        console.error(`Failed to sync commits for ${repo.full_name}:`, error.message);
      }
    }
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: { commitsSynced: totalCommits },
    });

    // ── Stage: Pull Requests ───────────────────────────────────
    await updateStage(syncJob.id, 'pull_requests');
    let totalPRs = 0;
    for (const repo of repos) {
      await waitForRateLimit(octokit, 20);
      const [owner, repoName] = repo.full_name.split('/');
      try {
        const prs = await fetchPullRequests(octokit, owner, repoName, {
          ...(since ? { since } : {}),
        });
        // Only include PRs authored by the user
        const userPRs = prs.filter(
          (pr) => pr.user?.login === ghUser.login
        );
        const dbRepoId = repoMap.get(repo.id);
        if (dbRepoId && userPRs.length > 0) {
          await upsertPullRequests(userId, dbRepoId, userPRs);
          totalPRs += userPRs.length;
        }
      } catch (error) {
        console.error(`Failed to sync PRs for ${repo.full_name}:`, error.message);
      }
    }
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: { prsSynced: totalPRs },
    });

    // ── Stage: Issues ──────────────────────────────────────────
    await updateStage(syncJob.id, 'issues');
    let totalIssues = 0;
    for (const repo of repos) {
      await waitForRateLimit(octokit, 20);
      const [owner, repoName] = repo.full_name.split('/');
      try {
        const issues = await fetchIssues(octokit, owner, repoName, {
          ...(since ? { since } : {}),
        });
        // Only include issues created by the user
        const userIssues = issues.filter(
          (issue) => issue.user?.login === ghUser.login
        );
        const dbRepoId = repoMap.get(repo.id);
        if (dbRepoId && userIssues.length > 0) {
          await upsertIssues(userId, dbRepoId, userIssues);
          totalIssues += userIssues.length;
        }
      } catch (error) {
        console.error(`Failed to sync issues for ${repo.full_name}:`, error.message);
      }
    }
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: { issuesSynced: totalIssues },
    });

    // ── Stage: Languages ───────────────────────────────────────
    await updateStage(syncJob.id, 'languages');
    for (const repo of repos) {
      if (repo.size === 0) continue;
      await waitForRateLimit(octokit, 20);
      const [owner, repoName] = repo.full_name.split('/');
      try {
        const languages = await fetchLanguages(octokit, owner, repoName);
        const dbRepoId = repoMap.get(repo.id);
        if (dbRepoId) {
          await upsertLanguages(dbRepoId, languages);
        }
      } catch (error) {
        console.error(`Failed to sync languages for ${repo.full_name}:`, error.message);
      }
    }

    // ── Complete ───────────────────────────────────────────────
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'completed',
        stage: 'done',
        completedAt: new Date(),
      },
    });

    // Invalidate dashboard cache for this user
    await invalidateCache(`devtrace:${userId}:*`);

    return await prisma.syncJob.findUnique({ where: { id: syncJob.id } });
  } catch (error) {
    await prisma.syncJob.update({
      where: { id: syncJob.id },
      data: {
        status: 'failed',
        error: error.message || 'Unknown sync error',
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

async function updateStage(syncJobId, stage) {
  await prisma.syncJob.update({
    where: { id: syncJobId },
    data: { stage },
  });
}

async function upsertGitHubProfile(userId, ghUser) {
  await prisma.gitHubProfile.upsert({
    where: { userId },
    create: {
      userId,
      githubId: ghUser.id,
      login: ghUser.login,
      avatarUrl: ghUser.avatar_url,
      bio: ghUser.bio,
      company: ghUser.company,
      location: ghUser.location,
      blog: ghUser.blog,
      publicRepos: ghUser.public_repos,
      followers: ghUser.followers,
      following: ghUser.following,
    },
    update: {
      login: ghUser.login,
      avatarUrl: ghUser.avatar_url,
      bio: ghUser.bio,
      company: ghUser.company,
      location: ghUser.location,
      blog: ghUser.blog,
      publicRepos: ghUser.public_repos,
      followers: ghUser.followers,
      following: ghUser.following,
    },
  });
}

/**
 * Upsert repositories and return a Map of githubId -> dbId.
 */
async function upsertRepositories(userId, repos) {
  const repoMap = new Map();

  for (const repo of repos) {
    const record = await prisma.repository.upsert({
      where: {
        userId_githubId: { userId, githubId: repo.id },
      },
      create: {
        userId,
        githubId: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        openIssues: repo.open_issues_count || 0,
        size: repo.size || 0,
        visibility: repo.visibility || (repo.private ? 'private' : 'public'),
        isArchived: repo.archived || false,
        isFork: repo.fork || false,
        defaultBranch: repo.default_branch || 'main',
        htmlUrl: repo.html_url,
        createdAt: new Date(repo.created_at),
        pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
      },
      update: {
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count || 0,
        forks: repo.forks_count || 0,
        openIssues: repo.open_issues_count || 0,
        size: repo.size || 0,
        visibility: repo.visibility || (repo.private ? 'private' : 'public'),
        isArchived: repo.archived || false,
        isFork: repo.fork || false,
        defaultBranch: repo.default_branch || 'main',
        htmlUrl: repo.html_url,
        pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
      },
    });
    repoMap.set(repo.id, record.id);
  }

  return repoMap;
}

async function upsertCommits(userId, repositoryId, commits) {
  for (const commit of commits) {
    try {
      await prisma.commit.upsert({
        where: {
          userId_sha: { userId, sha: commit.sha },
        },
        create: {
          userId,
          repositoryId,
          sha: commit.sha,
          message: commit.commit?.message || '',
          authorName: commit.commit?.author?.name || null,
          authorEmail: commit.commit?.author?.email || null,
          additions: commit.stats?.additions || 0,
          deletions: commit.stats?.deletions || 0,
          committedAt: new Date(commit.commit?.author?.date || commit.commit?.committer?.date),
          htmlUrl: commit.html_url,
        },
        update: {
          message: commit.commit?.message || '',
          additions: commit.stats?.additions || 0,
          deletions: commit.stats?.deletions || 0,
        },
      });
    } catch (error) {
      // Skip duplicates and invalid data
      if (!error.code?.startsWith('P2')) {
        console.error(`Failed to upsert commit ${commit.sha}:`, error.message);
      }
    }
  }
}

async function upsertPullRequests(userId, repositoryId, prs) {
  for (const pr of prs) {
    try {
      await prisma.pullRequest.upsert({
        where: {
          userId_repositoryId_number: { userId, repositoryId, number: pr.number },
        },
        create: {
          userId,
          repositoryId,
          githubId: pr.id,
          number: pr.number,
          title: pr.title,
          state: pr.merged_at ? 'merged' : pr.state,
          additions: pr.additions || 0,
          deletions: pr.deletions || 0,
          changedFiles: pr.changed_files || 0,
          createdAt: new Date(pr.created_at),
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
          htmlUrl: pr.html_url,
        },
        update: {
          title: pr.title,
          state: pr.merged_at ? 'merged' : pr.state,
          additions: pr.additions || 0,
          deletions: pr.deletions || 0,
          changedFiles: pr.changed_files || 0,
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        },
      });
    } catch (error) {
      if (!error.code?.startsWith('P2')) {
        console.error(`Failed to upsert PR #${pr.number}:`, error.message);
      }
    }
  }
}

async function upsertIssues(userId, repositoryId, issues) {
  for (const issue of issues) {
    try {
      await prisma.issue.upsert({
        where: {
          userId_repositoryId_number: { userId, repositoryId, number: issue.number },
        },
        create: {
          userId,
          repositoryId,
          githubId: issue.id,
          number: issue.number,
          title: issue.title,
          state: issue.state,
          labels: issue.labels?.map((l) => (typeof l === 'string' ? l : l.name)) || [],
          createdAt: new Date(issue.created_at),
          closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
          htmlUrl: issue.html_url,
        },
        update: {
          title: issue.title,
          state: issue.state,
          labels: issue.labels?.map((l) => (typeof l === 'string' ? l : l.name)) || [],
          closedAt: issue.closed_at ? new Date(issue.closed_at) : null,
        },
      });
    } catch (error) {
      if (!error.code?.startsWith('P2')) {
        console.error(`Failed to upsert issue #${issue.number}:`, error.message);
      }
    }
  }
}

async function upsertLanguages(repositoryId, languages) {
  const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);

  // Delete existing language stats for this repo and replace
  await prisma.languageStat.deleteMany({
    where: { repositoryId },
  });

  if (totalBytes === 0) return;

  const records = Object.entries(languages).map(([language, bytes]) => ({
    repositoryId,
    language,
    bytes,
    percentage: Math.round((bytes / totalBytes) * 10000) / 100,
  }));

  await prisma.languageStat.createMany({
    data: records,
  });
}
