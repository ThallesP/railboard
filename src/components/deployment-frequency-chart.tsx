"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export type ChartPeriod = "7d" | "30d";

export type DeploymentChartPoint = {
  date: string;
  count: number;
  delta: number;
};

export type DeploymentChartDataByPeriod = {
  last7d: DeploymentChartPoint[];
  last30d: DeploymentChartPoint[];
};

type DeploymentFrequencyChartProps = {
  data: DeploymentChartDataByPeriod;
  period?: ChartPeriod;
  initialPeriod?: ChartPeriod;
  chartType?: "bar" | "area";
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
  onPeriodChange?: (period: ChartPeriod) => void;
};

const chartConfig = {
  deployments: {
    label: "Deployments",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function formatAxisDateLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function DeploymentFrequencyChart({
  data,
  period,
  initialPeriod = "7d",
  chartType = "bar",
  isLoading = false,
  isError = false,
  className,
  onPeriodChange,
}: DeploymentFrequencyChartProps) {
  const [internalPeriod, setInternalPeriod] =
    React.useState<ChartPeriod>(initialPeriod);
  const activePeriod = period ?? internalPeriod;
  const chartData = activePeriod === "7d" ? data.last7d : data.last30d;

  const handlePeriodChange = (nextPeriod: ChartPeriod) => {
    if (!period) {
      setInternalPeriod(nextPeriod);
    }
    onPeriodChange?.(nextPeriod);
  };

  return (
    <section
      className={cn(
        "rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-4",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-400">
            Deployment frequency
          </p>
          <p className="text-sm font-medium text-slate-100">
            Daily deploy count for the last {activePeriod === "7d" ? "7" : "30"}{" "}
            days
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={activePeriod === "7d" ? "secondary" : "outline"}
            onClick={() => handlePeriodChange("7d")}
            className="h-7 border-[hsl(246,11%,22%)] px-2 text-xs"
          >
            7d
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activePeriod === "30d" ? "secondary" : "outline"}
            onClick={() => handlePeriodChange("30d")}
            className="h-7 border-[hsl(246,11%,22%)] px-2 text-xs"
          >
            30d
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-slate-300">
          Loading chart data...
        </div>
      ) : isError ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-rose-200">
          Failed to load deployment chart.
        </div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">
          No deployment data available for this period.
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          {chartType === "area" ? (
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 16, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDateLabel}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={52}
                tickMargin={10}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent labelFormatter={formatAxisDateLabel} />
                }
              />
              <Area
                dataKey="count"
                type="monotone"
                stroke="var(--color-deployments)"
                fill="var(--color-deployments)"
                fillOpacity={0.28}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </AreaChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 16, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={formatAxisDateLabel}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={52}
                tickMargin={10}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent labelFormatter={formatAxisDateLabel} />
                }
              />
              <Bar
                dataKey="count"
                fill="var(--color-deployments)"
                radius={[4, 4, 0, 0]}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          )}
        </ChartContainer>
      )}
    </section>
  );
}
