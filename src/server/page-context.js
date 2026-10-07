import { requireUser } from "./auth/session.js";
import { effectiveRange, getAnalyticsContext } from "./services/preferences.js";

/**
 * Shared setup for authenticated pages: the user (from the session), their
 * preferences, timezone and the effective date range.
 */
export async function getPageContext(searchParams = {}) {
  const user = await requireUser();
  const { prefs, tz } = await getAnalyticsContext(user.id);
  const requested = Array.isArray(searchParams.range) ? searchParams.range[0] : searchParams.range;
  return { user, prefs, tz, range: effectiveRange(requested, prefs) };
}
