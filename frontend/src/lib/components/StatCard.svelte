<script lang="ts">
  import TrendingDown from "@lucide/svelte/icons/trending-down";
  import TrendingUp from "@lucide/svelte/icons/trending-up";
  import type { Trend } from "$lib/api";
  import { formatPercentage } from "$lib/format";
  import { cn } from "$lib/utils";

  type Props = {
    title: string;
    value: string;
    description: string;
    change?: number;
    trend?: Trend;
    isLoading?: boolean;
    isError?: boolean;
  };

  let {
    title,
    value,
    description,
    change,
    trend = "neutral",
    isLoading = false,
    isError = false,
  }: Props = $props();
</script>

<article
  class="rounded-xl border border-[hsl(246,11%,22%)] bg-[hsl(250,21%,11%)] p-4 shadow-lg backdrop-blur"
>
  <p class="text-xs font-medium tracking-wide text-slate-400 uppercase">{title}</p>

  {#if isLoading}
    <p class="mt-3 text-sm text-slate-300">Loading...</p>
  {:else if isError}
    <p class="mt-3 text-sm text-rose-200">Failed to load.</p>
  {:else}
    <p class="mt-3 text-3xl font-semibold sm:text-4xl">{value}</p>
    {#if change !== undefined}
      <div class="mt-2 flex items-center gap-1 text-xs">
        {#if trend === "up"}
          <TrendingUp class="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
        {:else if trend === "down"}
          <TrendingDown class="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />
        {/if}
        <span
          class={cn({
            "text-emerald-200": trend === "up",
            "text-rose-200": trend === "down",
            "text-slate-300": trend === "neutral",
          })}
        >
          {formatPercentage(change)} vs previous week
        </span>
      </div>
    {/if}
    <p class="mt-1 text-xs text-slate-400">{description}</p>
  {/if}
</article>
