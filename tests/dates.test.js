import { describe, expect, it } from "vitest";
import { addDaysKey, bucketKeys, fillSeries, localDateKey, localMidnight, resolveRange, startOfWeekKey, weekdayIndex } from "@/lib/dates";

describe("calendar keys", () => {
  it("computes local dates in a timezone", () => {
    const instant = new Date("2026-03-01T02:00:00Z");
    expect(localDateKey(instant, "UTC")).toBe("2026-03-01");
    expect(localDateKey(instant, "America/Los_Angeles")).toBe("2026-02-28");
    expect(localDateKey(instant, "Asia/Tokyo")).toBe("2026-03-01");
  });

  it("does arithmetic across month and year boundaries", () => {
    expect(addDaysKey("2026-02-28", 1)).toBe("2026-03-01");
    expect(addDaysKey("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("uses Monday-based weeks", () => {
    expect(weekdayIndex("2026-10-05")).toBe(0); // Monday
    expect(weekdayIndex("2026-10-11")).toBe(6); // Sunday
    expect(startOfWeekKey("2026-10-08")).toBe("2026-10-05");
  });

  it("finds local midnight, including across DST changes", () => {
    expect(localMidnight("2026-07-01", "Europe/Berlin").toISOString()).toBe("2026-06-30T22:00:00.000Z");
    expect(localMidnight("2026-01-15", "Europe/Berlin").toISOString()).toBe("2026-01-14T23:00:00.000Z");
    // US DST starts 2026-03-08; midnight that day is still standard time
    expect(localMidnight("2026-03-08", "America/New_York").toISOString()).toBe("2026-03-08T05:00:00.000Z");
  });
});

describe("bucketKeys and fillSeries", () => {
  it("generates aligned day, week and month buckets", () => {
    expect(bucketKeys("2026-10-01", "2026-10-03", "day")).toEqual(["2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(bucketKeys("2026-10-01", "2026-10-14", "week")).toEqual(["2026-09-28", "2026-10-05", "2026-10-12"]);
    expect(bucketKeys("2026-11-15", "2027-01-02", "month")).toEqual(["2026-11-01", "2026-12-01", "2027-01-01"]);
  });

  it("fills gaps with zero and sums duplicate keys", () => {
    const series = fillSeries(["a", "b", "c"], [{ key: "a", count: 2 }, { key: "c", count: 1 }, { key: "c", count: "3" }, { key: "z", count: 9 }]);
    expect(series).toEqual([{ key: "a", value: 2 }, { key: "b", value: 0 }, { key: "c", value: 4 }]);
  });
});

describe("resolveRange", () => {
  it("anchors ranges at local midnight and computes the previous period", () => {
    const r = resolveRange("7d", { now: new Date("2026-10-06T12:00:00Z"), tz: "UTC" });
    expect(r).toMatchObject({ key: "7d", startKey: "2026-09-30", endKey: "2026-10-06", previousStartKey: "2026-09-23", bucket: "day" });
    expect(r.start.toISOString()).toBe("2026-09-30T00:00:00.000Z");
  });
  it("falls back to 30 days for unknown ranges", () => {
    expect(resolveRange("forever", { now: new Date("2026-10-06T00:00:00Z") }).key).toBe("30d");
  });
});
