<script lang="ts">
  import { BarChart } from "layerchart";
  import type { ChartPoint, Period } from "$lib/api";
  import { Button } from "$lib/components/ui/button";
  import * as Chart from "$lib/components/ui/chart";
  import { formatAxisDate } from "$lib/format";

  type Props = {
    data: ChartPoint[];
    period: Period;
    onPeriodChange: (period: Period) => void;
    isLoading?: boolean;
    isError?: boolean;
  };

  let { data, period, onPeriodChange, isLoading = false, isError = false }: Props = $props();

  const periods: Period[] = ["7d", "30d"];
  const chartConfig = {
    count: { label: "Deployments", color: "var(--chart-1)" },
  } satisfies Chart.ChartConfig;
</script>

<section class="rounded-lg border border-[hsl(246,11%,22%)] bg-[hsl(248,21%,13%)] p-4">
  <div class="mb-4 flex items-center justify-between gap-2">
    <div>
      <p class="text-[11px] tracking-wide text-slate-400 uppercase">Deployment frequency</p>
      <p class="text-sm font-medium text-slate-100">
        Daily deploy count for the last {period === "7d" ? "7" : "30"} days
      </p>
    </div>
    <div class="flex gap-2">
      {#each periods as option (option)}
        <Button
          size="sm"
          variant={period === option ? "secondary" : "outline"}
          onclick={() => onPeriodChange(option)}
          class="h-7 border-[hsl(246,11%,22%)] px-2 text-xs"
        >
          {option}
        </Button>
      {/each}
    </div>
  </div>

  {#if isLoading}
    <div class="flex h-[220px] items-center justify-center text-sm text-slate-300">
      Loading chart data...
    </div>
  {:else if isError}
    <div class="flex h-[220px] items-center justify-center text-sm text-rose-200">
      Failed to load deployment chart.
    </div>
  {:else if data.length === 0}
    <div class="flex h-[220px] items-center justify-center text-sm text-slate-400">
      No deployment data available for this period.
    </div>
  {:else}
    <Chart.Container config={chartConfig} class="h-[220px] w-full">
      <BarChart
        {data}
        x="date"
        bandPadding={0.25}
        series={[{ key: "count", label: chartConfig.count.label, color: chartConfig.count.color }]}
        padding={{ top: 8, right: 8, bottom: 24, left: 48 }}
        props={{
          xAxis: { format: formatAxisDate },
          yAxis: { format: "integer" },
        }}
      >
        {#snippet tooltip()}
          <Chart.Tooltip labelFormatter={formatAxisDate} />
        {/snippet}
      </BarChart>
    </Chart.Container>
  {/if}
</section>
