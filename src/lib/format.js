// Display formatting shared by server and client components.

const numberFormat = new Intl.NumberFormat("en-US");
const compactFormat = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function formatNumber(value) {
  return value == null ? "—" : numberFormat.format(value);
}

export function formatCompact(value) {
  if (value == null) return "—";
  return Math.abs(value) < 1000 ? numberFormat.format(value) : compactFormat.format(value);
}

export function formatPercent(value, digits = 0) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export function formatSignedPercent(value) {
  if (value == null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/** Human duration from hours: "45m", "6.5h", "3.2 days". */
export function formatDuration(hours) {
  if (hours == null || !Number.isFinite(hours)) return "—";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 48) return `${hours < 10 ? hours.toFixed(1).replace(/\.0$/, "") : Math.round(hours)}h`;
  const days = hours / 24;
  return `${days < 10 ? days.toFixed(1).replace(/\.0$/, "") : Math.round(days)} days`;
}

export function formatHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function formatDate(value, { tz, withYear = true } = {}) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    ...(tz ? { timeZone: tz } : {}),
  }).format(new Date(value));
}

export function formatDateTime(value, { tz } = {}) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(tz ? { timeZone: tz } : {}),
  }).format(new Date(value));
}

/** Format a 'YYYY-MM-DD' calendar key without timezone shifts. */
export function formatDayKey(key, options = { month: "short", day: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
}

export function formatRelative(value, now = new Date()) {
  if (!value) return "—";
  const diff = now - new Date(value);
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function firstLine(message) {
  return String(message || "").split("\n")[0].trim();
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
