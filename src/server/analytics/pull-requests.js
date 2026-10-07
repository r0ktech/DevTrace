import prisma from "../db.js";
import { resolveRange } from "../../lib/dates.js";
import { durationStats } from "./aggregate.js";

export const PR_STATES = ["open", "merged", "closed"];

/**
 * PR metrics. Counts by state cover PRs opened in the range; time to merge
 * covers PRs merged in the range (opened → merged).
 */
export async function getPullRequestSummary(userId, { range, tz, repositoryId, now = new Date() }) {
  const r = resolveRange(range, { now, tz });
  const repo = repositoryId ? { repositoryId } : {};

  const [byState, merged, openNow] = await Promise.all([
    prisma.pullRequest.groupBy({
      by: ["state"],
      where: { userId, ...repo, openedAt: { gte: r.start } },
      _count: true,
    }),
    prisma.pullRequest.findMany({
      where: { userId, ...repo, mergedAt: { gte: r.start } },
      select: { openedAt: true, mergedAt: true },
    }),
    prisma.pullRequest.count({ where: { userId, ...repo, state: "open" } }),
  ]);

  const counts = Object.fromEntries(PR_STATES.map((s) => [s, 0]));
  for (const row of byState) counts[row.state] = row._count;
  const opened = counts.open + counts.merged + counts.closed;
  const mergeTime = durationStats(merged, "openedAt", "mergedAt");
  const decided = counts.merged + counts.closed;

  return {
    range: r.key,
    label: r.label,
    opened,
    ...counts,
    openNow,
    mergedInRange: merged.length,
    mergeRate: decided ? counts.merged / decided : null,
    medianHoursToMerge: mergeTime.medianHours,
    meanHoursToMerge: mergeTime.meanHours,
  };
}

export async function listPullRequests(userId, { state, repositoryId, search, page = 1, pageSize = 25 }) {
  const where = {
    userId,
    ...(state ? { state } : {}),
    ...(repositoryId ? { repositoryId } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.pullRequest.findMany({
      where,
      orderBy: [{ openedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { repository: { select: { id: true, fullName: true } } },
    }),
    prisma.pullRequest.count({ where }),
  ]);
  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
