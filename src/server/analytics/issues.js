import prisma from "../db.js";
import { resolveRange } from "../../lib/dates.js";
import { durationStats } from "./aggregate.js";

/**
 * Issue metrics for issues the user opened.
 * Resolution time = opened → closed, for issues closed within the range.
 */
export async function getIssueSummary(userId, { range, tz, repositoryId, now = new Date() }) {
  const r = resolveRange(range, { now, tz });
  const repo = repositoryId ? { repositoryId } : {};

  const [opened, closed, openNow] = await Promise.all([
    prisma.issue.count({ where: { userId, ...repo, openedAt: { gte: r.start } } }),
    prisma.issue.findMany({
      where: { userId, ...repo, closedAt: { gte: r.start } },
      select: { openedAt: true, closedAt: true },
    }),
    prisma.issue.count({ where: { userId, ...repo, state: "open" } }),
  ]);
  const resolution = durationStats(closed, "openedAt", "closedAt");

  return {
    range: r.key,
    label: r.label,
    opened,
    closed: closed.length,
    openNow,
    medianHoursToClose: resolution.medianHours,
    meanHoursToClose: resolution.meanHours,
  };
}

export async function listIssues(userId, { state, repositoryId, search, page = 1, pageSize = 25 }) {
  const where = {
    userId,
    ...(state ? { state } : {}),
    ...(repositoryId ? { repositoryId } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      orderBy: [{ openedAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { repository: { select: { id: true, fullName: true } } },
    }),
    prisma.issue.count({ where }),
  ]);
  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
