import { keepPreviousData, queryOptions } from "@tanstack/svelte-query";
import { api, type Period } from "./api";

export const leaderboardQuery = () =>
  queryOptions({
    queryKey: ["leaderboard"],
    queryFn: api.leaderboard,
  });

export const statsQuery = () =>
  queryOptions({
    queryKey: ["stats"],
    queryFn: api.stats,
    staleTime: 5 * 60 * 1000,
  });

export const userQuery = (username: string, period: Period) =>
  queryOptions({
    queryKey: ["user", username, period],
    queryFn: () => api.user(username, period),
    // Keep showing the current period while the other one loads.
    placeholderData: keepPreviousData,
  });
