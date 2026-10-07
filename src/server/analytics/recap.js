import prisma from "../db.js";
import { addDaysKey, localDateKey, localMidnight } from "../../lib/dates.js";
import { utc } from "./activity.js";

/**
 * What happened in the last N days: counts plus the concrete pull requests
 * merged and issues closed. Used by the Insights recap and the AI summary.
 */
export async function getRecap(userId, { days = 7, tz, now = new Date() }) {
  const startKey = addDaysKey(localDateKey(now, tz), -(days - 1));
  const start = localMidnight(startKey, tz);

  const [commits, prsOpened, merged, issuesOpened, issuesClosed, repos, activeDays] = await Promise.all([
    prisma.commit.count({ where: { userId, committedAt: { gte: start } } }),
    prisma.pullRequest.count({ where: { userId, openedAt: { gte: start } } }),
    prisma.pullRequest.findMany({
      where: { userId, mergedAt: { gte: start } },
      orderBy: { mergedAt: "desc" },
      take: 20,
      select: { id: true, number: true, title: true, url: true, mergedAt: true, repository: { select: { id: true, fullName: true } } },
    }),
    prisma.issue.count({ where: { userId, openedAt: { gte: start } } }),
    prisma.issue.findMany({
      where: { userId, closedAt: { gte: start } },
      orderBy: { closedAt: "desc" },
      take: 20,
      select: { id: true, number: true, title: true, url: true, closedAt: true, repository: { select: { id: true, fullName: true } } },
    }),
    prisma.$queryRaw`
      SELECT r.id, r."fullName" AS name, count(*)::int AS count FROM (
        SELECT "repositoryId" FROM commits WHERE "userId" = ${userId} AND "committedAt" >= ${utc(start)}
        UNION ALL SELECT "repositoryId" FROM pull_requests WHERE "userId" = ${userId} AND "openedAt" >= ${utc(start)}
        UNION ALL SELECT "repositoryId" FROM issues WHERE "userId" = ${userId} AND "openedAt" >= ${utc(start)}
      ) a JOIN repositories r ON r.id = a."repositoryId"
      GROUP BY r.id, r."fullName" ORDER BY count DESC`,
    prisma.$queryRaw`
      SELECT count(DISTINCT to_char(("committedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM-DD'))::int AS days
      FROM commits WHERE "userId" = ${userId} AND "committedAt" >= ${utc(start)}`,
  ]);

  return {
    days,
    startKey,
    commits,
    pullRequestsOpened: prsOpened,
    pullRequestsMerged: merged.length,
    issuesOpened,
    issuesClosed: issuesClosed.length,
    activeDays: activeDays[0]?.days ?? 0,
    repositories: repos,
    mergedPullRequests: merged,
    closedIssues: issuesClosed,
  };
}
