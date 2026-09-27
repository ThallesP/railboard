import { describe, expect, it } from "bun:test";
import { formatAxisDate, formatPercentage } from "./format";

describe("formatPercentage", () => {
  it("formats positive, negative, and neutral values", () => {
    expect(formatPercentage(100)).toBe("+100%");
    expect(formatPercentage(-25.5)).toBe("-25.50%");
    expect(formatPercentage(66.67)).toBe("+66.67%");
    expect(formatPercentage(0)).toBe("0%");
  });

  it("handles non-finite values safely", () => {
    expect(formatPercentage(Number.NaN)).toBe("0%");
    expect(formatPercentage(Number.POSITIVE_INFINITY)).toBe("0%");
  });
});

describe("formatAxisDate", () => {
  it("formats ISO dates as short UTC labels", () => {
    expect(formatAxisDate("2026-02-21")).toBe("Feb 21");
    expect(formatAxisDate("2026-11-05")).toBe("Nov 5");
  });

  it("returns unparseable input unchanged", () => {
    expect(formatAxisDate("not-a-date")).toBe("not-a-date");
  });
});
