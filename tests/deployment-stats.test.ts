import { describe, expect, it } from "bun:test";
import {
  buildChartDataFromCumulativeSnapshots,
  calculatePercentageChange,
  computeComparisonForPeriod,
  computeDeployDeltaSince,
  computePlatformWeekStats,
  createComparisonStats,
  createDayRange,
  resolveTrend,
  startOfUtcDay,
  toIsoDateUtc,
} from "../convex/deployment-stats";

describe("deployment stats helpers", () => {
  it("builds daily chart data from cumulative snapshots", () => {
    const start = Date.UTC(2026, 1, 1);
    const result = buildChartDataFromCumulativeSnapshots(
      start,
      [10, 12, 18],
      8,
    );

    expect(result).toEqual([
      { date: "2026-02-01", count: 2, delta: 2 },
      { date: "2026-02-02", count: 2, delta: 2 },
      { date: "2026-02-03", count: 6, delta: 6 },
    ]);
  });

  it("handles missing chart snapshots with zero deltas", () => {
    const start = Date.UTC(2026, 1, 10);
    const result = buildChartDataFromCumulativeSnapshots(start, [5, 5, 5], 5);

    expect(result.map((point) => point.count)).toEqual([0, 0, 0]);
  });

  it("returns empty chart data when there are no snapshots", () => {
    const result = buildChartDataFromCumulativeSnapshots(
      Date.UTC(2026, 1, 1),
      [],
      0,
    );
    expect(result).toEqual([]);
  });

  it("caps negative deltas at zero", () => {
    const start = Date.UTC(2026, 1, 1);
    const result = buildChartDataFromCumulativeSnapshots(start, [10, 8, 12], 9);

    expect(result.map((point) => point.count)).toEqual([1, 0, 4]);
  });

  it("calculates percentage change for growth and decline", () => {
    expect(calculatePercentageChange(20, 10)).toBe(100);
    expect(calculatePercentageChange(5, 10)).toBe(-50);
    expect(calculatePercentageChange(10, 10)).toBe(0);
  });

  it("handles zero previous value in percentage calculations", () => {
    expect(calculatePercentageChange(0, 0)).toBe(0);
    expect(calculatePercentageChange(3, 0)).toBe(100);
  });

  it("resolves trend direction correctly", () => {
    expect(resolveTrend(10, 9)).toBe("up");
    expect(resolveTrend(9, 10)).toBe("down");
    expect(resolveTrend(10, 10)).toBe("neutral");
  });

  it("creates complete comparison stats payload", () => {
    expect(createComparisonStats(12, 6)).toEqual({
      currentPeriod: 12,
      previousPeriod: 6,
      percentageChange: 100,
      trend: "up",
    });
  });

  it("returns ISO date strings in YYYY-MM-DD format", () => {
    const result = toIsoDateUtc(Date.UTC(2026, 10, 5, 13, 45, 10));
    expect(result).toBe("2026-11-05");
  });

  it("calculates start of UTC day and day ranges", () => {
    const now = Date.UTC(2026, 1, 21, 18, 12, 0);
    expect(startOfUtcDay(now)).toBe(Date.UTC(2026, 1, 21, 0, 0, 0));

    const range = createDayRange(now, 7);
    expect(range.start).toBe(Date.UTC(2026, 1, 15, 0, 0, 0));
    expect(range.end).toBe(Date.UTC(2026, 1, 21, 23, 59, 59, 999));
    expect(range.dayInMs).toBe(24 * 60 * 60 * 1000);
  });

  it("computes deployment delta using boundary-exclusive baseline", async () => {
    const now = Date.UTC(2026, 1, 21, 12, 0, 0);
    const since = now - 7 * 24 * 60 * 60 * 1000;

    const byTimestamp = new Map<number, number>([
      [now, 25],
      [since - 1, 10],
      [since, 12],
    ]);

    const result = await computeDeployDeltaSince(
      async (timestamp) => byTimestamp.get(timestamp) ?? 0,
      now,
      since,
    );

    expect(result).toBe(15);
  });

  it("computes period comparison with correct previous period totals", async () => {
    const now = Date.UTC(2026, 1, 21, 12, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;

    const byTimestamp = new Map<number, number>([
      [now, 30],
      [now - 7 * dayMs - 1, 20],
      [now - 14 * dayMs - 1, 14],
    ]);

    const result = await computeComparisonForPeriod(
      async (timestamp) => byTimestamp.get(timestamp) ?? 0,
      now,
      7,
    );

    expect(result).toEqual({
      currentPeriod: 10,
      previousPeriod: 6,
      percentageChange: 66.67,
      trend: "up",
    });
  });

  it("computes platform weekly stats across multiple users", async () => {
    const now = Date.UTC(2026, 1, 21, 12, 0, 0);
    const userIds = ["u1", "u2"];
    const range = createDayRange(now, 7);
    const previousStart = range.start - 7 * range.dayInMs;

    const points = new Map<string, number>([
      ["u1:end", 20],
      ["u1:prevBoundary", 15],
      ["u1:prevStart", 10],
      ["u2:end", 8],
      ["u2:prevBoundary", 8],
      ["u2:prevStart", 3],
    ]);

    const result = await computePlatformWeekStats(
      userIds,
      async (userId, timestamp) => {
        if (timestamp === range.end) {
          return points.get(`${userId}:end`) ?? 0;
        }
        if (timestamp === range.start - 1) {
          return points.get(`${userId}:prevBoundary`) ?? 0;
        }
        if (timestamp === previousStart - 1) {
          return points.get(`${userId}:prevStart`) ?? 0;
        }
        return 0;
      },
      now,
    );

    expect(result).toEqual({
      totalDeploysThisWeek: 5,
      totalDeploysLastWeek: 10,
      weekOverWeekChange: -50,
      trend: "down",
      totalTrackedUsers: 2,
    });
  });

  it("returns zeroed platform stats when there are no users", async () => {
    const result = await computePlatformWeekStats(
      [],
      async () => 0,
      Date.UTC(2026, 1, 21, 12, 0, 0),
    );

    expect(result).toEqual({
      totalDeploysThisWeek: 0,
      totalDeploysLastWeek: 0,
      weekOverWeekChange: 0,
      trend: "neutral",
      totalTrackedUsers: 0,
    });
  });
});
