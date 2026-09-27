<script lang="ts">
  import { createQuery } from "@tanstack/svelte-query";
  import { ApiError, type Period } from "$lib/api";
  import ComparisonStat from "$lib/components/ComparisonStat.svelte";
  import DeployChart from "$lib/components/DeployChart.svelte";
  import * as Dialog from "$lib/components/ui/dialog";
  import { formatDateTime } from "$lib/format";
  import { userQuery } from "$lib/queries";
  import { navigate, route } from "../router";

  const username = $derived(route.params.username ?? "");
  let open = $state(true);
  let period = $state<Period>("7d");

  const details = createQuery(() => userQuery(username, period));
  const data = $derived(details.data);

  const tileClass = "rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-3";
  const labelClass = "text-[11px] tracking-wide text-slate-400 uppercase";
  const messageClass =
    "rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-4 text-sm";
</script>

{#snippet tile(label: string, value: string, small = false)}
  <div class={tileClass}>
    <p class={labelClass}>{label}</p>
    <p
      class={small
        ? "mt-2 text-sm font-semibold text-white"
        : "mt-2 text-2xl font-semibold text-white"}
    >
      {value}
    </p>
  </div>
{/snippet}

<!-- Navigate away only once the close animation has finished. -->
<Dialog.Root
  bind:open
  onOpenChangeComplete={(isOpen) => {
    if (!isOpen) navigate("/", { scrollToTop: false });
  }}
>
  <Dialog.Content
    class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-[hsl(246,11%,22%)] bg-[hsl(250,21%,11%)] text-slate-100 sm:max-w-2xl"
  >
    <Dialog.Header>
      <Dialog.Title class="text-lg font-semibold text-slate-100">
        {data?.user.name ?? data?.user.username ?? username}
      </Dialog.Title>
      <Dialog.Description class="text-slate-400">
        {data?.user.username ?? username} · User details and deployment history.
      </Dialog.Description>
    </Dialog.Header>

    <div class="min-h-0 overflow-y-auto pr-1">
      {#if details.isPending}
        <div class="{messageClass} text-slate-300">Loading user details...</div>
      {:else if details.error instanceof ApiError && details.error.status === 404}
        <div class="{messageClass} text-slate-300">This user is no longer on the leaderboard.</div>
      {:else if !data}
        <div class="{messageClass} text-rose-200">Failed to load user details.</div>
      {:else}
        <div class="space-y-6">
          <div class="grid gap-3 sm:grid-cols-3">
            {@render tile("Total deploys", data.stats.currentTotalDeploys.toLocaleString())}
            {@render tile("Deploys (24h)", data.stats.deploysLast24h.toLocaleString())}
            {@render tile("Deploys (7d)", data.stats.deploysLast7d.toLocaleString())}
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            {@render tile("Deploys (30d)", data.stats.deploysLast30d.toLocaleString())}
            {@render tile("Avg/day (30d)", data.stats.averagePerDayLast30d.toLocaleString())}
            {@render tile("Last updated", formatDateTime(data.stats.lastTrackedAt), true)}
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            {@render tile("First tracked", formatDateTime(data.stats.firstTrackedAt), true)}
            <div class={tileClass}>
              <p class={labelClass}>Profile</p>
              <div class="mt-2 text-sm text-slate-200">
                {#if data.user.name}
                  <div>{data.user.name}</div>
                {:else}
                  <div class="text-slate-400">No name provided</div>
                {/if}
                {#if data.user.website}
                  <a
                    href={data.user.website}
                    class="mt-1 block text-xs text-slate-300 underline decoration-slate-600 underline-offset-2"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {data.user.website}
                  </a>
                {:else}
                  <div class="mt-1 text-xs text-slate-400">No website on file</div>
                {/if}
              </div>
            </div>
          </div>

          <div>
            <div
              class="flex items-center justify-between text-xs tracking-wide text-slate-400 uppercase"
            >
              <span>Deployments over time</span>
              <span>Last {data.snapshots.length} samples</span>
            </div>
            <div class="mt-2 max-h-60 overflow-y-auto rounded-lg border border-[hsl(246,11%,22%)]">
              <table class="w-full text-sm">
                <thead
                  class="bg-[hsl(250,21%,11%)] text-[11px] tracking-wide text-slate-400 uppercase"
                >
                  <tr>
                    <th class="px-3 py-2 text-left">Date</th>
                    <th class="px-3 py-2 text-right">Total</th>
                    <th class="px-3 py-2 text-right">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {#each data.snapshots as snapshot (snapshot.createdAt)}
                    <tr class="border-t border-[hsl(246,11%,22%)]">
                      <td class="px-3 py-2 text-left text-slate-200">
                        {formatDateTime(snapshot.createdAt)}
                      </td>
                      <td class="px-3 py-2 text-right text-slate-200">
                        {snapshot.totalDeploys.toLocaleString()}
                      </td>
                      <td class="px-3 py-2 text-right text-emerald-200">
                        +{snapshot.delta.toLocaleString()}
                      </td>
                    </tr>
                  {:else}
                    <tr>
                      <td colspan={3} class="px-3 py-4 text-center text-slate-400">
                        No deployment history available yet.
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>

          <div class="space-y-3">
            <ComparisonStat
              title="Week-over-week ({period})"
              comparison={data.comparison}
              isLoading={details.isFetching}
              isError={details.isError}
            />
            <DeployChart
              data={data.chart}
              {period}
              onPeriodChange={(next) => (period = next)}
              isLoading={details.isFetching}
              isError={details.isError}
            />
          </div>
        </div>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>
