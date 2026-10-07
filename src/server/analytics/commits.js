import prisma from "../db.js";
import { localDateKey, localMidnight, resolveRange, startOfMonthKey } from "../../lib/dates.js";
import { getCommitRhythm, utc } from "./activity.js";
import { optionalRepoFilter } from "./sql.js";

/**
 * Commit summary metrics. "Average per week" is computed over the selected
 * range; most active day/hour over the same range in the user's timezone.
 */
export async function getCommitSummary(userId, { range, tz, repositoryId, now = new Date() }) {
  const r = resolveRange(range, { now, tz });
  const monthStart = localMidnight(startOfMonthKey(localDateKey(now, tz)), tz);
  const repo = optionalRepoFilter(repositoryId);

  const [[counts], rhythm] = await Promise.all([
    prisma.$queryRaw`
      SELECT count(*)::int AS total,
             count(*) FILTER (WHERE "committedAt" >= ${utc(monthStart)})::int AS "thisMonth",
             count(*) FILTER (WHERE "committedAt" >= ${utc(r.start)})::int AS "inRange",
             min("committedAt") AS first
      FROM commits WHERE "userId" = ${userId} ${repo}`,
    getCommitRhythm(userId, { since: r.start, tz, repositoryId }),
  ]);

  const weeks = r.days / 7;
  const busiestDay = rhythm.total ? rhythm.weekdays.indexOf(Math.max(...rhythm.weekdays)) : null;
  const busiestHour = rhythm.total ? rhythm.hours.indexOf(Math.max(...rhythm.hours)) : null;
  return {
    range: r.key,
    label: r.label,
    total: counts.total,
    thisMonth: counts.thisMonth,
    inRange: counts.inRange,
    averagePerWeek: counts.inRange / weeks,
    firstCommitAt: counts.first,
    busiestDay,
    busiestHour,
    rhythm,
  };
}

export async function listCommits(userId, { repositoryId, search, page = 1, pageSize = 25 }) {
  const where = {
    userId,
    ...(repositoryId ? { repositoryId } : {}),
    ...(search ? { message: { contains: search, mode: "insensitive" } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.commit.findMany({
      where,
      orderBy: [{ committedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sha: true,
        message: true,
        authorName: true,
        authorLogin: true,
        committedAt: true,
        url: true,
        repository: { select: { id: true, fullName: true } },
      },
    }),
    prisma.commit.count({ where }),
  ]);
  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Commits per repository in a range, for "where commits go" breakdowns. */
export async function getCommitsByRepository(userId, { since, limit = 8 }) {
  return prisma.$queryRaw`
    SELECT r.id, r."fullName", count(*)::int AS count
    FROM commits c JOIN repositories r ON r.id = c."repositoryId"
    WHERE c."userId" = ${userId} AND c."committedAt" >= ${utc(since)}
    GROUP BY r.id, r."fullName" ORDER BY count DESC LIMIT ${limit}`;
}
