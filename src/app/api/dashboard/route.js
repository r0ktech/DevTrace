import { apiHandler } from "@/server/http";
import { getOverviewMetrics, getTopRepositories } from "@/server/analytics/overview";
import { getActivitySeries, getHeatmap } from "@/server/analytics/activity";
import { getAnalyticsContext, effectiveRange } from "@/server/services/preferences";
import { activityQuery, parseSearchParams } from "@/server/validation";
import { cachedForUser } from "@/server/cache";

// GET /api/dashboard?range=30d&heatmap=1y
export const GET = apiHandler(async ({ user, searchParams }) => {
  const query = parseSearchParams(activityQuery, searchParams);
  const { prefs, tz } = await getAnalyticsContext(user.id);
  const range = effectiveRange(query.range, prefs);
  return cachedForUser(user.id, `dashboard:${range}:${query.heatmap || "1y"}:${tz}`, async () => {
    const [metrics, activity, heatmap, topRepositories] = await Promise.all([
      getOverviewMetrics(user.id, { range, tz }),
      getActivitySeries(user.id, { range, tz }),
      getHeatmap(user.id, { period: query.heatmap, tz }),
      getTopRepositories(user.id, { range, tz }),
    ]);
    return { range, timezone: tz, metrics, activity, heatmap, topRepositories };
  });
});
