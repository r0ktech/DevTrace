import { apiHandler } from "@/server/http";
import { getCommitSummary, listCommits } from "@/server/analytics/commits";
import { getAnalyticsContext, effectiveRange } from "@/server/services/preferences";
import { commitsQuery, parseSearchParams } from "@/server/validation";

// GET /api/commits?range=90d&repo=<id>&q=&page=1
export const GET = apiHandler(async ({ user, searchParams }) => {
  const query = parseSearchParams(commitsQuery, searchParams);
  const { prefs, tz } = await getAnalyticsContext(user.id);
  const range = effectiveRange(query.range, prefs);
  const [summary, commits] = await Promise.all([
    getCommitSummary(user.id, { range, tz, repositoryId: query.repo }),
    listCommits(user.id, { repositoryId: query.repo, search: query.q, page: query.page, pageSize: query.pageSize }),
  ]);
  return { range, timezone: tz, summary, commits };
});
