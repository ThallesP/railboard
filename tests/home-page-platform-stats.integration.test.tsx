import { beforeEach, describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

let latestConvexQueryArgs: Record<string, unknown> | null = null;
let latestUseQueryOptions: Record<string, unknown> | null = null;

const platformStatsData = {
  totalDeploysThisWeek: 120,
  totalDeploysLastWeek: 80,
  weekOverWeekChange: 50,
  trend: "up" as const,
  totalTrackedUsers: 42,
};

mock.module("@convex-dev/react-query", () => ({
  convexQuery: (_queryRef: unknown, args: Record<string, unknown>) => {
    latestConvexQueryArgs = args;
    return {
      queryKey: ["mock-platform-stats", args],
      queryFn: async () => platformStatsData,
    };
  },
}));

mock.module("@tanstack/react-query", () => ({
  useQuery: (options: Record<string, unknown>) => {
    latestUseQueryOptions = options;
    return {
      data: platformStatsData,
      isLoading: false,
      isError: false,
    };
  },
}));

mock.module("@/components/add-username-dialog", () => ({
  AddUsernameDialog: () => <div>Add Username Dialog</div>,
}));

mock.module("../src/app/leaderboard-table", () => ({
  Leaderboard: () => <div>Leaderboard Content</div>,
}));

describe("Home page platform stats integration", () => {
  beforeEach(() => {
    latestConvexQueryArgs = null;
    latestUseQueryOptions = null;
  });

  it("renders platform stat cards and configures 5-minute query caching", async () => {
    const { default: Home } = await import("../src/app/page");

    const html = renderToStaticMarkup(<Home />);

    expect(latestConvexQueryArgs).toEqual({});
    expect(latestUseQueryOptions?.staleTime).toBe(5 * 60 * 1000);

    expect(html).toContain("Deploys this week");
    expect(html).toContain("Week-over-week");
    expect(html).toContain("Tracked users");
    expect(html).toContain(">120<");
    expect(html).toContain(">+50%<");
    expect(html).toContain(">42<");
    expect(html).toContain("Leaderboard Content");
  });
});
