import prisma from '@/lib/db';

/**
 * Get aggregated dashboard metrics for a user.
 */
export async function getDashboardMetrics(userId) {
  const [
    totalRepos,
    totalCommits,
    totalPRs,
    totalIssues,
    recentCommits,
    profile,
  ] = await Promise.all([
    prisma.repository.count({ where: { userId } }),
    prisma.commit.count({ where: { userId } }),
    prisma.pullRequest.count({ where: { userId } }),
    prisma.issue.count({ where: { userId } }),
    prisma.commit.count({
      where: {
        userId,
        committedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.gitHubProfile.findUnique({ where: { userId } }),
  ]);

  return {
    profile,
    metrics: {
      repositories: totalRepos,
      commits: totalCommits,
      pullRequests: totalPRs,
      issues: totalIssues,
      recentCommits,
      contributions: totalCommits + totalPRs + totalIssues,
    },
  };
}

/**
 * Get activity heatmap data — commit counts per day.
 * @param {string} userId
 * @param {number} months - number of months to look back
 */
export async function getActivityHeatmap(userId, months = 12) {
  const since = new Date();
  since.setMonth(since.getMonth() - months);
  since.setHours(0, 0, 0, 0);

  const commits = await prisma.$queryRaw`
    SELECT DATE(committed_at) as date, COUNT(*)::int as count
    FROM commits
    WHERE user_id = ${userId} AND committed_at >= ${since}
    GROUP BY DATE(committed_at)
    ORDER BY date ASC
  `;

  return commits;
}

/**
 * Get activity over time — aggregated by period.
 * @param {string} userId
 * @param {'day'|'week'|'month'} granularity
 * @param {number} days
 */
export async function getActivityOverTime(userId, granularity = 'day', days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  let dateTrunc;
  if (granularity === 'week') dateTrunc = 'week';
  else if (granularity === 'month') dateTrunc = 'month';
  else dateTrunc = 'day';

  const [commits, prs, issues] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT date_trunc('${dateTrunc}', committed_at) as date, COUNT(*)::int as count
       FROM commits WHERE user_id = $1 AND committed_at >= $2
       GROUP BY date ORDER BY date ASC`,
      userId,
      since
    ),
    prisma.$queryRawUnsafe(
      `SELECT date_trunc('${dateTrunc}', created_at) as date, COUNT(*)::int as count
       FROM pull_requests WHERE user_id = $1 AND created_at >= $2
       GROUP BY date ORDER BY date ASC`,
      userId,
      since
    ),
    prisma.$queryRawUnsafe(
      `SELECT date_trunc('${dateTrunc}', created_at) as date, COUNT(*)::int as count
       FROM issues WHERE user_id = $1 AND created_at >= $2
       GROUP BY date ORDER BY date ASC`,
      userId,
      since
    ),
  ]);

  return { commits, pullRequests: prs, issues };
}

/**
 * Get top repositories by activity.
 * @param {string} userId
 * @param {number} limit
 */
export async function getTopRepositories(userId, limit = 5) {
  const repos = await prisma.$queryRaw`
    SELECT
      r.id, r.name, r.full_name, r.description, r.language,
      r.stars, r.forks, r.html_url, r.pushed_at,
      (SELECT COUNT(*)::int FROM commits c WHERE c.repository_id = r.id) as commit_count,
      (SELECT COUNT(*)::int FROM pull_requests p WHERE p.repository_id = r.id) as pr_count,
      (SELECT COUNT(*)::int FROM issues i WHERE i.repository_id = r.id) as issue_count
    FROM repositories r
    WHERE r.user_id = ${userId}
    ORDER BY r.pushed_at DESC NULLS LAST
    LIMIT ${limit}
  `;

  return repos;
}

/**
 * Get commit analytics.
 */
export async function getCommitAnalytics(userId, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalCommits,
    periodCommits,
    byDayOfWeek,
    byHour,
    commitsByRepo,
  ] = await Promise.all([
    prisma.commit.count({ where: { userId } }),
    prisma.commit.count({
      where: { userId, committedAt: { gte: since } },
    }),
    prisma.$queryRaw`
      SELECT EXTRACT(DOW FROM committed_at)::int as day_of_week, COUNT(*)::int as count
      FROM commits WHERE user_id = ${userId}
      GROUP BY day_of_week ORDER BY day_of_week
    `,
    prisma.$queryRaw`
      SELECT EXTRACT(HOUR FROM committed_at)::int as hour, COUNT(*)::int as count
      FROM commits WHERE user_id = ${userId}
      GROUP BY hour ORDER BY hour
    `,
    prisma.$queryRaw`
      SELECT r.name, r.full_name, COUNT(c.id)::int as count
      FROM commits c JOIN repositories r ON c.repository_id = r.id
      WHERE c.user_id = ${userId}
      GROUP BY r.id, r.name, r.full_name
      ORDER BY count DESC LIMIT 10
    `,
  ]);

  const weeksInRange = Math.max(1, days / 7);

  return {
    total: totalCommits,
    periodCount: periodCommits,
    avgPerWeek: Math.round(periodCommits / weeksInRange * 10) / 10,
    byDayOfWeek,
    byHour,
    byRepository: commitsByRepo,
  };
}

/**
 * Get pull request analytics.
 */
export async function getPRAnalytics(userId) {
  const [total, opened, merged, closed, avgMergeTime] = await Promise.all([
    prisma.pullRequest.count({ where: { userId } }),
    prisma.pullRequest.count({ where: { userId, state: 'open' } }),
    prisma.pullRequest.count({ where: { userId, state: 'merged' } }),
    prisma.pullRequest.count({ where: { userId, state: 'closed' } }),
    prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM (merged_at - created_at)))::float as avg_seconds
      FROM pull_requests
      WHERE user_id = ${userId} AND merged_at IS NOT NULL
    `,
  ]);

  const avgMergeHours = avgMergeTime[0]?.avg_seconds
    ? Math.round(avgMergeTime[0].avg_seconds / 3600 * 10) / 10
    : null;

  return {
    total,
    open: opened,
    merged,
    closed,
    avgMergeTimeHours: avgMergeHours,
  };
}

/**
 * Get issue analytics.
 */
export async function getIssueAnalytics(userId) {
  const [total, openCount, closedCount, avgResolution] = await Promise.all([
    prisma.issue.count({ where: { userId } }),
    prisma.issue.count({ where: { userId, state: 'open' } }),
    prisma.issue.count({ where: { userId, state: 'closed' } }),
    prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at)))::float as avg_seconds
      FROM issues
      WHERE user_id = ${userId} AND closed_at IS NOT NULL
    `,
  ]);

  const avgResolutionHours = avgResolution[0]?.avg_seconds
    ? Math.round(avgResolution[0].avg_seconds / 3600 * 10) / 10
    : null;

  return {
    total,
    open: openCount,
    closed: closedCount,
    avgResolutionTimeHours: avgResolutionHours,
  };
}

/**
 * Get language distribution across user's repositories.
 */
export async function getLanguageDistribution(userId, repositoryIds = null) {
  let where = {};
  if (repositoryIds && repositoryIds.length > 0) {
    where = { repositoryId: { in: repositoryIds } };
  } else {
    where = {
      repository: { userId },
    };
  }

  const stats = await prisma.languageStat.groupBy({
    by: ['language'],
    where,
    _sum: { bytes: true },
    orderBy: { _sum: { bytes: 'desc' } },
  });

  const totalBytes = stats.reduce((sum, s) => sum + (s._sum.bytes || 0), 0);

  return stats.map((s) => ({
    language: s.language,
    bytes: s._sum.bytes || 0,
    percentage: totalBytes > 0
      ? Math.round((s._sum.bytes || 0) / totalBytes * 10000) / 100
      : 0,
  }));
}
