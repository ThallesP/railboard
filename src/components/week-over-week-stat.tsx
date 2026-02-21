"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComparisonStats = {
  currentPeriod: number;
  previousPeriod: number;
  percentageChange: number;
  trend: "up" | "down" | "neutral";
};

type WeekOverWeekStatProps = {
  title: string;
  stats: ComparisonStats;
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
};

export function getTrendDirection(percentageChange: number) {
  if (percentageChange > 0) {
    return "up" as const;
  }

  if (percentageChange < 0) {
    return "down" as const;
  }

  return "neutral" as const;
}

export function formatPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  const formatted = Math.abs(value).toFixed(Math.abs(value) % 1 === 0 ? 0 : 2);
  const prefix = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${prefix}${formatted}%`;
}

export function WeekOverWeekStat({
  title,
  stats,
  isLoading = false,
  isError = false,
  className,
}: WeekOverWeekStatProps) {
  const trend = stats.trend || getTrendDirection(stats.percentageChange);

  return (
    <section
      className={cn(
        "rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-4",
        className,
      )}
    >
      <p className="text-[11px] uppercase tracking-wide text-slate-400">
        {title}
      </p>

      {isLoading ? (
        <p className="mt-3 text-sm text-slate-300">Loading comparison...</p>
      ) : isError ? (
        <p className="mt-3 text-sm text-rose-200">Failed to load comparison.</p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2">
            {trend === "up" ? (
              <TrendingUp
                className="h-4 w-4 text-emerald-300"
                aria-hidden="true"
              />
            ) : trend === "down" ? (
              <TrendingDown
                className="h-4 w-4 text-rose-300"
                aria-hidden="true"
              />
            ) : (
              <span className="text-xs text-slate-400" aria-hidden="true">
                -
              </span>
            )}
            <span
              className={cn("text-2xl font-semibold", {
                "text-emerald-200": trend === "up",
                "text-rose-200": trend === "down",
                "text-slate-200": trend === "neutral",
              })}
            >
              {formatPercentage(stats.percentageChange)}
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-300">
            {stats.currentPeriod.toLocaleString()} this period vs{" "}
            {stats.previousPeriod.toLocaleString()} previous period
          </p>
        </>
      )}
    </section>
  );
}
