import { apiHandler } from "@/server/http";
import { getIssueSummary, listIssues } from "@/server/analytics/issues";
import { getAnalyticsContext, effectiveRange } from "@/server/services/preferences";
import { issuesQuery, parseSearchParams } from "@/server/validation";

// GET /api/issues?range=90d&state=open&repo=<id>&q=&page=1
export const GET = apiHandler(async ({ user, searchParams }) => {
  const query = parseSearchParams(issuesQuery, searchParams);
  const { prefs, tz } = await getAnalyticsContext(user.id);
  const range = effectiveRange(query.range, prefs);
  const [summary, issues] = await Promise.all([
    getIssueSummary(user.id, { range, tz, repositoryId: query.repo }),
    listIssues(user.id, { ...query, repositoryId: query.repo, search: query.q }),
  ]);
  return { range, summary, issues };
});
