"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { formatWeekOverWeekPercentage } from "@/lib/platform-stats";
import { cn } from "@/lib/utils";

type PlatformStatsCardProps = {
  title: string;
  value: string | number;
  description: string;
  change?: number;
  trend?: "up" | "down" | "neutral";
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
};

export function PlatformStatsCard({
  title,
  value,
  description,
  change,
  trend = "neutral",
  isLoading = false,
  isError = false,
  className,
}: PlatformStatsCardProps) {
  return (
    <article
      className={cn(
        "rounded-xl border border-[hsl(246,11%,22%)] bg-[hsl(250,21%,11%)] p-4 shadow-lg backdrop-blur",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {title}
      </p>

      {isLoading ? (
        <p className="mt-3 text-sm text-slate-300">Loading...</p>
      ) : isError ? (
        <p className="mt-3 text-sm text-rose-200">Failed to load.</p>
      ) : (
        <>
          <p className="mt-3 text-3xl font-semibold sm:text-4xl">{value}</p>
          {typeof change === "number" ? (
            <div className="mt-2 flex items-center gap-1 text-xs">
              {trend === "up" ? (
                <TrendingUp
                  className="h-3.5 w-3.5 text-emerald-300"
                  aria-hidden="true"
                />
              ) : trend === "down" ? (
                <TrendingDown
                  className="h-3.5 w-3.5 text-rose-300"
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={cn({
                  "text-emerald-200": trend === "up",
                  "text-rose-200": trend === "down",
                  "text-slate-300": trend === "neutral",
                })}
              >
                {formatWeekOverWeekPercentage(change)} vs previous week
              </span>
            </div>
          ) : null}
          <p className="mt-1 text-xs text-slate-400">{description}</p>
        </>
      )}
    </article>
  );
}
