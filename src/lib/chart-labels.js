import { formatDayKey } from "./format.js";

/** Label for a day / week / month bucket key ("YYYY-MM-DD"). */
export function bucketLabel(key, unit, long = false) {
  if (unit === "month") return formatDayKey(key, { month: long ? "long" : "short", year: "numeric" });
  if (unit === "week") return long ? `Week of ${formatDayKey(key, { month: "short", day: "numeric", year: "numeric" })}` : formatDayKey(key);
  return long ? formatDayKey(key, { weekday: "short", month: "short", day: "numeric", year: "numeric" }) : formatDayKey(key);
}
