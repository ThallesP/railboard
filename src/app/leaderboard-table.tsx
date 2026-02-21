"use client";

import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { LeaderboardTableView } from "@/components/leaderboard-table-view";
import { UserDetailsDialog } from "@/components/user-details-dialog";
import { api } from "../../convex/_generated/api";

type LeaderboardEntry = FunctionReturnType<
  typeof api.leaderboard.get
>["entries"][number];

export function Leaderboard() {
  const { data, isLoading, isError } = useQuery(
    convexQuery(api.leaderboard.get),
  );

  return (
    <LeaderboardTableView<LeaderboardEntry>
      entries={data?.entries ?? []}
      isLoading={isLoading}
      isError={isError}
      UserDetailsDialogComponent={UserDetailsDialog}
    />
  );
}
