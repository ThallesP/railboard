import { describe, expect, it } from "bun:test";
import {
  formatWeekOverWeekPercentage,
  PLATFORM_STATS_STALE_TIME_MS,
} from "../src/lib/platform-stats";

describe("platform stats utilities", () => {
  it("uses a 5-minute stale time for caching", () => {
    expect(PLATFORM_STATS_STALE_TIME_MS).toBe(5 * 60 * 1000);
  });

  it("formats positive, negative, and neutral percentage values", () => {
    expect(formatWeekOverWeekPercentage(100)).toBe("+100%");
    expect(formatWeekOverWeekPercentage(-25.5)).toBe("-25.50%");
    expect(formatWeekOverWeekPercentage(0)).toBe("0%");
  });

  it("handles non-finite values safely", () => {
    expect(formatWeekOverWeekPercentage(Number.NaN)).toBe("0%");
    expect(formatWeekOverWeekPercentage(Number.POSITIVE_INFINITY)).toBe("0%");
  });
});
