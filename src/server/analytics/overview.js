import { Prisma } from "@prisma/client";
import prisma from "../db.js";
import { resolveRange } from "../../lib/dates.js";
import { utc } from "./activity.js";
import { localBucket, toInt } from "./sql.js";

/**
 * Headline metrics for a range, with the equal-length previous period for
 * comparison. Every number is counted from synchronized records.
 */
export async function getOverviewMetrics(userId, { range, tz, now = new Date() }) {
  const r = resolveRange(range, { now, tz });
  const start = utc(r.start);
  const prev = utc(r.previousStart);

  const [[commits], [prs], [issues], [contributions], [repos], totalRepos] = await Promise.all([
    prisma.$queryRaw`
      SELECT count(*) FILTER (WHERE "committedAt" >= ${start})::int AS current,
             count(*) FILTER (WHERE "committedAt" < ${start})::int AS previous
      FROM commits WHERE "userId" = ${userId} AND "committedAt" >= ${prev}`,
    prisma.$queryRaw`
      SELECT count(*) FILTER (WHERE "openedAt" >= ${start})::int AS current,
             count(*) FILTER (WHERE "openedAt" < ${start})::int AS previous
      FROM pull_requests WHERE "userId" = ${userId} AND "openedAt" >= ${prev}`,
    prisma.$queryRaw`
      SELECT count(*) FILTER (WHERE "openedAt" >= ${start})::int AS current,
             count(*) FILTER (WHERE "openedAt" < ${start})::int AS previous
      FROM issues WHERE "userId" = ${userId} AND "openedAt" >= ${prev}`,
    prisma.$queryRaw`
      SELECT coalesce(sum(count) FILTER (WHERE date >= ${r.startKey}::date), 0)::int AS current,
             coalesce(sum(count) FILTER (WHERE date < ${r.startKey}::date), 0)::int AS previous,
             count(*)::int AS days
      FROM contribution_days WHERE "userId" = ${userId} AND date >= ${r.previousStartKey}::date`,
    prisma.$queryRaw`
      SELECT count(DISTINCT "repositoryId") FILTER (WHERE at >= ${start})::int AS current,
             count(DISTINCT "repositoryId") FILTER (WHERE at < ${start})::int AS previous
      FROM (
        SELECT "repositoryId", "committedAt" AS at FROM commits WHERE "userId" = ${userId} AND "committedAt" >= ${prev}
        UNION ALL SELECT "repositoryId", "openedAt" FROM pull_requests WHERE "userId" = ${userId} AND "openedAt" >= ${prev}
        UNION ALL SELECT "repositoryId", "openedAt" FROM issues WHERE "userId" = ${userId} AND "openedAt" >= ${prev}
      ) a`,
    prisma.repository.count({ where: { userId, removedAt: null, isAffiliated: true } }),
  ]);

  const pair = (row) => ({ current: toInt(row?.current), previous: toInt(row?.previous) });
  return {
    range: r.key,
    label: r.label,
    // The contribution calendar only covers the last year; no comparison
    // is shown when the previous window falls outside it.
    contributions: { ...pair(contributions), available: toInt(contributions?.days) > 0 },
    commits: pair(commits),
    pullRequests: pair(prs),
    issues: pair(issues),
    activeRepositories: pair(repos),
    totalRepositories: totalRepos,
  };
}

/**
 * Repositories ranked by the user's own activity within the range.
 * "Active days" = distinct local days with at least one commit.
 */
export async function getTopRepositories(userId, { range, tz, now = new Date(), limit = 6 }) {
  const r = resolveRange(range, { now, tz });
  const start = utc(r.start);

  const rows = await prisma.$queryRaw`
    WITH c AS (
      SELECT "repositoryId", count(*) AS commits, count(DISTINCT ${localBucket('"committedAt"', tz)}) AS days,
             max("committedAt") AS last
      FROM commits WHERE "userId" = ${userId} AND "committedAt" >= ${start} GROUP BY 1
    ), p AS (
      SELECT "repositoryId", count(*) AS prs, max("openedAt") AS last
      FROM pull_requests WHERE "userId" = ${userId} AND "openedAt" >= ${start} GROUP BY 1
    ), i AS (
      SELECT "repositoryId", count(*) AS issues, max("openedAt") AS last
      FROM issues WHERE "userId" = ${userId} AND "openedAt" >= ${start} GROUP BY 1
    )
    SELECT r.id, r.name, r."fullName", r.description, r."primaryLanguage", r.stars, r.forks, r."isPrivate",
           coalesce(c.commits, 0)::int AS commits, coalesce(p.prs, 0)::int AS prs, coalesce(i.issues, 0)::int AS issues,
           coalesce(c.days, 0)::int AS "activeDays",
           greatest(c.last, p.last, i.last) AS "lastActivity"
    FROM repositories r
    LEFT JOIN c ON c."repositoryId" = r.id
    LEFT JOIN p ON p."repositoryId" = r.id
    LEFT JOIN i ON i."repositoryId" = r.id
    WHERE r."userId" = ${userId} AND (c.commits IS NOT NULL OR p.prs IS NOT NULL OR i.issues IS NOT NULL)
    ORDER BY (coalesce(c.commits, 0) + coalesce(p.prs, 0) + coalesce(i.issues, 0)) DESC, "lastActivity" DESC
    LIMIT ${limit}`;

  return rows.map((row) => ({ ...row, total: row.commits + row.prs + row.issues }));
}

/** Weekly activity per repository for small sparklines. */
export async function getRepositorySparklines(userId, repositoryIds, { tz, since }) {
  if (repositoryIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw`
    SELECT "repositoryId", ${localBucket('"committedAt"', tz, "week")} AS key, count(*)::int AS count
    FROM commits
    WHERE "userId" = ${userId} AND "repositoryId" IN (${Prisma.join(repositoryIds)}) AND "committedAt" >= ${utc(since)}
    GROUP BY 1, 2`;
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.repositoryId)) map.set(row.repositoryId, []);
    map.get(row.repositoryId).push({ key: row.key, count: row.count });
  }
  return map;
}
