import { beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import type { ReactNode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

let latestQueryOptions: Record<string, unknown> | null = null;
let latestQueryArgs: Record<string, unknown> | null = null;

const queryState = {
  data: {
    user: { username: "alice", name: "Alice" },
    stats: {
      firstTrackedAt: Date.UTC(2026, 1, 1),
      lastTrackedAt: Date.UTC(2026, 1, 21),
      currentTotalDeploys: 20,
      deploysLast24h: 2,
      deploysLast7d: 8,
      deploysLast30d: 20,
      averagePerDayLast30d: 0.67,
    },
    deployments: [
      { createdAt: Date.UTC(2026, 1, 20), totalDeploys: 19, delta: 1 },
      { createdAt: Date.UTC(2026, 1, 21), totalDeploys: 20, delta: 1 },
    ],
    chartData: [{ date: "2026-02-21", count: 1, delta: 1 }],
    comparisonStats: {
      currentPeriod: 8,
      previousPeriod: 4,
      percentageChange: 100,
      trend: "up" as const,
    },
    samplesShown: 2,
  },
  isLoading: false,
  isError: false,
  isFetching: false,
};

mock.module("@convex-dev/react-query", () => ({
  convexQuery: (_queryRef: unknown, args: Record<string, unknown>) => {
    latestQueryArgs = args;
    return {
      queryKey: ["mock-user-details", args],
      queryFn: async () => queryState.data,
    };
  },
}));

mock.module("@tanstack/react-query", () => ({
  useQuery: (options: Record<string, unknown>) => {
    latestQueryOptions = options;
    return queryState;
  },
}));

mock.module("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("UserDetailsDialog integration", () => {
  beforeEach(() => {
    latestQueryOptions = null;
    latestQueryArgs = null;
    queryState.isLoading = false;
    queryState.isError = false;
    queryState.isFetching = false;
  });

  function setupDom() {
    const dom = new JSDOM("<!doctype html><html><body></body></html>");
    globalThis.window = dom.window as never;
    globalThis.document = dom.window.document;
    globalThis.navigator = dom.window.navigator;
    globalThis.HTMLElement = dom.window.HTMLElement as never;
    globalThis.MouseEvent = dom.window.MouseEvent as never;
    globalThis.Event = dom.window.Event as never;
    globalThis.CustomEvent = dom.window.CustomEvent as never;
    globalThis.ResizeObserver = class ResizeObserverMock {
      observe() {}

      unobserve() {}

      disconnect() {}
    } as never;

    return dom;
  }

  it("passes selected period to getUserDetails and updates it when toggled", async () => {
    const dom = setupDom();

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const { UserDetailsDialog } = await import(
      "../src/components/user-details-dialog"
    );

    flushSync(() => {
      root.render(
        <UserDetailsDialog username="alice" open showTrigger={false} />,
      );
    });

    expect(latestQueryOptions?.enabled).toBe(true);
    expect(latestQueryArgs?.period).toBe("7d");

    const button30d = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "30d",
    );

    flushSync(() => {
      button30d?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(latestQueryArgs?.period).toBe("30d");

    flushSync(() => {
      root.unmount();
    });
    dom.window.close();
  });

  it("keeps query disabled when dialog is closed", async () => {
    const dom = setupDom();

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const { UserDetailsDialog } = await import(
      "../src/components/user-details-dialog"
    );

    flushSync(() => {
      root.render(
        <UserDetailsDialog username="alice" open={false} showTrigger={false} />,
      );
    });

    expect(latestQueryOptions?.enabled).toBe(false);

    flushSync(() => {
      root.unmount();
    });
    dom.window.close();
  });

  it("renders chart loading and error states from query state", async () => {
    const dom = setupDom();

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const { UserDetailsDialog } = await import(
      "../src/components/user-details-dialog"
    );

    queryState.isFetching = true;

    flushSync(() => {
      root.render(
        <UserDetailsDialog username="alice" open showTrigger={false} />,
      );
    });

    expect(document.body.textContent).toContain("Loading chart data");

    queryState.isFetching = false;
    queryState.isError = true;

    flushSync(() => {
      root.render(
        <UserDetailsDialog username="alice" open showTrigger={false} />,
      );
    });

    expect(document.body.textContent).toContain(
      "Failed to load deployment chart",
    );

    flushSync(() => {
      root.unmount();
    });
    dom.window.close();
  });
});
