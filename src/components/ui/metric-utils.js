export { formatSignedPercent } from "@/lib/format";

export function percentChangeOrNull(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
