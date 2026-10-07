// Pure aggregation helpers shared by the analytics queries and insights.

import { addDaysKey, weekdayIndex } from "../../lib/dates.js";

export function sum(values) {
  return values.reduce((total, v) => total + (Number(v) || 0), 0);
}

export function median(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mean(values) {
  const finite = values.filter((v) => Number.isFinite(v));
  return finite.length ? sum(finite) / finite.length : null;
}

/** Percentage change; null when there is no baseline to compare against. */
export function percentChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

/**
 * Durations between open and close timestamps, in hours.
 * Items without both dates are ignored.
 */
export function durationsInHours(items, startField, endField) {
  return items
    .filter((item) => item[startField] && item[endField])
    .map((item) => (new Date(item[endField]) - new Date(item[startField])) / 3_600_000)
    .filter((h) => h >= 0);
}

export function durationStats(items, startField, endField) {
  const hours = durationsInHours(items, startField, endField);
  return { count: hours.length, medianHours: median(hours), meanHours: mean(hours) };
}

/**
 * Current and longest streak of consecutive active days.
 * `days` is [{ key: 'YYYY-MM-DD', value }] in ascending order and dense.
 * The current streak tolerates today being empty (the day isn't over).
 */
export function computeStreaks(days, todayKey) {
  let longest = 0;
  let run = 0;
  for (const day of days) {
    run = day.value > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  const active = new Set(days.filter((d) => d.value > 0).map((d) => d.key));
  let cursor = active.has(todayKey) ? todayKey : addDaysKey(todayKey, -1);
  let current = 0;
  while (active.has(cursor)) {
    current += 1;
    cursor = addDaysKey(cursor, -1);
  }
  return { current, longest, activeDays: active.size };
}

/** Totals per weekday (Mon..Sun) from dense or sparse day rows. */
export function totalsByWeekday(days) {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (const day of days) totals[weekdayIndex(day.key)] += Number(day.value) || 0;
  return totals;
}

/**
 * Find the contiguous window of `width` hours (wrapping midnight) holding
 * the largest share of activity. `hours` is a 24-element array.
 */
export function peakHourWindow(hours, width = 3) {
  const total = sum(hours);
  if (total === 0) return null;
  let best = { start: 0, count: -1 };
  for (let start = 0; start < 24; start++) {
    let count = 0;
    for (let i = 0; i < width; i++) count += hours[(start + i) % 24];
    if (count > best.count) best = { start, count };
  }
  return { start: best.start, end: (best.start + width) % 24, count: best.count, share: best.count / total };
}

/** Share of the total held by the top `n` entries of [{ value }]. */
export function topShare(entries, n) {
  const sorted = [...entries].sort((a, b) => b.value - a.value);
  const total = sum(sorted.map((e) => e.value));
  if (total === 0) return { top: [], share: 0, total: 0 };
  const top = sorted.slice(0, n);
  return { top, share: sum(top.map((e) => e.value)) / total, total };
}
