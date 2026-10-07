// Insight rules. Each rule inspects aggregated, real activity and either
// returns an observation backed by evidence, or reports that there isn't
// enough data. Rules never guess: thresholds below are minimum sample sizes.

import { formatDuration, formatHour, formatPercent, pluralize } from "../../lib/format.js";
import { computeStreaks, median, peakHourWindow, percentChange, sum, topShare } from "./aggregate.js";

export const THRESHOLDS = {
  trendMinEvents: 10,
  trendMinPrevious: 5,
  concentrationMinEvents: 10,
  weekdayMinCommits: 20,
  hoursMinCommits: 20,
  mergeMinPerPeriod: 3,
  resolutionMinIssues: 3,
  mergeRateMinPRs: 5,
};

const ok = (rule, fields) => ({ ...rule, status: "ok", ...fields });
const insufficient = (rule, requirement) => ({ ...rule, status: "insufficient", requirement });

export function activityTrendInsight({ current, previous }) {
  const rule = { id: "activity-trend", title: "Activity trend" };
  const evidence = [
    { label: "Last 30 days", value: pluralize(current, "event") },
    { label: "Previous 30 days", value: pluralize(previous, "event") },
  ];
  if (current + previous < THRESHOLDS.trendMinEvents || previous < THRESHOLDS.trendMinPrevious) {
    return insufficient(rule, `Needs at least ${THRESHOLDS.trendMinPrevious} events in the previous 30 days to compare against.`);
  }
  const change = percentChange(current, previous);
  const rounded = Math.round(Math.abs(change));
  let headline;
  if (rounded < 5) headline = "Your activity is steady compared with the previous 30 days.";
  else if (change > 0) headline = `Your activity increased ${rounded}% compared with the previous 30 days.`;
  else headline = `Your activity decreased ${rounded}% compared with the previous 30 days.`;
  return ok(rule, { headline, evidence, tone: change > 0 ? "up" : change < 0 ? "down" : "flat" });
}

export function repoConcentrationInsight(repoActivity) {
  const rule = { id: "repo-concentration", title: "Where your time goes" };
  const active = repoActivity.filter((r) => r.value > 0);
  const total = sum(active.map((r) => r.value));
  if (total < THRESHOLDS.concentrationMinEvents || active.length < 2) {
    return insufficient(rule, "Needs activity in at least 2 repositories and 10 events in the last 30 days.");
  }
  const n = Math.min(3, active.length);
  const { top, share } = topShare(active, n);
  const evidence = top.map((r) => ({ label: r.name, value: `${formatPercent((r.value / total) * 100)} · ${pluralize(r.value, "event")}` }));
  const single = top[0].value / total;
  let headline;
  if (single >= 0.6) {
    headline = `Most of your recent activity (${formatPercent(single * 100)}) came from ${top[0].name}.`;
  } else if (share >= 0.6 && active.length > n) {
    headline = `Most of your recent activity (${formatPercent(share * 100)}) came from ${n} repositories.`;
  } else {
    headline = `Your recent activity is spread across ${active.length} repositories.`;
  }
  return ok(rule, { headline, evidence });
}

export function weekdayPatternInsight(weekdayTotals) {
  const rule = { id: "weekday-pattern", title: "Weekly rhythm" };
  const total = sum(weekdayTotals);
  if (total < THRESHOLDS.weekdayMinCommits) {
    return insufficient(rule, `Needs at least ${THRESHOLDS.weekdayMinCommits} commits in the last 90 days.`);
  }
  const weekend = weekdayTotals[5] + weekdayTotals[6];
  const weekdayShare = (total - weekend) / total;
  const names = ["Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays", "Sundays"];
  const busiest = weekdayTotals.indexOf(Math.max(...weekdayTotals));
  const evidence = [
    { label: "Weekday commits", value: `${formatPercent(weekdayShare * 100)}` },
    { label: "Busiest day", value: `${names[busiest]} (${pluralize(weekdayTotals[busiest], "commit")})` },
  ];
  let headline;
  if (weekdayShare >= 0.85) headline = "You are most active on weekdays.";
  else if (weekdayShare <= 0.55) headline = "A large share of your commits happen on weekends.";
  else headline = `Your commits are spread across the week, peaking on ${names[busiest]}.`;
  return ok(rule, { headline, evidence });
}

export function peakHoursInsight(hourTotals, tz) {
  const rule = { id: "peak-hours", title: "Time of day" };
  const total = sum(hourTotals);
  if (total < THRESHOLDS.hoursMinCommits) {
    return insufficient(rule, `Needs at least ${THRESHOLDS.hoursMinCommits} commits in the last 90 days.`);
  }
  const peak = peakHourWindow(hourTotals, 3);
  const evidence = [
    { label: "Window", value: `${formatHour(peak.start)}–${formatHour(peak.end)} ${tz}` },
    { label: "Share of commits", value: formatPercent(peak.share * 100) },
  ];
  // A 3-hour window holds 12.5% of a uniform day. Only call it a pattern
  // when it's clearly concentrated.
  if (peak.share < 0.3) {
    return ok(rule, { headline: "Your commits are spread throughout the day without a strong peak.", evidence });
  }
  return ok(rule, {
    headline: `Most of your commits happen between ${formatHour(peak.start)} and ${formatHour(peak.end)}.`,
    evidence,
  });
}

export function mergeSpeedInsight({ current, previous }) {
  const rule = { id: "merge-speed", title: "Time to merge" };
  if (current.length < THRESHOLDS.mergeMinPerPeriod || previous.length < THRESHOLDS.mergeMinPerPeriod) {
    return insufficient(rule, `Needs at least ${THRESHOLDS.mergeMinPerPeriod} merged pull requests in each of the last two 30-day periods.`);
  }
  const now = median(current);
  const before = median(previous);
  const evidence = [
    { label: "Median, last 30 days", value: `${formatDuration(now)} (${pluralize(current.length, "PR")})` },
    { label: "Median, previous 30 days", value: `${formatDuration(before)} (${pluralize(previous.length, "PR")})` },
  ];
  const ratio = now / before;
  let headline;
  if (ratio <= 0.8) headline = "Pull requests are being merged faster than last month.";
  else if (ratio >= 1.25) headline = "Pull requests are taking longer to merge than last month.";
  else headline = "Time to merge is similar to last month.";
  return ok(rule, { headline, evidence });
}

export function consistencyInsight(dailyActivity, todayKey) {
  const rule = { id: "consistency", title: "Consistency" };
  const last30 = dailyActivity.slice(-30);
  const activeDays = last30.filter((d) => d.value > 0).length;
  if (activeDays === 0) {
    return insufficient(rule, "No activity recorded in the last 30 days.");
  }
  const { current, longest } = computeStreaks(dailyActivity, todayKey);
  return ok(rule, {
    headline: `You were active on ${activeDays} of the last 30 days.`,
    evidence: [
      { label: "Current streak", value: pluralize(current, "day") },
      { label: "Longest streak (90 days)", value: pluralize(longest, "day") },
    ],
  });
}

export function issueResolutionInsight(resolutionHours) {
  const rule = { id: "issue-resolution", title: "Issue resolution" };
  if (resolutionHours.length < THRESHOLDS.resolutionMinIssues) {
    return insufficient(rule, `Needs at least ${THRESHOLDS.resolutionMinIssues} issues you opened to be closed in the last 90 days.`);
  }
  const m = median(resolutionHours);
  return ok(rule, {
    headline: `Issues you open are typically closed within ${formatDuration(m)}.`,
    evidence: [
      { label: "Median resolution", value: formatDuration(m) },
      { label: "Issues closed (90 days)", value: String(resolutionHours.length) },
    ],
  });
}

export function mergeRateInsight({ merged, closed }) {
  const rule = { id: "merge-rate", title: "Pull request outcomes" };
  const total = merged + closed;
  if (total < THRESHOLDS.mergeRateMinPRs) {
    return insufficient(rule, `Needs at least ${THRESHOLDS.mergeRateMinPRs} pull requests closed or merged in the last 90 days.`);
  }
  const rate = merged / total;
  return ok(rule, {
    headline: `${formatPercent(rate * 100)} of your pull requests closed in the last 90 days were merged.`,
    evidence: [
      { label: "Merged", value: String(merged) },
      { label: "Closed without merge", value: String(closed) },
    ],
  });
}

export function newWorkInsight(newRepos) {
  const rule = { id: "new-work", title: "New work" };
  if (newRepos.length === 0) {
    return insufficient(rule, "No repositories had their first recorded activity in the last 30 days.");
  }
  const names = newRepos.slice(0, 3).map((r) => r.name);
  const headline =
    newRepos.length === 1
      ? `You started contributing to ${names[0]} in the last 30 days.`
      : `You started contributing to ${newRepos.length} new repositories in the last 30 days.`;
  return ok(rule, { headline, evidence: newRepos.slice(0, 3).map((r) => ({ label: r.name, value: pluralize(r.value, "event") })) });
}

/** Evaluate every rule against the gathered input. */
export function buildInsights(input) {
  return [
    activityTrendInsight(input.activity),
    consistencyInsight(input.dailyActivity, input.todayKey),
    repoConcentrationInsight(input.repoActivity),
    weekdayPatternInsight(input.commitWeekdays),
    peakHoursInsight(input.commitHours, input.tz),
    mergeSpeedInsight(input.mergeDurations),
    mergeRateInsight(input.prOutcomes),
    issueResolutionInsight(input.issueResolutionHours),
    newWorkInsight(input.newRepos),
  ];
}
