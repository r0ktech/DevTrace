import { Prisma } from "@prisma/client";
import prisma from "../db.js";
import { utc } from "./activity.js";

export const REPOSITORY_SORTS = {
  activity: Prisma.sql`"lastActivity" DESC NULLS LAST`,
  name: Prisma.sql`lower(r."fullName") ASC`,
  stars: Prisma.sql`r.stars DESC, lower(r."fullName") ASC`,
  forks: Prisma.sql`r.forks DESC, lower(r."fullName") ASC`,
  commits: Prisma.sql`commits DESC, "lastActivity" DESC NULLS LAST`,
  prs: Prisma.sql`prs DESC, "lastActivity" DESC NULLS LAST`,
  issues: Prisma.sql`issues DESC, "lastActivity" DESC NULLS LAST`,
  language: Prisma.sql`r."primaryLanguage" ASC NULLS LAST, lower(r."fullName") ASC`,
};

// Repositories with any of the user's activity, or a push, in this window are "active"
const ACTIVE_WINDOW_DAYS = 90;

function typeFilter(type, now) {
  const activeSince = utc(new Date(now.getTime() - ACTIVE_WINDOW_DAYS * 86_400_000));
  switch (type) {
    case "owned":
      return Prisma.sql`AND r."isOwner" = true`;
    case "forks":
      return Prisma.sql`AND r."isFork" = true`;
    case "archived":
      return Prisma.sql`AND r."isArchived" = true`;
    case "exclude-forks":
      return Prisma.sql`AND r."isFork" = false`;
    case "contributed":
      return Prisma.sql`AND r."isAffiliated" = false`;
    case "active":
      return Prisma.sql`AND r."isArchived" = false AND greatest(c.last, p.last, i.last, r."repoPushedAt") >= ${activeSince}`;
    default:
      return Prisma.empty;
  }
}

/**
 * Paginated repository table with the user's own commit/PR/issue counts.
 */
export async function listRepositories(
  userId,
  { search, type = "all", language, sort = "activity", page = 1, pageSize = 25, now = new Date() } = {},
) {
  const filters = [
    typeFilter(type, now),
    language ? Prisma.sql`AND r."primaryLanguage" = ${language}` : Prisma.empty,
    search
      ? Prisma.sql`AND (r."fullName" ILIKE ${`%${search}%`} OR r.description ILIKE ${`%${search}%`})`
      : Prisma.empty,
  ];
  const where = Prisma.sql`r."userId" = ${userId} AND r."removedAt" IS NULL ${Prisma.join(filters, " ")}`;
  const joins = Prisma.sql`
    LEFT JOIN (SELECT "repositoryId", count(*) AS n, max("committedAt") AS last FROM commits WHERE "userId" = ${userId} GROUP BY 1) c ON c."repositoryId" = r.id
    LEFT JOIN (SELECT "repositoryId", count(*) AS n, max("openedAt") AS last FROM pull_requests WHERE "userId" = ${userId} GROUP BY 1) p ON p."repositoryId" = r.id
    LEFT JOIN (SELECT "repositoryId", count(*) AS n, max("openedAt") AS last FROM issues WHERE "userId" = ${userId} GROUP BY 1) i ON i."repositoryId" = r.id`;

  const [rows, [{ total }]] = await Promise.all([
    prisma.$queryRaw`
      SELECT r.id, r.name, r."fullName", r.description, r."primaryLanguage", r.stars, r.forks, r."openIssues",
             r."isPrivate", r."isFork", r."isArchived", r."isOwner", r."isAffiliated", r.url, r."repoPushedAt",
             coalesce(c.n, 0)::int AS commits, coalesce(p.n, 0)::int AS prs, coalesce(i.n, 0)::int AS issues,
             coalesce(greatest(c.last, p.last, i.last), r."repoPushedAt") AS "lastActivity"
      FROM repositories r ${joins}
      WHERE ${where}
      ORDER BY ${REPOSITORY_SORTS[sort] || REPOSITORY_SORTS.activity}, r.id
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
    prisma.$queryRaw`SELECT count(*)::int AS total FROM repositories r ${joins} WHERE ${where}`,
  ]);

  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Distinct primary languages for the filter dropdown. */
export async function listRepositoryLanguages(userId) {
  const rows = await prisma.repository.groupBy({
    by: ["primaryLanguage"],
    where: { userId, removedAt: null, primaryLanguage: { not: null } },
    _count: true,
    orderBy: { primaryLanguage: "asc" },
  });
  return rows.map((r) => r.primaryLanguage);
}

/** Lightweight list for repository pickers. */
export async function listRepositoryOptions(userId) {
  return prisma.repository.findMany({
    where: { userId },
    select: { id: true, fullName: true, isFork: true, isArchived: true, isOwner: true, removedAt: true },
    orderBy: [{ repoPushedAt: { sort: "desc", nulls: "last" } }],
  });
}

/**
 * A single repository, only if it belongs to the user. Returns null otherwise
 * so callers respond 404 without revealing whether the id exists.
 */
export async function getRepository(userId, repositoryId) {
  const repo = await prisma.repository.findFirst({
    where: { id: repositoryId, userId },
    include: { languageStats: { orderBy: { bytes: "desc" } } },
  });
  if (!repo) return null;

  const [commits, prStates, issueStates, firstLast] = await Promise.all([
    prisma.commit.count({ where: { userId, repositoryId } }),
    prisma.pullRequest.groupBy({ by: ["state"], where: { userId, repositoryId }, _count: true }),
    prisma.issue.groupBy({ by: ["state"], where: { userId, repositoryId }, _count: true }),
    prisma.$queryRaw`
      SELECT min(at) AS first, max(at) AS last FROM (
        SELECT "committedAt" AS at FROM commits WHERE "userId" = ${userId} AND "repositoryId" = ${repositoryId}
        UNION ALL SELECT "openedAt" FROM pull_requests WHERE "userId" = ${userId} AND "repositoryId" = ${repositoryId}
        UNION ALL SELECT "openedAt" FROM issues WHERE "userId" = ${userId} AND "repositoryId" = ${repositoryId}
      ) a`,
  ]);

  const countBy = (rows) => Object.fromEntries(rows.map((r) => [r.state, r._count]));
  const prs = countBy(prStates);
  const issues = countBy(issueStates);
  return {
    repo,
    stats: {
      commits,
      pullRequests: { open: prs.open || 0, merged: prs.merged || 0, closed: prs.closed || 0 },
      issues: { open: issues.open || 0, closed: issues.closed || 0 },
      firstActivity: firstLast[0]?.first || null,
      lastActivity: firstLast[0]?.last || null,
    },
  };
}
