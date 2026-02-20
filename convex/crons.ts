import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "refresh-leaderboard-users-hourly",
  { hours: 1 },
  internal.leaderboard.enqueueAllUsersForRefresh,
);

export default crons;
