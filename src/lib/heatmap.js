/**
 * Map counts to 0–4 intensity levels using quartiles of the non-zero values,
 * so one exceptional day doesn't wash out the rest of the calendar.
 */
export function heatThresholds(values) {
  const nonZero = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (nonZero.length === 0) return [1, 1, 1];
  const q = (p) => nonZero[Math.min(nonZero.length - 1, Math.floor(p * nonZero.length))];
  return [q(0.25), q(0.5), q(0.75)];
}

export function heatLevel(value, thresholds) {
  if (!value) return 0;
  if (value <= thresholds[0]) return 1;
  if (value <= thresholds[1]) return 2;
  if (value <= thresholds[2]) return 3;
  return 4;
}
