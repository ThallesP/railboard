import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { DeploymentFrequencyChart } from "../src/components/deployment-frequency-chart";

const chartData = {
  last7d: [
    { date: "2026-02-15", count: 3, delta: 3 },
    { date: "2026-02-16", count: 1, delta: 1 },
  ],
  last30d: [{ date: "2026-01-20", count: 10, delta: 10 }],
};

describe("DeploymentFrequencyChart integration", () => {
  let dom: JSDOM;
  let root: Root;
  let container: HTMLDivElement;

  beforeEach(() => {
    dom = new JSDOM("<!doctype html><html><body></body></html>");
    globalThis.window = dom.window as never;
    globalThis.document = dom.window.document;
    globalThis.navigator = dom.window.navigator;
    globalThis.HTMLElement = dom.window.HTMLElement as never;
    globalThis.MouseEvent = dom.window.MouseEvent as never;
    globalThis.ResizeObserver = class ResizeObserverMock {
      observe() {}

      unobserve() {}

      disconnect() {}
    } as never;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    flushSync(() => {
      root.unmount();
    });
    dom.window.close();
  });

  it("switches between 7d and 30d periods", () => {
    flushSync(() => {
      root.render(
        <DeploymentFrequencyChart data={chartData} initialPeriod="7d" />,
      );
    });

    expect(container.textContent).toContain("last 7 days");

    const button30d = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "30d",
    );
    expect(button30d).toBeDefined();

    flushSync(() => {
      button30d?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("last 30 days");
  });
});
