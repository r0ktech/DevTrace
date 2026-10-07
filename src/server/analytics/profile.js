import { Prisma } from "@prisma/client";
import prisma from "../db.js";
import { addDaysKey, bucketKeys, fillSeries, localDateKey, startOfWeekKey } from "../../lib/dates.js";
import { DEFAULT_PREFERENCES, effectiveTimeZone } from "../services/preferences.js";
import { getDailyActivityRows, getHeatmap, utc } from "./activity.js";
import { aggregateLanguageBytes } from "./languages-calc.js";

/**
 * Developer profile by GitHub login.
 *
 * Returns null when the profile doesn't exist OR is private and the viewer
 * isn't its owner, so private profiles are indistinguishable from missing.
 * Private repositories are excluded unless the owner opted in.
 */
export async function getProfile(login, { viewerId, now = new Date() } = {}) {
  const account = await prisma.connectedAccount.findFirst({
    where: { provider: "github", login: { equals: login, mode: "insensitive" } },
    include: { user: { select: { id: true, isDemo: true, preferences: true } } },
  });
  if (!account) return null;

  const userId = account.userId;
  const prefs = { ...DEFAULT_PREFERENCES, ...(account.user.preferences || {}) };
  const isOwner = viewerId === userId;
  if (!prefs.publicProfile && !isOwner) return null;

  const tz = effectiveTimeZone(prefs);
  const visibleRepos = await prisma.repository.findMany({
    where: { userId, removedAt: null, ...(prefs.profileShowPrivateRepos ? {} : { isPrivate: false }) },
    select: { id: true },
  });
  const ids = visibleRepos.map((r) => r.id);
  const idList = ids.length ? Prisma.join(ids) : Prisma.sql`NULL`;
  const since = new Date(now.getTime() - 365 * 86_400_000);

  const [stats, featured, languageStats] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        (SELECT count(*)::int FROM commits WHERE "userId" = ${userId} AND "repositoryId" IN (${idList}) AND "committedAt" >= ${utc(since)}) AS commits,
        (SELECT count(*)::int FROM pull_requests WHERE "userId" = ${userId} AND "repositoryId" IN (${idList}) AND "openedAt" >= ${utc(since)}) AS "pullRequests",
        (SELECT count(*)::int FROM pull_requests WHERE "userId" = ${userId} AND "repositoryId" IN (${idList}) AND "mergedAt" >= ${utc(since)}) AS merged,
        (SELECT count(*)::int FROM issues WHERE "userId" = ${userId} AND "repositoryId" IN (${idList}) AND "openedAt" >= ${utc(since)}) AS issues`,
    prisma.$queryRaw`
      SELECT r.id, r."fullName", r.name, r.description, r."primaryLanguage", r.stars, r.forks, r.url, r."isPrivate",
             count(c.id)::int AS commits
      FROM repositories r
      LEFT JOIN commits c ON c."repositoryId" = r.id AND c."committedAt" >= ${utc(since)}
      WHERE r."userId" = ${userId} AND r.id IN (${idList}) AND r."isFork" = false
      GROUP BY r.id
      ORDER BY commits DESC, r.stars DESC
      LIMIT 6`,
    prisma.languageStat.findMany({
      where: { repositoryId: { in: ids } },
      select: { repositoryId: true, language: true, bytes: true, color: true },
    }),
  ]);

  let heatmap = null;
  if (prefs.profileShowActivity) {
    if (prefs.profileShowPrivateRepos) {
      heatmap = await getHeatmap(userId, { period: "1y", tz, now });
    } else {
      const endKey = localDateKey(now, tz);
      const startKey = addDaysKey(startOfWeekKey(endKey), -52 * 7);
      const rows = await getDailyActivityRows(userId, { startKey, tz, repositoryIds: ids });
      const days = fillSeries(bucketKeys(startKey, endKey, "day"), rows);
      heatmap = { startKey, endKey, days, total: days.reduce((t, d) => t + d.value, 0), source: "devtrace" };
    }
  }

  return {
    isOwner,
    isDemo: account.user.isDemo,
    isPublic: prefs.publicProfile,
    showActivity: prefs.profileShowActivity,
    account: {
      login: account.login,
      name: account.name,
      avatarUrl: account.avatarUrl,
      bio: account.bio,
      location: account.location,
      company: account.company,
      blog: account.blog,
      profileUrl: account.user.isDemo ? null : account.profileUrl,
    },
    stats: { ...stats[0], repositories: ids.length },
    featured: featured.map((r) => ({ ...r, url: account.user.isDemo ? null : r.url })),
    languages: aggregateLanguageBytes(languageStats).slice(0, 6),
    heatmap,
    tz,
  };
}
