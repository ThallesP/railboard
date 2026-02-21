import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DeploymentFrequencyChart,
  formatAxisDateLabel,
} from "../src/components/deployment-frequency-chart";
import { PlatformStatsCard } from "../src/components/platform-stats-card";
import {
  formatPercentage,
  getTrendDirection,
  WeekOverWeekStat,
} from "../src/components/week-over-week-stat";

const chartData = {
  last7d: [
    { date: "2026-02-15", count: 3, delta: 3 },
    { date: "2026-02-16", count: 1, delta: 1 },
  ],
  last30d: [{ date: "2026-01-20", count: 10, delta: 10 }],
};

describe("DeploymentFrequencyChart", () => {
  it("renders with 7d option and title", () => {
    const html = renderToStaticMarkup(
      <DeploymentFrequencyChart data={chartData} initialPeriod="7d" />,
    );

    expect(html).toContain("Deployment frequency");
    expect(html).toContain("last 7 days");
    expect(html).toContain(">7d<");
    expect(html).toContain(">30d<");
  });

  it("supports controlled 30d period rendering", () => {
    const html = renderToStaticMarkup(
      <DeploymentFrequencyChart data={chartData} period="30d" />,
    );

    expect(html).toContain("last 30 days");
  });

  it("renders loading and error states", () => {
    const loadingHtml = renderToStaticMarkup(
      <DeploymentFrequencyChart data={chartData} isLoading />,
    );
    const errorHtml = renderToStaticMarkup(
      <DeploymentFrequencyChart data={chartData} isError />,
    );

    expect(loadingHtml).toContain("Loading chart data");
    expect(errorHtml).toContain("Failed to load deployment chart");
  });

  it("handles empty datasets", () => {
    const html = renderToStaticMarkup(
      <DeploymentFrequencyChart
        data={{
          last7d: [],
          last30d: [],
        }}
      />,
    );

    expect(html).toContain("No deployment data available for this period");
  });

  it("formats axis labels from ISO dates", () => {
    expect(formatAxisDateLabel("2026-02-15")).toBe("Feb 15");
    expect(formatAxisDateLabel("not-a-date")).toBe("not-a-date");
  });
});

describe("WeekOverWeekStat", () => {
  it("renders stat values and comparison copy", () => {
    const html = renderToStaticMarkup(
      <WeekOverWeekStat
        title="Week-over-week (7d)"
        stats={{
          currentPeriod: 24,
          previousPeriod: 12,
          percentageChange: 100,
          trend: "up",
        }}
      />,
    );

    expect(html).toContain("Week-over-week (7d)");
    expect(html).toContain("+100%");
    expect(html).toContain("24 this period vs 12 previous period");
  });

  it("handles loading and error states", () => {
    const loadingHtml = renderToStaticMarkup(
      <WeekOverWeekStat
        title="Week-over-week"
        isLoading
        stats={{
          currentPeriod: 0,
          previousPeriod: 0,
          percentageChange: 0,
          trend: "neutral",
        }}
      />,
    );

    const errorHtml = renderToStaticMarkup(
      <WeekOverWeekStat
        title="Week-over-week"
        isError
        stats={{
          currentPeriod: 0,
          previousPeriod: 0,
          percentageChange: 0,
          trend: "neutral",
        }}
      />,
    );

    expect(loadingHtml).toContain("Loading comparison");
    expect(errorHtml).toContain("Failed to load comparison");
  });

  it("formats percentage values and resolves trend direction", () => {
    expect(formatPercentage(15)).toBe("+15%");
    expect(formatPercentage(-15.25)).toBe("-15.25%");
    expect(formatPercentage(0)).toBe("0%");

    expect(getTrendDirection(10)).toBe("up");
    expect(getTrendDirection(-1)).toBe("down");
    expect(getTrendDirection(0)).toBe("neutral");
  });
});

describe("PlatformStatsCard", () => {
  it("renders value and optional change metadata", () => {
    const html = renderToStaticMarkup(
      <PlatformStatsCard
        title="Deploys this week"
        value="42"
        description="Current weekly total."
        change={12.5}
        trend="up"
      />,
    );

    expect(html).toContain("Deploys this week");
    expect(html).toContain(">42<");
    expect(html).toContain("+12.50% vs previous week");
  });

  it("handles loading and error states", () => {
    const loadingHtml = renderToStaticMarkup(
      <PlatformStatsCard
        title="Tracked users"
        value="-"
        description="Users"
        isLoading
      />,
    );

    const errorHtml = renderToStaticMarkup(
      <PlatformStatsCard
        title="Tracked users"
        value="-"
        description="Users"
        isError
      />,
    );

    expect(loadingHtml).toContain("Loading");
    expect(errorHtml).toContain("Failed to load");
  });
});
