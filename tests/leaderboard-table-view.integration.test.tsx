import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { JSDOM } from "jsdom";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { LeaderboardTableView } from "../src/components/leaderboard-table-view";

type DialogProps = {
  username?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
};

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

let latestObserverCallback: ObserverCallback | null = null;

class IntersectionObserverMock {
  constructor(callback: ObserverCallback) {
    latestObserverCallback = callback;
  }

  observe() {}

  disconnect() {}
}

describe("LeaderboardTableView integration", () => {
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
    globalThis.Event = dom.window.Event as never;
    globalThis.FocusEvent = dom.window.FocusEvent as never;
    globalThis.IntersectionObserver = IntersectionObserverMock as never;
    latestObserverCallback = null;

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

  it("opens dialog and passes username when a row is clicked", () => {
    let latestDialogProps: DialogProps = {};
    const MockDialog = (props: DialogProps) => {
      latestDialogProps = props;
      return null;
    };

    flushSync(() => {
      root.render(
        <LeaderboardTableView
          entries={[
            { username: "alice", totalDeploys: 10 },
            { username: "bob", totalDeploys: 5 },
          ]}
          UserDetailsDialogComponent={MockDialog}
        />,
      );
    });

    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(2);

    flushSync(() => {
      rows[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(latestDialogProps.open).toBe(true);
    expect(latestDialogProps.username).toBe("bob");
  });

  it("preserves infinite scroll behavior", () => {
    const entries = Array.from({ length: 31 }, (_, index) => ({
      username: `user-${index + 1}`,
      totalDeploys: index + 1,
    }));

    flushSync(() => {
      root.render(<LeaderboardTableView entries={entries} />);
    });

    const beforeIntersectRows = container.querySelectorAll("tbody tr");
    expect(beforeIntersectRows.length).toBe(31);
    expect(container.textContent).not.toContain("user-31");
    expect(latestObserverCallback).toBeDefined();

    flushSync(() => {
      latestObserverCallback?.([{ isIntersecting: true }]);
    });

    expect(container.textContent).toContain("user-31");
  });
});
