import { describe, expect, it } from "bun:test";
import {
  buildChartDataByPeriod,
  buildUserDetailsQueryArgs,
  DEFAULT_USER_DETAILS_PERIOD,
  getResetPeriodForDialog,
  getWeekOverWeekTitle,
} from "../src/lib/user-details-chart-utils";

describe("user details chart utilities", () => {
  it("builds query args with selected period", () => {
    const args = buildUserDetailsQueryArgs({
      username: "alice",
      now: 12345,
      period: "30d",
    });

    expect(args).toEqual({
      username: "alice",
      now: 12345,
      limit: 60,
      period: "30d",
    });
  });

  it("maps chart data to the active period only", () => {
    const points = [{ date: "2026-02-21", count: 3, delta: 3 }];

    expect(buildChartDataByPeriod("7d", points)).toEqual({
      last7d: points,
      last30d: [],
    });

    expect(buildChartDataByPeriod("30d", points)).toEqual({
      last7d: [],
      last30d: points,
    });
  });

  it("returns the correct comparison title for each period", () => {
    expect(getWeekOverWeekTitle("7d")).toBe("Week-over-week (7d)");
    expect(getWeekOverWeekTitle("30d")).toBe("Week-over-week (30d)");
  });

  it("resets period when dialog closes and keeps it when open", () => {
    expect(getResetPeriodForDialog(true)).toBeNull();
    expect(getResetPeriodForDialog(false)).toBe(DEFAULT_USER_DETAILS_PERIOD);
  });
});
