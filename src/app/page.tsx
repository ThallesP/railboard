"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import type { FunctionReference } from "convex/server";
import { AddUsernameDialog } from "@/components/add-username-dialog";
import { PlatformStatsCard } from "@/components/platform-stats-card";
import {
  formatWeekOverWeekPercentage,
  PLATFORM_STATS_STALE_TIME_MS,
} from "@/lib/platform-stats";
import { api } from "../../convex/_generated/api";
import { Leaderboard } from "./leaderboard-table";

type PlatformStats = {
  totalDeploysThisWeek: number;
  totalDeploysLastWeek: number;
  weekOverWeekChange: number;
  trend: "up" | "down" | "neutral";
  totalTrackedUsers: number;
};

export default function Home() {
  const getPlatformStatsRef = api.leaderboard
    .getPlatformStats as unknown as FunctionReference<
    "query",
    "public",
    Record<string, never>,
    PlatformStats
  >;

  const platformStatsQuery = convexQuery(getPlatformStatsRef, {});

  const {
    data: platformStats,
    isLoading: isPlatformStatsLoading,
    isError: isPlatformStatsError,
  } = useQuery({
    ...platformStatsQuery,
    staleTime: PLATFORM_STATS_STALE_TIME_MS,
  });

  return (
    <div className="min-h-screen bg-[hsl(250,24%,9%)] text-[hsl(0,0%,100%)]">
      <div className="relative isolate min-h-screen overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
        {/* Global background layer (no gradients) */}
        <div className="absolute inset-0 -z-10 bg-[hsl(250,21%,11%/0.92)] backdrop-blur" />

        <div className="relative mx-auto flex max-w-5xl flex-col gap-8">
          <header className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Railboard
            </h1>
            <p className="max-w-2xl text-lg text-slate-300 sm:text-lg">
              Track how many times you've deployed your projects across all
              projects and compete for the top spot.
            </p>
            <div className="mt-1">
              <AddUsernameDialog />
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <PlatformStatsCard
              title="Deploys this week"
              value={
                platformStats?.totalDeploysThisWeek?.toLocaleString() ?? "0"
              }
              description="Total deployments across all tracked users in the current week."
              isLoading={isPlatformStatsLoading}
              isError={isPlatformStatsError}
            />
            <PlatformStatsCard
              title="Week-over-week"
              value={
                platformStats
                  ? formatWeekOverWeekPercentage(
                      platformStats.weekOverWeekChange,
                    )
                  : "0%"
              }
              description={
                platformStats
                  ? `${platformStats.totalDeploysThisWeek.toLocaleString()} this week vs ${platformStats.totalDeploysLastWeek.toLocaleString()} last week.`
                  : "Compares platform deployments against the previous week."
              }
              change={platformStats?.weekOverWeekChange}
              trend={platformStats?.trend}
              isLoading={isPlatformStatsLoading}
              isError={isPlatformStatsError}
            />
            <PlatformStatsCard
              title="Tracked users"
              value={platformStats?.totalTrackedUsers?.toLocaleString() ?? "0"}
              description="Unique users currently included in platform statistics."
              isLoading={isPlatformStatsLoading}
              isError={isPlatformStatsError}
            />
          </div>

          <Leaderboard />
        </div>
      </div>
    </div>
  );
}
