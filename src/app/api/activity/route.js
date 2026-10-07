import { apiHandler } from "@/server/http";
import { getActivitySeries, getCommitRhythm, getHeatmap } from "@/server/analytics/activity";
import { getAnalyticsContext, effectiveRange } from "@/server/services/preferences";
import { activityQuery, parseSearchParams } from "@/server/validation";
import { resolveRange } from "@/lib/dates";

// GET /api/activity?range=90d&heatmap=6m&repo=<id>
export const GET = apiHandler(async ({ user, searchParams }) => {
  const query = parseSearchParams(activityQuery, searchParams);
  const { prefs, tz } = await getAnalyticsContext(user.id);
  const range = effectiveRange(query.range, prefs);
  const [series, heatmap, rhythm] = await Promise.all([
    getActivitySeries(user.id, { range, tz, repositoryId: query.repo }),
    getHeatmap(user.id, { period: query.heatmap, tz }),
    getCommitRhythm(user.id, { since: resolveRange(range, { tz }).start, tz, repositoryId: query.repo }),
  ]);
  return { range, timezone: tz, series, heatmap, rhythm };
});
