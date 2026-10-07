import prisma from "../db.js";
import { RANGES, isValidTimeZone } from "../../lib/dates.js";

export const DEFAULT_PREFERENCES = {
  theme: "system",
  defaultRange: "30d",
  defaultRepoScope: "all",
  timezone: null,
  publicProfile: false,
  profileShowActivity: true,
  profileShowPrivateRepos: false,
};

export async function getPreferences(userId) {
  const prefs = await prisma.userPreference.findUnique({ where: { userId } });
  return { ...DEFAULT_PREFERENCES, ...(prefs || {}) };
}

/** Effective timezone for aggregation; falls back to UTC. */
export function effectiveTimeZone(prefs) {
  return isValidTimeZone(prefs?.timezone) ? prefs.timezone : "UTC";
}

export function effectiveRange(requested, prefs) {
  if (requested && RANGES[requested]) return requested;
  return RANGES[prefs?.defaultRange] ? prefs.defaultRange : "30d";
}

export async function updatePreferences(userId, patch) {
  return prisma.userPreference.upsert({
    where: { userId },
    create: { userId, ...patch },
    update: patch,
  });
}

/** Preferences plus derived values every analytics request needs. */
export async function getAnalyticsContext(userId) {
  const prefs = await getPreferences(userId);
  return { prefs, tz: effectiveTimeZone(prefs) };
}
