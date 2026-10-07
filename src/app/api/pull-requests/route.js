import { apiHandler } from "@/server/http";
import { getPullRequestSummary, listPullRequests } from "@/server/analytics/pull-requests";
import { getAnalyticsContext, effectiveRange } from "@/server/services/preferences";
import { parseSearchParams, pullRequestsQuery } from "@/server/validation";

// GET /api/pull-requests?range=90d&state=merged&repo=<id>&q=&page=1
export const GET = apiHandler(async ({ user, searchParams }) => {
  const query = parseSearchParams(pullRequestsQuery, searchParams);
  const { prefs, tz } = await getAnalyticsContext(user.id);
  const range = effectiveRange(query.range, prefs);
  const [summary, pullRequests] = await Promise.all([
    getPullRequestSummary(user.id, { range, tz, repositoryId: query.repo }),
    listPullRequests(user.id, { ...query, repositoryId: query.repo, search: query.q }),
  ]);
  return { range, summary, pullRequests };
});
