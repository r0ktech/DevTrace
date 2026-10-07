import { describe, expect, it } from "vitest";
import {
  activityTrendInsight,
  buildInsights,
  consistencyInsight,
  issueResolutionInsight,
  mergeRateInsight,
  mergeSpeedInsight,
  newWorkInsight,
  peakHoursInsight,
  repoConcentrationInsight,
  weekdayPatternInsight,
} from "@/server/analytics/insight-rules";

const emptyInput = {
  tz: "UTC",
  todayKey: "2026-10-06",
  activity: { current: 0, previous: 0 },
  dailyActivity: Array.from({ length: 90 }, (_, i) => ({ key: `d${i}`, value: 0 })),
  repoActivity: [],
  commitWeekdays: [0, 0, 0, 0, 0, 0, 0],
  commitHours: Array(24).fill(0),
  mergeDurations: { current: [], previous: [] },
  prOutcomes: { merged: 0, closed: 0 },
  issueResolutionHours: [],
  newRepos: [],
};

describe("insights never fabricate patterns", () => {
  it("reports every insight as insufficient for a brand-new account", () => {
    const insights = buildInsights(emptyInput);
    expect(insights).toHaveLength(9);
    for (const insight of insights) {
      expect(insight.status).toBe("insufficient");
      expect(insight.requirement).toBeTruthy();
      expect(insight.headline).toBeUndefined();
    }
  });

  it("stays insufficient for users with very little activity", () => {
    expect(activityTrendInsight({ current: 3, previous: 1 }).status).toBe("insufficient");
    expect(weekdayPatternInsight([2, 1, 0, 0, 1, 0, 0]).status).toBe("insufficient");
    expect(mergeSpeedInsight({ current: [1, 2], previous: [5, 6, 7] }).status).toBe("insufficient");
  });
});

describe("activityTrendInsight", () => {
  it("calculates the change against the previous period", () => {
    const insight = activityTrendInsight({ current: 62, previous: 50 });
    expect(insight.status).toBe("ok");
    expect(insight.headline).toBe("Your activity increased 24% compared with the previous 30 days.");
    expect(insight.tone).toBe("up");
  });
  it("describes decreases and steady activity", () => {
    expect(activityTrendInsight({ current: 25, previous: 50 }).headline).toContain("decreased 50%");
    expect(activityTrendInsight({ current: 51, previous: 50 }).headline).toContain("steady");
  });
});

describe("repoConcentrationInsight", () => {
  it("names a dominant repository", () => {
    const insight = repoConcentrationInsight([{ name: "a/main", value: 40 }, { name: "a/side", value: 5 }]);
    expect(insight.headline).toContain("came from a/main");
  });
  it("detects concentration across the top 3", () => {
    const insight = repoConcentrationInsight([
      { name: "r1", value: 20 },
      { name: "r2", value: 20 },
      { name: "r3", value: 20 },
      { name: "r4", value: 5 },
      { name: "r5", value: 5 },
    ]);
    expect(insight.headline).toBe("Most of your recent activity (86%) came from 3 repositories.");
    expect(insight.evidence).toHaveLength(3);
  });
  it("requires at least two repositories", () => {
    expect(repoConcentrationInsight([{ name: "only", value: 50 }]).status).toBe("insufficient");
  });
});

describe("rhythm insights", () => {
  it("identifies weekday-heavy work", () => {
    expect(weekdayPatternInsight([10, 10, 10, 10, 10, 1, 0]).headline).toBe("You are most active on weekdays.");
  });
  it("identifies weekend-heavy work", () => {
    expect(weekdayPatternInsight([2, 2, 2, 2, 2, 15, 15]).headline).toContain("weekends");
  });
  it("finds a concentrated commit window", () => {
    const hours = Array(24).fill(1);
    hours[14] = 10;
    hours[15] = 10;
    hours[16] = 10;
    expect(peakHoursInsight(hours, "UTC").headline).toBe("Most of your commits happen between 14:00 and 17:00.");
  });
  it("does not claim a peak for evenly spread commits", () => {
    expect(peakHoursInsight(Array(24).fill(2), "UTC").headline).toContain("without a strong peak");
  });
});

describe("outcome insights", () => {
  it("compares median merge time between periods", () => {
    expect(mergeSpeedInsight({ current: [2, 3, 4], previous: [10, 12, 20] }).headline).toBe("Pull requests are being merged faster than last month.");
    expect(mergeSpeedInsight({ current: [20, 30, 40], previous: [2, 3, 4] }).headline).toContain("longer");
  });
  it("calculates merge rate and issue resolution", () => {
    expect(mergeRateInsight({ merged: 8, closed: 2 }).headline).toContain("80%");
    expect(issueResolutionInsight([24, 48, 72]).headline).toContain("2 days");
  });
  it("reports consistency from daily activity", () => {
    const daily = Array.from({ length: 90 }, (_, i) => ({ key: new Date(Date.UTC(2026, 6, 9) + i * 86_400_000).toISOString().slice(0, 10), value: i % 2 }));
    const insight = consistencyInsight(daily, daily.at(-1).key);
    expect(insight.headline).toBe("You were active on 15 of the last 30 days.");
  });
  it("lists new repositories only when they exist", () => {
    expect(newWorkInsight([{ name: "x/new", value: 4 }]).headline).toContain("x/new");
    expect(newWorkInsight([]).status).toBe("insufficient");
  });
});
