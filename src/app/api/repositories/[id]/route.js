import { apiHandler, NotFoundError } from "@/server/http";
import { getRepository } from "@/server/analytics/repositories";
import { getActivitySeries, getEvents } from "@/server/analytics/activity";
import { getRepositoryContributors } from "@/server/services/contributors";
import { getAnalyticsContext, effectiveRange } from "@/server/services/preferences";
import { idSchema, rangeParam } from "@/server/validation";

// GET /api/repositories/:id?range=1y
export const GET = apiHandler(async ({ user, params, searchParams }) => {
  const id = idSchema.parse(params.id);
  const detail = await getRepository(user.id, id);
  if (!detail) throw new NotFoundError("Repository not found.");

  const { prefs, tz } = await getAnalyticsContext(user.id);
  const range = effectiveRange(rangeParam.parse(searchParams.get("range") || undefined), prefs);
  const [series, timeline, contributors] = await Promise.all([
    getActivitySeries(user.id, { range, tz, repositoryId: id }),
    getEvents(user.id, { repositoryId: id, limit: 30 }),
    getRepositoryContributors(user.id, id),
  ]);
  return { ...detail, series, timeline, contributors };
});
