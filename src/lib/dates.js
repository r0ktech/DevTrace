// Timezone-aware calendar helpers without a date library.
// Local calendar days are represented as "YYYY-MM-DD" keys; arithmetic on
// keys is done in UTC so it's independent of the server's own timezone.

const DAY_MS = 86_400_000;

export const RANGES = {
  "7d": { days: 7, label: "7 days", bucket: "day" },
  "30d": { days: 30, label: "30 days", bucket: "day" },
  "90d": { days: 90, label: "90 days", bucket: "week" },
  "1y": { days: 365, label: "1 year", bucket: "week" },
};

export const HEATMAP_PERIODS = {
  "3m": { weeks: 13, label: "3 months" },
  "6m": { weeks: 26, label: "6 months" },
  "1y": { weeks: 53, label: "1 year" },
};

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function isValidTimeZone(tz) {
  if (!tz || typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const formatterCache = new Map();
function partsFormatter(tz) {
  if (!formatterCache.has(tz)) {
    formatterCache.set(
      tz,
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  }
  return formatterCache.get(tz);
}

function localParts(date, tz) {
  const parts = {};
  for (const p of partsFormatter(tz).formatToParts(date)) parts[p.type] = p.value;
  return parts;
}

/** Offset of `tz` from UTC at the given instant, in ms. */
export function tzOffsetMs(date, tz) {
  const p = localParts(date, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function localDateKey(date, tz = "UTC") {
  const p = localParts(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

export function keyToDate(key) {
  return new Date(`${key}T00:00:00.000Z`);
}

export function dateToKey(date) {
  return date.toISOString().slice(0, 10);
}

export function addDaysKey(key, days) {
  return dateToKey(new Date(keyToDate(key).getTime() + days * DAY_MS));
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(key) {
  return (keyToDate(key).getUTCDay() + 6) % 7;
}

export function startOfWeekKey(key) {
  return addDaysKey(key, -weekdayIndex(key));
}

export function startOfMonthKey(key) {
  return `${key.slice(0, 7)}-01`;
}

export function bucketKeyFor(key, unit) {
  if (unit === "week") return startOfWeekKey(key);
  if (unit === "month") return startOfMonthKey(key);
  return key;
}

/** The UTC instant at which local midnight of `key` occurs in `tz`. */
export function localMidnight(key, tz = "UTC") {
  const guess = keyToDate(key);
  const first = new Date(guess.getTime() - tzOffsetMs(guess, tz));
  // Re-check once to handle DST transitions between guess and result
  return new Date(guess.getTime() - tzOffsetMs(first, tz));
}

/** Ordered bucket keys covering [startKey, endKey]. */
export function bucketKeys(startKey, endKey, unit = "day") {
  const keys = [];
  let cursor = bucketKeyFor(startKey, unit);
  while (cursor <= endKey) {
    keys.push(cursor);
    if (unit === "day") cursor = addDaysKey(cursor, 1);
    else if (unit === "week") cursor = addDaysKey(cursor, 7);
    else {
      const d = keyToDate(cursor);
      cursor = dateToKey(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)));
    }
  }
  return keys;
}

/**
 * Resolve a named range into concrete bounds in the user's timezone.
 * `previous*` describes the equal-length period immediately before.
 */
export function resolveRange(range, { now = new Date(), tz = "UTC" } = {}) {
  const config = RANGES[range] || RANGES["30d"];
  const endKey = localDateKey(now, tz);
  const startKey = addDaysKey(endKey, -(config.days - 1));
  const previousStartKey = addDaysKey(startKey, -config.days);
  return {
    key: RANGES[range] ? range : "30d",
    ...config,
    startKey,
    endKey,
    start: localMidnight(startKey, tz),
    end: now,
    previousStartKey,
    previousStart: localMidnight(previousStartKey, tz),
  };
}

/**
 * Turn sparse `{ key, count }` rows into a dense series over the given keys.
 */
export function fillSeries(keys, rows, field = "count") {
  const map = new Map();
  for (const row of rows || []) map.set(row.key, (map.get(row.key) || 0) + Number(row[field] || 0));
  return keys.map((key) => ({ key, value: map.get(key) || 0 }));
}
