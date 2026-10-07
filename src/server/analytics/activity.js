import { Prisma } from "@prisma/client";
import prisma from "../db.js";
import {
  HEATMAP_PERIODS,
  addDaysKey,
  bucketKeys,
  fillSeries,
  localDateKey,
  localMidnight,
  resolveRange,
  startOfWeekKey,
} from "../../lib/dates.js";
import { localBucket, localTimestamp, optionalRepoFilter, toInt } from "./sql.js";

/** A JS Date as a UTC "timestamp without time zone" SQL value. */
export const utc = (date) => Prisma.sql`(${date.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;

/**
 * Commits, PRs opened and issues opened per bucket for a named range.
 */
export async function getActivitySeries(userId, { range, tz, repositoryId, now = new Date(), unit } = {}) {
  const r = resolveRange(range, { now, tz });
  const bucket = unit || r.bucket;
  const repo = optionalRepoFilter(repositoryId);

  const [commits, prs, issues] = await Promise.all([
    prisma.$queryRaw`
      SELECT ${localBucket('"committedAt"', tz, bucket)} AS key, count(*)::int AS count
      FROM commits WHERE "userId" = ${userId} AND "committedAt" >= ${utc(r.start)} ${repo}
      GROUP BY 1`,
    prisma.$queryRaw`
      SELECT ${localBucket('"openedAt"', tz, bucket)} AS key, count(*)::int AS count
      FROM pull_requests WHERE "userId" = ${userId} AND "openedAt" >= ${utc(r.start)} ${repo}
      GROUP BY 1`,
    prisma.$queryRaw`
      SELECT ${localBucket('"openedAt"', tz, bucket)} AS key, count(*)::int AS count
      FROM issues WHERE "userId" = ${userId} AND "openedAt" >= ${utc(r.start)} ${repo}
      GROUP BY 1`,
  ]);

  const keys = bucketKeys(r.startKey, r.endKey, bucket);
  const c = fillSeries(keys, commits);
  const p = fillSeries(keys, prs);
  const i = fillSeries(keys, issues);
  const points = keys.map((key, index) => ({
    key,
    commits: c[index].value,
    pullRequests: p[index].value,
    issues: i[index].value,
  }));
  const totals = points.reduce(
    (t, pt) => ({ commits: t.commits + pt.commits, pullRequests: t.pullRequests + pt.pullRequests, issues: t.issues + pt.issues }),
    { commits: 0, pullRequests: 0, issues: 0 },
  );
  return { range: r.key, label: r.label, unit: bucket, startKey: r.startKey, endKey: r.endKey, points, totals };
}

/**
 * Daily activity for the contribution heatmap.
 * Prefers GitHub's own contribution calendar (includes reviews, etc.).
 * Falls back to DevTrace's commits + PRs + issues when no calendar is stored.
 */
export async function getHeatmap(userId, { period = "1y", tz, now = new Date() } = {}) {
  const config = HEATMAP_PERIODS[period] || HEATMAP_PERIODS["1y"];
  const endKey = localDateKey(now, tz);
  const startKey = addDaysKey(startOfWeekKey(endKey), -(config.weeks - 1) * 7);

  let source = "github";
  let rows = await prisma.$queryRaw`
    SELECT to_char(date, 'YYYY-MM-DD') AS key, count::int AS count
    FROM contribution_days
    WHERE "userId" = ${userId} AND date >= ${startKey}::date AND date <= ${endKey}::date`;

  const hasCalendar = (await prisma.contributionDay.count({ where: { userId } })) > 0;
  if (!hasCalendar) {
    source = "devtrace";
    rows = await getDailyActivityRows(userId, { startKey, tz });
  }

  const days = fillSeries(bucketKeys(startKey, endKey, "day"), rows);
  const total = days.reduce((t, d) => t + d.value, 0);
  return { period: RANGE_KEY(period), label: config.label, startKey, endKey, days, total, source };
}

const RANGE_KEY = (period) => (HEATMAP_PERIODS[period] ? period : "1y");

/** Sparse daily counts of commits + PRs opened + issues opened. */
export async function getDailyActivityRows(userId, { startKey, tz, repositoryIds }) {
  const start = utc(localMidnight(startKey, tz));
  const repoFilter = repositoryIds ? Prisma.sql`AND "repositoryId" IN (${Prisma.join(repositoryIds.length ? repositoryIds : ["-"])})` : Prisma.empty;
  return prisma.$queryRaw`
    SELECT key, sum(count)::int AS count FROM (
      SELECT ${localBucket('"committedAt"', tz)} AS key, count(*) AS count FROM commits
        WHERE "userId" = ${userId} AND "committedAt" >= ${start} ${repoFilter} GROUP BY 1
      UNION ALL
      SELECT ${localBucket('"openedAt"', tz)}, count(*) FROM pull_requests
        WHERE "userId" = ${userId} AND "openedAt" >= ${start} ${repoFilter} GROUP BY 1
      UNION ALL
      SELECT ${localBucket('"openedAt"', tz)}, count(*) FROM issues
        WHERE "userId" = ${userId} AND "openedAt" >= ${start} ${repoFilter} GROUP BY 1
    ) t GROUP BY key`;
}

/**
 * Commit counts by local weekday (0 = Monday) and hour.
 */
export async function getCommitRhythm(userId, { since, tz, repositoryId }) {
  const rows = await prisma.$queryRaw`
    SELECT (extract(isodow FROM ${localTimestamp('"committedAt"', tz)})::int - 1) AS dow,
           extract(hour FROM ${localTimestamp('"committedAt"', tz)})::int AS hour,
           count(*)::int AS count
    FROM commits
    WHERE "userId" = ${userId} AND "committedAt" >= ${utc(since)} ${optionalRepoFilter(repositoryId)}
    GROUP BY 1, 2`;
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const row of rows) matrix[row.dow][row.hour] = toInt(row.count);
  const weekdays = matrix.map((hours) => hours.reduce((a, b) => a + b, 0));
  const hours = Array.from({ length: 24 }, (_, h) => matrix.reduce((t, day) => t + day[h], 0));
  const total = weekdays.reduce((a, b) => a + b, 0);
  return { matrix, weekdays, hours, total };
}

/**
 * Chronological activity events (commits, PR and issue lifecycle).
 * Uses the actual commit message / PR / issue titles from GitHub.
 */
export async function getEvents(userId, { repositoryId, limit = 30, before } = {}) {
  const repoC = optionalRepoFilter(repositoryId, "c");
  const repoP = optionalRepoFilter(repositoryId, "p");
  const repoI = optionalRepoFilter(repositoryId, "i");
  const cursor = before ? Prisma.sql`WHERE at < ${utc(before)}` : Prisma.empty;

  const rows = await prisma.$queryRaw`
    SELECT * FROM (
      SELECT 'commit' AS type, c.id, c."committedAt" AS at, c.message AS title, NULL::int AS number,
             c.url, c.sha, NULL AS ref, c."repositoryId", r."fullName"
        FROM commits c JOIN repositories r ON r.id = c."repositoryId"
        WHERE c."userId" = ${userId} ${repoC}
      UNION ALL
      SELECT 'pr_opened', p.id, p."openedAt", p.title, p.number, p.url, NULL, p."headRef", p."repositoryId", r."fullName"
        FROM pull_requests p JOIN repositories r ON r.id = p."repositoryId"
        WHERE p."userId" = ${userId} ${repoP}
      UNION ALL
      SELECT 'pr_merged', p.id, p."mergedAt", p.title, p.number, p.url, NULL, p."headRef", p."repositoryId", r."fullName"
        FROM pull_requests p JOIN repositories r ON r.id = p."repositoryId"
        WHERE p."userId" = ${userId} AND p."mergedAt" IS NOT NULL ${repoP}
      UNION ALL
      SELECT 'pr_closed', p.id, p."closedAt", p.title, p.number, p.url, NULL, p."headRef", p."repositoryId", r."fullName"
        FROM pull_requests p JOIN repositories r ON r.id = p."repositoryId"
        WHERE p."userId" = ${userId} AND p.state = 'closed' AND p."closedAt" IS NOT NULL ${repoP}
      UNION ALL
      SELECT 'issue_opened', i.id, i."openedAt", i.title, i.number, i.url, NULL, NULL, i."repositoryId", r."fullName"
        FROM issues i JOIN repositories r ON r.id = i."repositoryId"
        WHERE i."userId" = ${userId} ${repoI}
      UNION ALL
      SELECT 'issue_closed', i.id, i."closedAt", i.title, i.number, i.url, NULL, NULL, i."repositoryId", r."fullName"
        FROM issues i JOIN repositories r ON r.id = i."repositoryId"
        WHERE i."userId" = ${userId} AND i."closedAt" IS NOT NULL ${repoI}
    ) events
    ${cursor}
    ORDER BY at DESC
    LIMIT ${limit + 1}`;

  const hasMore = rows.length > limit;
  const events = rows.slice(0, limit).map((row) => ({
    type: row.type,
    id: `${row.type}:${row.id}`,
    at: row.at,
    title: row.title,
    number: row.number,
    url: row.url,
    sha: row.sha,
    ref: row.ref,
    repositoryId: row.repositoryId,
    repository: row.fullName,
  }));
  return { events, nextBefore: hasMore ? events[events.length - 1].at : null };
}
