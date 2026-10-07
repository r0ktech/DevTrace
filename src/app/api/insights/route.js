import { apiHandler } from "@/server/http";
import { getInsights } from "@/server/analytics/insights";
import { getAnalyticsContext } from "@/server/services/preferences";
import { cachedForUser } from "@/server/cache";

// GET /api/insights
export const GET = apiHandler(async ({ user }) => {
  const { tz } = await getAnalyticsContext(user.id);
  return cachedForUser(user.id, `insights:${tz}`, () => getInsights(user.id, { tz }), 600);
});
