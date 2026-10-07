import prisma from "../db.js";

// Database writes for synchronized data. Every write is scoped to `userId`
// and uses natural keys (provider id, sha, PR/issue number) so repeated
// syncs update rows instead of duplicating them.

const CHUNK = 200;

function chunk(items, size = CHUNK) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function upsertConnectedAccount(userId, profile) {
  const { provider, externalId, ...fields } = profile;
  return prisma.connectedAccount.upsert({
    where: { userId_provider: { userId, provider } },
    create: { userId, provider, externalId, ...fields },
    update: { externalId, ...fields },
  });
}

/**
 * Upsert repositories and return Map<externalId, dbId>.
 * Repos discovered through PRs/issues never downgrade an affiliated repo,
 * and their open-issue count is left alone (not part of that payload).
 */
export async function upsertRepositories(userId, repos) {
  const ids = new Map();
  for (const group of chunk(repos, 50)) {
    const rows = await prisma.$transaction(
      group.map((repo) => {
        const { provider, externalId, isAffiliated, ...fields } = repo;
        return prisma.repository.upsert({
          where: { userId_provider_externalId: { userId, provider, externalId } },
          create: { userId, provider, externalId, isAffiliated, ...fields },
          update: isAffiliated ? { ...fields, isAffiliated: true, removedAt: null } : fields,
          select: { id: true, externalId: true },
        });
      }),
    );
    for (const row of rows) ids.set(row.externalId, row.id);
  }
  return ids;
}

/**
 * Affiliated repositories GitHub no longer returns were deleted or the user
 * lost access. Keep their history but hide them from repository lists.
 */
export async function markMissingRepositoriesRemoved(userId, seenExternalIds, now = new Date()) {
  const result = await prisma.repository.updateMany({
    where: {
      userId,
      provider: "github",
      isAffiliated: true,
      removedAt: null,
      externalId: { notIn: [...seenExternalIds] },
    },
    data: { removedAt: now },
  });
  return result.count;
}

export async function markRepositoryRemoved(userId, repositoryId, now = new Date()) {
  await prisma.repository.updateMany({ where: { id: repositoryId, userId }, data: { removedAt: now } });
}

export async function replaceLanguageStats(repositoryId, languages) {
  await prisma.$transaction([
    prisma.languageStat.deleteMany({ where: { repositoryId } }),
    prisma.languageStat.createMany({
      data: languages.map((lang) => ({ repositoryId, ...lang })),
      skipDuplicates: true,
    }),
  ]);
}

export async function replaceContributionDays(userId, days) {
  if (days.length === 0) return 0;
  const from = days.reduce((min, d) => (d.date < min ? d.date : min), days[0].date);
  await prisma.$transaction([
    prisma.contributionDay.deleteMany({ where: { userId, date: { gte: from } } }),
    prisma.contributionDay.createMany({
      data: days.map((d) => ({ userId, date: d.date, count: d.count })),
      skipDuplicates: true,
    }),
  ]);
  return days.length;
}

/** Commits are immutable by sha, so duplicates are simply skipped. */
export async function insertCommits(userId, repositoryId, commits) {
  let inserted = 0;
  for (const group of chunk(commits)) {
    const result = await prisma.commit.createMany({
      data: group.map((c) => ({ userId, repositoryId, ...c })),
      skipDuplicates: true,
    });
    inserted += result.count;
  }
  return inserted;
}

export async function setCommitCursor(userId, repositoryId, syncedAt) {
  await prisma.repository.updateMany({ where: { id: repositoryId, userId }, data: { commitsSyncedAt: syncedAt } });
}

export async function upsertPullRequests(userId, items) {
  for (const group of chunk(items, 100)) {
    await prisma.$transaction(
      group.map(({ repositoryId, pr }) =>
        prisma.pullRequest.upsert({
          where: { repositoryId_number: { repositoryId, number: pr.number } },
          create: { userId, repositoryId, ...pr },
          update: pr,
        }),
      ),
    );
  }
  return items.length;
}

export async function upsertIssues(userId, items) {
  for (const group of chunk(items, 100)) {
    await prisma.$transaction(
      group.map(({ repositoryId, issue }) =>
        prisma.issue.upsert({
          where: { repositoryId_number: { repositoryId, number: issue.number } },
          create: { userId, repositoryId, ...issue },
          update: issue,
        }),
      ),
    );
  }
  return items.length;
}
