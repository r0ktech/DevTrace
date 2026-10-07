import prisma from "../db.js";
import { getGitHubAccessToken } from "../auth/tokens.js";
import { createGitHubClient } from "../github/client.js";

const REFRESH_AFTER_MS = 24 * 60 * 60_000;

/**
 * Contributors for one of the user's repositories. Fetched from GitHub on
 * first view and refreshed at most daily; failures fall back to stored data.
 */
export async function getRepositoryContributors(userId, repositoryId, { now = new Date(), clientFactory = createGitHubClient } = {}) {
  const repo = await prisma.repository.findFirst({
    where: { id: repositoryId, userId },
    select: { id: true, fullName: true, contributorsSyncedAt: true, removedAt: true, user: { select: { isDemo: true } } },
  });
  if (!repo) return null;

  let error = null;
  const stale = !repo.contributorsSyncedAt || now - repo.contributorsSyncedAt > REFRESH_AFTER_MS;
  if (stale && !repo.user.isDemo && !repo.removedAt) {
    try {
      const token = await getGitHubAccessToken(userId);
      if (token) {
        const client = clientFactory(token, { timeoutMs: 6000, maxRetries: 0 });
        const data = await client.request(`/repos/${repo.fullName}/contributors`, { per_page: 20 });
        const contributors = (Array.isArray(data) ? data : [])
          .filter((c) => c.login && c.type !== "Bot")
          .map((c) => ({ repositoryId, login: c.login, avatarUrl: c.avatar_url || null, url: c.html_url || null, contributions: c.contributions || 0 }));
        await prisma.$transaction([
          prisma.repositoryContributor.deleteMany({ where: { repositoryId } }),
          prisma.repositoryContributor.createMany({ data: contributors, skipDuplicates: true }),
          prisma.repository.update({ where: { id: repositoryId }, data: { contributorsSyncedAt: now } }),
        ]);
      }
    } catch (err) {
      error = err.code === "EMPTY_REPOSITORY" ? null : "GitHub didn't return contributors for this repository right now.";
    }
  }

  const contributors = await prisma.repositoryContributor.findMany({
    where: { repositoryId },
    orderBy: { contributions: "desc" },
    take: 12,
  });
  const total = contributors.reduce((t, c) => t + c.contributions, 0);
  return { contributors: contributors.map((c) => ({ ...c, share: total ? c.contributions / total : 0 })), error };
}
