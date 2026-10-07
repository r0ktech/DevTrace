import { apiHandler } from "@/server/http";
import { getEvents } from "@/server/analytics/activity";
import { eventsQuery, parseSearchParams } from "@/server/validation";

// GET /api/activity/events?before=<iso>&repo=<id>&limit=30
export const GET = apiHandler(async ({ user, searchParams }) => {
  const query = parseSearchParams(eventsQuery, searchParams);
  return getEvents(user.id, { repositoryId: query.repo, before: query.before, limit: query.limit });
});
