import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { deploymentsByUserAndTime } from "./deployment-aggregates";
import {
  buildChartDataFromCumulativeSnapshots,
  computeComparisonForPeriod,
  computeDeployDeltaSince,
  createComparisonStats,
  createDayRange,
} from "./deployment-stats";

const userValidator = v.object({
  _id: v.id("users"),
  _creationTime: v.number(),
  username: v.string(),
  totalDeploys: v.number(),
  avatar: v.optional(v.string()),
  name: v.optional(v.string()),
  website: v.optional(v.string()),
});

const deploymentPointValidator = v.object({
  createdAt: v.number(),
  totalDeploys: v.number(),
  delta: v.number(),
});

const statsValidator = v.object({
  firstTrackedAt: v.number(),
  lastTrackedAt: v.number(),
  currentTotalDeploys: v.number(),
  deploysLast24h: v.number(),
  deploysLast7d: v.number(),
  deploysLast30d: v.number(),
  averagePerDayLast30d: v.number(),
});

const deploymentChartDataValidator = v.object({
  date: v.string(),
  count: v.number(),
  delta: v.number(),
});

const comparisonStatsValidator = v.object({
  currentPeriod: v.number(),
  previousPeriod: v.number(),
  percentageChange: v.number(),
  trend: v.union(v.literal("up"), v.literal("down"), v.literal("neutral")),
});

async function getCumulativeDeploysAt(
  ctx: Parameters<(typeof getUserDetails)["handler"]>[0],
  userId: Id<"users">,
  timestamp: number,
) {
  const aggregateValue = await deploymentsByUserAndTime.max(ctx, {
    namespace: userId,
    bounds: {
      upper: { key: timestamp, inclusive: true },
    },
  });

  if (aggregateValue) {
    return aggregateValue.sumValue;
  }

  const fallback = await ctx.db
    .query("deployments")
    .withIndex("by_user_created_at", (q) =>
      q.eq("userId", userId).lte("createdAt", timestamp),
    )
    .order("desc")
    .first();

  return fallback?.totalDeploys ?? 0;
}

async function getChartDataForPeriod(
  ctx: Parameters<(typeof getUserDetails)["handler"]>[0],
  userId: Id<"users">,
  now: number,
  days: number,
) {
  const { start, dayInMs } = createDayRange(now, days);
  const previousDayTotal = await getCumulativeDeploysAt(ctx, userId, start - 1);

  const cumulativeByDayEnd = await Promise.all(
    Array.from({ length: days }).map((_, index) => {
      const dayEnd = start + dayInMs * (index + 1) - 1;
      return getCumulativeDeploysAt(ctx, userId, dayEnd);
    }),
  );

  return buildChartDataFromCumulativeSnapshots(
    start,
    cumulativeByDayEnd,
    previousDayTotal,
  );
}

export const getUserDetails = query({
  args: {
    username: v.string(),
    now: v.number(),
    limit: v.optional(v.number()),
    period: v.optional(v.union(v.literal("7d"), v.literal("30d"))),
  },
  returns: v.union(
    v.null(),
    v.object({
      user: userValidator,
      stats: statsValidator,
      deployments: v.array(deploymentPointValidator),
      chartData: v.array(deploymentChartDataValidator),
      comparisonStats: comparisonStatsValidator,
      selectedPeriod: v.union(v.literal("7d"), v.literal("30d")),
      samplesShown: v.number(),
    }),
  ),
  async handler(ctx, { username, now, limit, period }) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (!user) {
      return null;
    }

    const latest = await ctx.db
      .query("deployments")
      .withIndex("by_user_created_at", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    const earliest = await ctx.db
      .query("deployments")
      .withIndex("by_user_created_at", (q) => q.eq("userId", user._id))
      .order("asc")
      .first();

    const selectedPeriod = period ?? "7d";
    const periodDays = selectedPeriod === "30d" ? 30 : 7;

    if (!latest || !earliest) {
      return {
        user,
        stats: {
          firstTrackedAt: user._creationTime,
          lastTrackedAt: user._creationTime,
          currentTotalDeploys: user.totalDeploys,
          deploysLast24h: 0,
          deploysLast7d: 0,
          deploysLast30d: 0,
          averagePerDayLast30d: 0,
        },
        deployments: [],
        chartData: [],
        comparisonStats: createComparisonStats(0, 0),
        selectedPeriod,
        samplesShown: 0,
      };
    }

    const day = 24 * 60 * 60 * 1000;
    const week = 7 * day;
    const month = 30 * day;

    const getDeployDeltaSince = async (since: number) => {
      return computeDeployDeltaSince(
        (timestamp) => getCumulativeDeploysAt(ctx, user._id, timestamp),
        now,
        since,
      );
    };

    const [deploysLast24h, deploysLast7d, deploysLast30d] = await Promise.all([
      getDeployDeltaSince(now - day),
      getDeployDeltaSince(now - week),
      getDeployDeltaSince(now - month),
    ]);

    const maxSamples = Math.min(limit ?? 60, 200);
    const recentDeployments = await ctx.db
      .query("deployments")
      .withIndex("by_user_created_at", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(maxSamples);

    const chronological = recentDeployments.slice().reverse();
    const deployments = chronological.map((entry, index) => {
      const previous = index > 0 ? chronological[index - 1] : null;
      const delta = previous
        ? Math.max(0, entry.totalDeploys - previous.totalDeploys)
        : 0;
      return {
        createdAt: entry.createdAt,
        totalDeploys: entry.totalDeploys,
        delta,
      };
    });

    const [chartData, comparisonStats] = await Promise.all([
      getChartDataForPeriod(ctx, user._id, now, periodDays),
      computeComparisonForPeriod(
        (timestamp) => getCumulativeDeploysAt(ctx, user._id, timestamp),
        now,
        periodDays,
      ),
    ]);

    return {
      user,
      stats: {
        firstTrackedAt: earliest.createdAt,
        lastTrackedAt: latest.createdAt,
        currentTotalDeploys: latest.totalDeploys,
        deploysLast24h,
        deploysLast7d,
        deploysLast30d,
        averagePerDayLast30d: Number((deploysLast30d / 30).toFixed(2)),
      },
      deployments,
      chartData,
      comparisonStats,
      selectedPeriod,
      samplesShown: deployments.length,
    };
  },
});
