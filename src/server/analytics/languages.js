import { Prisma } from "@prisma/client";
import prisma from "../db.js";
import { utc } from "./activity.js";
import { aggregateLanguageBytes, aggregateLanguageCommits } from "./languages-calc.js";

/** Prisma `where` for a repository scope used by the languages page. */
export function repositoryScopeWhere(userId, { scope = "all", includeArchived = true, repositoryIds } = {}) {
  return {
    userId,
    removedAt: null,
    ...(repositoryIds?.length ? { id: { in: repositoryIds } } : {}),
    ...(scope === "owned" ? { isOwner: true } : {}),
    ...(scope === "exclude-forks" ? { isFork: false } : {}),
    ...(includeArchived ? {} : { isArchived: false }),
  };
}

/**
 * Language usage across the selected repositories.
 * - bytes: GitHub linguist bytes summed across repos (code size)
 * - commits: the user's commits in the last year, attributed to each
 *   repository's primary language
 */
export async function getLanguageBreakdown(userId, filters = {}, { now = new Date() } = {}) {
  const where = repositoryScopeWhere(userId, filters);
  const repos = await prisma.repository.findMany({ where, select: { id: true } });
  const ids = repos.map((r) => r.id);

  if (ids.length === 0) {
    return { repositoryCount: 0, byBytes: [], byCommits: [], reposWithoutLanguageData: 0 };
  }

  const since = new Date(now.getTime() - 365 * 86_400_000);
  const [stats, commitRows] = await Promise.all([
    prisma.languageStat.findMany({
      where: { repositoryId: { in: ids } },
      select: { repositoryId: true, language: true, bytes: true, color: true },
    }),
    prisma.$queryRaw`
      SELECT r."primaryLanguage" AS language, count(*)::int AS commits
      FROM commits c JOIN repositories r ON r.id = c."repositoryId"
      WHERE c."userId" = ${userId} AND c."committedAt" >= ${utc(since)}
        AND c."repositoryId" IN (${Prisma.join(ids)})
      GROUP BY 1`,
  ]);

  const withData = new Set(stats.map((s) => s.repositoryId));
  return {
    repositoryCount: ids.length,
    reposWithoutLanguageData: ids.length - withData.size,
    byBytes: aggregateLanguageBytes(stats),
    byCommits: aggregateLanguageCommits(commitRows),
  };
}
