<script lang="ts">
  import { createQuery } from "@tanstack/svelte-query";
  import type { Snippet } from "svelte";
  import AddUserDialog from "$lib/components/AddUserDialog.svelte";
  import LeaderboardTable from "$lib/components/LeaderboardTable.svelte";
  import StatCard from "$lib/components/StatCard.svelte";
  import { formatPercentage } from "$lib/format";
  import { leaderboardQuery, statsQuery } from "$lib/queries";

  let { children }: { children: Snippet } = $props();

  const leaderboard = createQuery(leaderboardQuery);
  const stats = createQuery(statsQuery);
</script>

<div class="min-h-screen bg-[hsl(250,24%,9%)] text-[hsl(0,0%,100%)]">
  <div class="relative isolate min-h-screen overflow-hidden px-4 py-10 sm:px-6 sm:py-16">
    <div class="absolute inset-0 -z-10 bg-[hsl(250,21%,11%/0.92)] backdrop-blur"></div>

    <div class="relative mx-auto flex max-w-5xl flex-col gap-8">
      <header class="flex flex-col items-center gap-4 text-center">
        <h1 class="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">Railboard</h1>
        <p class="max-w-2xl text-lg text-slate-300">
          Track how many times you've deployed your projects across all projects and compete for the
          top spot.
        </p>
        <div class="mt-1">
          <AddUserDialog />
        </div>
      </header>

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Deploys this week"
          value={stats.data?.totalDeploysThisWeek.toLocaleString() ?? "0"}
          description="Total deployments across all tracked users in the current week."
          isLoading={stats.isPending}
          isError={stats.isError}
        />
        <StatCard
          title="Week-over-week"
          value={stats.data ? formatPercentage(stats.data.weekOverWeekChange) : "0%"}
          description={stats.data
            ? `${stats.data.totalDeploysThisWeek.toLocaleString()} this week vs ${stats.data.totalDeploysLastWeek.toLocaleString()} last week.`
            : "Compares platform deployments against the previous week."}
          change={stats.data?.weekOverWeekChange}
          trend={stats.data?.trend}
          isLoading={stats.isPending}
          isError={stats.isError}
        />
        <StatCard
          title="Tracked users"
          value={stats.data?.totalTrackedUsers.toLocaleString() ?? "0"}
          description="Unique users currently included in platform statistics."
          isLoading={stats.isPending}
          isError={stats.isError}
        />
      </div>

      <LeaderboardTable
        entries={leaderboard.data ?? []}
        isLoading={leaderboard.isPending}
        isError={leaderboard.isError}
      />
    </div>
  </div>
</div>

{@render children()}
