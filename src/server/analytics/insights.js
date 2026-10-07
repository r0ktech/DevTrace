import prisma from "../db.js";
import { addDaysKey, bucketKeys, fillSeries, localDateKey, localMidnight } from "../../lib/dates.js";
import { getCommitRhythm, getDailyActivityRows, utc } from "./activity.js";
import { durationsInHours, sum } from "./aggregate.js";
import { buildInsights } from "./insight-rules.js";

const DAY = 86_400_000;

/**
 * Gather the aggregates every insight rule needs, then evaluate the rules.
 * All windows are anchored at local midnight in the user's timezone.
 */
export async function getInsights(userId, { tz, now = new Date() }) {
  const todayKey = localDateKey(now, tz);
  const start30Key = addDaysKey(todayKey, -29);
  const start60Key = addDaysKey(todayKey, -59);
  const start90Key = addDaysKey(todayKey, -89);
  const start30 = localMidnight(start30Key, tz);
  const start60 = localMidnight(start60Key, tz);
  const start90 = localMidnight(start90Key, tz);

  const [dailyRows, rhythm, repoRows, merged, closedIssues, prOutcomes, firstActivity] = await Promise.all([
    getDailyActivityRows(userId, { startKey: start90Key, tz }),
    getCommitRhythm(userId, { since: start90, tz }),
    prisma.$queryRaw`
      SELECT r."fullName" AS name, count(*)::int AS value FROM (
        SELECT "repositoryId" FROM commits WHERE "userId" = ${userId} AND "committedAt" >= ${utc(start30)}
        UNION ALL SELECT "repositoryId" FROM pull_requests WHERE "userId" = ${userId} AND "openedAt" >= ${utc(start30)}
        UNION ALL SELECT "repositoryId" FROM issues WHERE "userId" = ${userId} AND "openedAt" >= ${utc(start30)}
      ) a JOIN repositories r ON r.id = a."repositoryId"
      GROUP BY r."fullName"`,
    prisma.pullRequest.findMany({
      where: { userId, mergedAt: { gte: start60 } },
      select: { openedAt: true, mergedAt: true },
    }),
    prisma.issue.findMany({
      where: { userId, closedAt: { gte: start90 } },
      select: { openedAt: true, closedAt: true },
    }),
    prisma.pullRequest.groupBy({
      by: ["state"],
      where: { userId, state: { in: ["merged", "closed"] }, closedAt: { gte: start90 } },
      _count: true,
    }),
    prisma.$queryRaw`
      SELECT r."fullName" AS name, min(a.at) AS first, count(*) FILTER (WHERE a.at >= ${utc(start30)})::int AS value
      FROM (
        SELECT "repositoryId", "committedAt" AS at FROM commits WHERE "userId" = ${userId}
        UNION ALL SELECT "repositoryId", "openedAt" FROM pull_requests WHERE "userId" = ${userId}
        UNION ALL SELECT "repositoryId", "openedAt" FROM issues WHERE "userId" = ${userId}
      ) a JOIN repositories r ON r.id = a."repositoryId"
      GROUP BY r."fullName"
      HAVING min(a.at) >= ${utc(start30)}`,
  ]);

  const dailyActivity = fillSeries(bucketKeys(start90Key, todayKey, "day"), dailyRows);
  const current = sum(dailyActivity.slice(-30).map((d) => d.value));
  const previous = sum(dailyActivity.slice(-60, -30).map((d) => d.value));

  const mergedCurrent = merged.filter((pr) => pr.mergedAt >= start30);
  const mergedPrevious = merged.filter((pr) => pr.mergedAt < start30);
  const outcomes = Object.fromEntries(prOutcomes.map((r) => [r.state, r._count]));

  const input = {
    tz,
    todayKey,
    activity: { current, previous },
    dailyActivity,
    repoActivity: repoRows.map((r) => ({ name: r.name, value: Number(r.value) })),
    commitWeekdays: rhythm.weekdays,
    commitHours: rhythm.hours,
    mergeDurations: {
      current: durationsInHours(mergedCurrent, "openedAt", "mergedAt"),
      previous: durationsInHours(mergedPrevious, "openedAt", "mergedAt"),
    },
    prOutcomes: { merged: outcomes.merged || 0, closed: outcomes.closed || 0 },
    issueResolutionHours: durationsInHours(closedIssues, "openedAt", "closedAt"),
    newRepos: firstActivity.map((r) => ({ name: r.name, value: Number(r.value) })).sort((a, b) => b.value - a.value),
  };

  return { generatedAt: now, insights: buildInsights(input), windowStart: new Date(now.getTime() - 90 * DAY) };
}
