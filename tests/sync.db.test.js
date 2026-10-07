import { beforeEach, describe, expect, it } from "vitest";
import { createGitHubClient } from "@/server/github/client";
import { runSyncJob } from "@/server/sync/run";
import { enqueueSync } from "@/server/sync/jobs";
import { MAX_COMMITS_PER_REPO } from "@/server/github/api";
import { createUser, prisma, resetDatabase } from "./helpers/db";
import { commitItem, createFakeGitHub, issueNode, prNode, repoNode } from "./helpers/fake-github";

const NOW = new Date("2026-10-06T12:00:00Z");

function deps(fake, now = NOW) {
  return {
    createClient: (token) => createGitHubClient(token, { fetchImpl: fake.fetchImpl, sleep: async () => {}, maxRetries: 0 }),
    now: () => now,
  };
}

async function sync(userId, fake, now) {
  const { job } = await enqueueSync(userId, { now: now || NOW });
  return runSyncJob(job.id, deps(fake, now));
}

function manyCommits(count, startDay = "2026-09-01") {
  return Array.from({ length: count }, (_, i) =>
    commitItem(`sha${String(i).padStart(5, "0")}`, new Date(Date.parse(`${startDay}T10:00:00Z`) + i * 60_000).toISOString()),
  );
}

const api = repoNode(1, "api", { languages: { JavaScript: 900, CSS: 100 } });
const web = repoNode(2, "web", { language: "TypeScript", languages: { TypeScript: 500 } });
const empty = repoNode(3, "empty", { language: null, languages: {} });
const external = repoNode(99, "framework", { owner: "big-oss" });

function baseFake(overrides = {}) {
  return createFakeGitHub({
    repos: [api, web, empty],
    commits: { "octo/api": manyCommits(230), "octo/web": [commitItem("w1", "2026-09-20T09:00:00Z", "Add authentication system")] },
    emptyRepos: ["octo/empty"],
    pullRequests: [prNode(11, 1, api), prNode(12, 2, web, { state: "OPEN", mergedAt: null }), prNode(13, 7, external, { state: "CLOSED" })],
    issues: [issueNode(21, 4, api), issueNode(22, 5, external, { state: "OPEN" })],
    contributions: [{ date: "2026-10-01", contributionCount: 3 }, { date: "2026-10-02", contributionCount: 0 }],
    ...overrides,
  });
}

beforeEach(resetDatabase);

describe("GitHub synchronization", () => {
  it("fetches, normalizes and stores all stages", async () => {
    const user = await createUser({ login: "octo" });
    const fake = baseFake();
    const job = await sync(user.id, fake);

    expect(job.status).toBe("completed");
    expect(Object.values(job.stages).every((s) => s.status === "done")).toBe(true);
    expect(job.stages.commits.count).toBe(231);

    const repos = await prisma.repository.findMany({ where: { userId: user.id }, orderBy: { externalId: "asc" } });
    expect(repos.map((r) => r.fullName).sort()).toEqual(["big-oss/framework", "octo/api", "octo/empty", "octo/web"]);
    expect(repos.find((r) => r.fullName === "big-oss/framework")).toMatchObject({ isAffiliated: false, isOwner: false });

    expect(await prisma.commit.count({ where: { userId: user.id } })).toBe(231);
    const commit = await prisma.commit.findFirst({ where: { sha: "w1" } });
    expect(commit.message).toBe("Add authentication system");

    const prs = await prisma.pullRequest.findMany({ where: { userId: user.id }, orderBy: { number: "asc" } });
    expect(prs.map((p) => p.state)).toEqual(["merged", "open", "closed"]);
    expect(await prisma.issue.count({ where: { userId: user.id } })).toBe(2);

    const langs = await prisma.languageStat.findMany({ where: { repository: { userId: user.id } } });
    expect(langs.map((l) => l.language).sort()).toEqual(["CSS", "JavaScript", "TypeScript"]);

    expect(await prisma.contributionDay.count({ where: { userId: user.id } })).toBe(2);
    expect(await prisma.connectedAccount.findFirst({ where: { userId: user.id } })).toMatchObject({ login: "octo", followers: 5 });
  });

  it("follows REST pagination for large commit histories", async () => {
    const user = await createUser({ login: "octo" });
    const fake = baseFake();
    await sync(user.id, fake);
    const commitCalls = fake.calls.filter((c) => c.path === "/repos/octo/api/commits");
    expect(commitCalls).toHaveLength(3); // 230 commits at 100 per page
    expect(commitCalls[0].search).toContain("author=octo");
  });

  it("follows GraphQL cursors across pages", async () => {
    const user = await createUser({ login: "octo" });
    const repos = Array.from({ length: 5 }, (_, i) => repoNode(100 + i, `r${i}`));
    const fake = createFakeGitHub({ repos, pageSize: 2 });
    await sync(user.id, fake);
    expect(await prisma.repository.count({ where: { userId: user.id } })).toBe(5);
  });

  it("does not create duplicates when syncing repeatedly", async () => {
    const user = await createUser({ login: "octo" });
    const fake = baseFake();
    await sync(user.id, fake);
    const later = new Date(NOW.getTime() + 3_600_000);
    const second = await sync(user.id, fake, later);
    expect(second.status).toBe("completed");

    expect(await prisma.repository.count({ where: { userId: user.id } })).toBe(4);
    expect(await prisma.commit.count({ where: { userId: user.id } })).toBe(231);
    expect(await prisma.pullRequest.count({ where: { userId: user.id } })).toBe(3);
    expect(await prisma.issue.count({ where: { userId: user.id } })).toBe(2);
    expect(await prisma.languageStat.count()).toBe(3);
  });

  it("syncs incrementally using per-repository cursors", async () => {
    const user = await createUser({ login: "octo" });
    const fake = baseFake();
    await sync(user.id, fake);
    fake.calls.length = 0;

    // Second sync: only the external repo discovered via PRs is fetched for the first time
    await sync(user.id, fake, new Date(NOW.getTime() + 3_600_000));
    expect(fake.calls.filter((c) => c.path.endsWith("/commits")).map((c) => c.path)).toEqual(["/repos/big-oss/framework/commits"]);
    fake.calls.length = 0;

    // Third sync: nothing was pushed since each repo's cursor, so no commit requests at all
    await sync(user.id, fake, new Date(NOW.getTime() + 7_200_000));
    expect(fake.calls.filter((c) => c.path.endsWith("/commits"))).toHaveLength(0);
  });

  it("fetches new commits after a push, using since", async () => {
    const user = await createUser({ login: "octo" });
    const fake = baseFake();
    await sync(user.id, fake);

    const pushed = repoNode(1, "api", { pushedAt: "2026-10-06T13:00:00Z", languages: { JavaScript: 900, CSS: 100 } });
    const next = baseFake({ repos: [pushed, web, empty], commits: { "octo/api": [...manyCommits(230), commitItem("new1", "2026-10-06T12:30:00Z")] } });
    await sync(user.id, next, new Date("2026-10-06T14:00:00Z"));

    const call = next.calls.find((c) => c.path === "/repos/octo/api/commits");
    expect(new URL(`https://x${call.search}`).searchParams.get("since")).toBeTruthy();
    expect(await prisma.commit.count({ where: { userId: user.id } })).toBe(232);
  });

  it("marks repositories that disappear from GitHub as removed but keeps history", async () => {
    const user = await createUser({ login: "octo" });
    await sync(user.id, baseFake());
    const later = new Date(NOW.getTime() + 3_600_000);
    await sync(user.id, baseFake({ repos: [api, empty] }), later);

    const webRepo = await prisma.repository.findFirst({ where: { userId: user.id, name: "web" } });
    expect(webRepo.removedAt).not.toBeNull();
    expect(await prisma.commit.count({ where: { repositoryId: webRepo.id } })).toBe(1);
    // External contribution repos are never removed by the listing diff
    expect((await prisma.repository.findFirst({ where: { name: "framework" } })).removedAt).toBeNull();
  });

  it("skips repositories that return 404 during commit sync", async () => {
    const user = await createUser({ login: "octo" });
    const job = await sync(user.id, baseFake({ missingRepos: ["octo/web"] }));
    expect(job.status).toBe("completed");
    expect(job.stages.commits.skipped).toBe(1);
    expect((await prisma.repository.findFirst({ where: { name: "web" } })).removedAt).not.toBeNull();
  });

  it("records rate limits with a retry time instead of failing silently", async () => {
    const user = await createUser({ login: "octo" });
    const reset = Math.floor(NOW.getTime() / 1000) + 1800;
    const fake = baseFake({
      failWith: ({ url }) =>
        url.pathname.endsWith("/commits")
          ? new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) } })
          : null,
    });
    const job = await sync(user.id, fake);
    expect(job.status).toBe("failed");
    expect(job.errorCode).toBe("RATE_LIMITED");
    expect(job.retryAfter.getTime()).toBe(reset * 1000);
    expect(job.stages.repositories.status).toBe("done");
    expect(job.stages.commits.status).toBe("failed");
    // Data synced before the limit is kept
    expect(await prisma.repository.count({ where: { userId: user.id } })).toBe(3);
  });

  it("fails clearly when GitHub rejects the token", async () => {
    const user = await createUser({ login: "octo" });
    const fake = createFakeGitHub({ failWith: () => new Response('{"message":"Bad credentials"}', { status: 401 }) });
    const job = await sync(user.id, fake);
    expect(job).toMatchObject({ status: "failed", errorCode: "UNAUTHORIZED" });
  });

  it("caps commits per repository per sync", async () => {
    expect(MAX_COMMITS_PER_REPO).toBeGreaterThan(1000);
  });

  it("handles accounts with no repositories or activity", async () => {
    const user = await createUser({ login: "octo" });
    const job = await sync(user.id, createFakeGitHub({}));
    expect(job.status).toBe("completed");
    expect(job.stages.repositories.count).toBe(0);
  });

  it("does not start a second job while one is active", async () => {
    const user = await createUser({ login: "octo" });
    const first = await enqueueSync(user.id, { now: NOW });
    const second = await enqueueSync(user.id, { now: NOW });
    expect(second.created).toBe(false);
    expect(second.job.id).toBe(first.job.id);
    // A job can only be claimed once
    await runSyncJob(first.job.id, deps(baseFake()));
    expect(await runSyncJob(first.job.id, deps(baseFake()))).toBeNull();
  });

  it("keeps each user's synced data separate", async () => {
    const a = await createUser({ login: "octo" });
    const b = await createUser({ login: "other" });
    await sync(a.id, baseFake());
    await sync(b.id, createFakeGitHub({ login: "other", viewerId: 43, repos: [repoNode(1, "api", { owner: "other" })], commits: { "other/api": [commitItem("x1", "2026-09-01T00:00:00Z")] } }));

    expect(await prisma.commit.count({ where: { userId: a.id } })).toBe(231);
    expect(await prisma.commit.count({ where: { userId: b.id } })).toBe(1);
    // Same GitHub repository id for two users produces two separate rows
    expect(await prisma.repository.count({ where: { externalId: "1" } })).toBe(2);
  });
});
