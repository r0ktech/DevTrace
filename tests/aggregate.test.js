import { describe, expect, it } from "vitest";
import { computeStreaks, durationStats, median, peakHourWindow, percentChange, topShare, totalsByWeekday } from "@/server/analytics/aggregate";
import { aggregateLanguageBytes, aggregateLanguageCommits, withOther } from "@/server/analytics/languages-calc";
import { heatLevel, heatThresholds } from "@/lib/heatmap";

const days = (values, start = "2026-10-01") =>
  values.map((value, i) => ({ key: new Date(Date.parse(`${start}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10), value }));

describe("statistics", () => {
  it("computes medians for odd, even and empty inputs", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNull();
  });
  it("returns null percentage change without a baseline", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(12, 10)).toBeCloseTo(20);
  });
  it("measures durations and ignores incomplete records", () => {
    const stats = durationStats(
      [
        { a: "2026-01-01T00:00:00Z", b: "2026-01-01T02:00:00Z" },
        { a: "2026-01-01T00:00:00Z", b: "2026-01-01T06:00:00Z" },
        { a: "2026-01-01T00:00:00Z", b: null },
      ],
      "a",
      "b",
    );
    expect(stats).toEqual({ count: 2, medianHours: 4, meanHours: 4 });
  });
});

describe("computeStreaks", () => {
  it("counts the current streak even when today has no activity yet", () => {
    const series = days([1, 1, 0, 1, 1, 1, 0]); // Oct 1..7
    expect(computeStreaks(series, "2026-10-07")).toEqual({ current: 3, longest: 3, activeDays: 5 });
  });
  it("is zero for users with no activity", () => {
    expect(computeStreaks(days([0, 0, 0]), "2026-10-03")).toEqual({ current: 0, longest: 0, activeDays: 0 });
  });
});

describe("distributions", () => {
  it("totals by weekday", () => {
    expect(totalsByWeekday([{ key: "2026-10-05", value: 2 }, { key: "2026-10-12", value: 1 }, { key: "2026-10-11", value: 4 }])).toEqual([3, 0, 0, 0, 0, 0, 4]);
  });
  it("finds the peak hour window, wrapping midnight", () => {
    const hours = Array(24).fill(0);
    hours[23] = 5;
    hours[0] = 5;
    hours[12] = 3;
    expect(peakHourWindow(hours, 3)).toMatchObject({ start: 22, end: 1, count: 10 });
    expect(peakHourWindow(Array(24).fill(0))).toBeNull();
  });
  it("computes top-n share", () => {
    expect(topShare([{ value: 6 }, { value: 3 }, { value: 1 }], 2).share).toBeCloseTo(0.9);
  });
});

describe("language calculations", () => {
  const stats = [
    { repositoryId: "a", language: "JavaScript", bytes: 600, color: "#f1e05a" },
    { repositoryId: "b", language: "JavaScript", bytes: 200, color: null },
    { repositoryId: "b", language: "Go", bytes: 200, color: "#00ADD8" },
  ];
  it("sums bytes across repositories and counts repos per language", () => {
    const result = aggregateLanguageBytes(stats);
    expect(result[0]).toEqual({ language: "JavaScript", bytes: 800, repoCount: 2, color: "#f1e05a", share: 0.8 });
    expect(result[1]).toMatchObject({ language: "Go", share: 0.2, repoCount: 1 });
  });
  it("handles repositories without language data", () => {
    expect(aggregateLanguageBytes([])).toEqual([]);
  });
  it("attributes commits by primary language and ignores unknowns", () => {
    expect(aggregateLanguageCommits([{ language: "Go", commits: 3 }, { language: null, commits: 5 }, { language: "Rust", commits: 1 }])).toEqual([
      { language: "Go", commits: 3, share: 0.75 },
      { language: "Rust", commits: 1, share: 0.25 },
    ]);
  });
  it("folds the tail into Other", () => {
    const folded = withOther(aggregateLanguageBytes(stats), 1);
    expect(folded.map((e) => e.language)).toEqual(["JavaScript", "Other"]);
    expect(folded[1]).toMatchObject({ bytes: 200, languages: ["Go"] });
  });
});

describe("heatmap levels", () => {
  it("uses quartiles of non-zero days", () => {
    const t = heatThresholds([0, 1, 2, 3, 4, 100]);
    expect(heatLevel(0, t)).toBe(0);
    expect(heatLevel(1, t)).toBe(1);
    expect(heatLevel(100, t)).toBe(4);
  });
  it("handles all-zero data", () => {
    const t = heatThresholds([0, 0]);
    expect(heatLevel(0, t)).toBe(0);
  });
});
