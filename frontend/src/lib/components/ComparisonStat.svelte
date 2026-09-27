<script lang="ts">
  import TrendingDown from "@lucide/svelte/icons/trending-down";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import type { Comparison } from "$lib/api";
  import { formatPercentage } from "$lib/format";
  import { cn } from "$lib/utils";

  type Props = {
    title: string;
    comparison: Comparison;
    isLoading?: boolean;
    isError?: boolean;
  };

  let { title, comparison, isLoading = false, isError = false }: Props = $props();
</script>

<section class="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-4">
  <p class="text-[11px] tracking-wide text-slate-400 uppercase">{title}</p>

  {#if isLoading}
    <p class="mt-3 text-sm text-slate-300">Loading comparison...</p>
  {:else if isError}
    <p class="mt-3 text-sm text-rose-200">Failed to load comparison.</p>
  {:else}
    <div class="mt-3 flex items-center gap-2">
      {#if comparison.trend === "up"}
        <TrendingUp class="h-4 w-4 text-emerald-300" aria-hidden="true" />
      {:else if comparison.trend === "down"}
        <TrendingDown class="h-4 w-4 text-rose-300" aria-hidden="true" />
      {:else}
        <span class="text-xs text-slate-400" aria-hidden="true">-</span>
      {/if}
      <span
        class={cn("text-2xl font-semibold", {
          "text-emerald-200": comparison.trend === "up",
          "text-rose-200": comparison.trend === "down",
          "text-slate-200": comparison.trend === "neutral",
        })}
      >
        {formatPercentage(comparison.percentageChange)}
      </span>
    </div>

    <p class="mt-2 text-xs text-slate-300">
      {comparison.currentPeriod.toLocaleString()} this period vs
      {comparison.previousPeriod.toLocaleString()} previous period
    </p>
  {/if}
</section>
