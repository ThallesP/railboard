import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const rootDir = resolve(import.meta.dir, "..");
const chartPath = resolve(rootDir, "src/components/ui/chart.tsx");
const packageJsonPath = resolve(rootDir, "package.json");
const globalStylesPath = resolve(rootDir, "src/app/globals.css");

function safeRead(filePath: string) {
  if (!existsSync(filePath)) {
    return "";
  }

  return readFileSync(filePath, "utf-8");
}

describe("shadcn chart installation", () => {
  it("creates chart.tsx in the expected path", () => {
    expect(existsSync(chartPath)).toBe(true);
  });

  it("adds recharts dependency to package.json", () => {
    const packageJson = JSON.parse(safeRead(packageJsonPath));
    expect(packageJson.dependencies?.recharts).toBeDefined();
  });

  it("keeps chart CSS variables in globals.css", () => {
    const globalStyles = safeRead(globalStylesPath);

    expect(globalStyles).toContain("--chart-1");
    expect(globalStyles).toContain("--chart-2");
    expect(globalStyles).toContain("--chart-3");
    expect(globalStyles).toContain("--chart-4");
    expect(globalStyles).toContain("--chart-5");
  });

  it("exports the expected chart API surface", () => {
    const chartSource = safeRead(chartPath);

    expect(chartSource).toContain("export type ChartConfig");
    expect(chartSource).toContain("ChartContainer");
    expect(chartSource).toContain("ChartTooltip");
    expect(chartSource).toContain("ChartTooltipContent");
    expect(chartSource).toContain("ChartLegend");
    expect(chartSource).toContain("ChartLegendContent");
    expect(chartSource).toContain("ChartStyle");
  });

  it("matches shadcn/ui chart component structure", () => {
    const chartSource = safeRead(chartPath);

    expect(chartSource).toContain('data-slot="chart"');
    expect(chartSource).toContain(
      "const ChartTooltip = RechartsPrimitive.Tooltip",
    );
    expect(chartSource).toContain(
      "const ChartLegend = RechartsPrimitive.Legend",
    );
  });

  it("is importable and exposes runtime chart exports", async () => {
    const chartModule = await import(pathToFileURL(chartPath).href);

    expect(chartModule.ChartContainer).toBeDefined();
    expect(chartModule.ChartTooltip).toBeDefined();
    expect(chartModule.ChartTooltipContent).toBeDefined();
    expect(chartModule.ChartLegend).toBeDefined();
    expect(chartModule.ChartLegendContent).toBeDefined();
    expect(chartModule.ChartStyle).toBeDefined();
  });

  it("handles missing files gracefully", () => {
    const missingPath = resolve(
      rootDir,
      "src/components/ui/not-found-chart.tsx",
    );
    expect(safeRead(missingPath)).toBe("");
  });
});
