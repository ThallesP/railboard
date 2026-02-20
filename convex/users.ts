import { v } from "convex/values";
import { query } from "./_generated/server";

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

export const getUserDetails = query({
  args: {
    username: v.string(),
    now: v.number(),
    limit: v.optional(v.number()),
  },
  returns: v.union(
    v.null(),
    v.object({
      user: userValidator,
      stats: statsValidator,
      deployments: v.array(deploymentPointValidator),
      samplesShown: v.number(),
    }),
  ),
  async handler(ctx, { username, now, limit }) {
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
        samplesShown: 0,
      };
    }

    const day = 24 * 60 * 60 * 1000;
    const week = 7 * day;
    const month = 30 * day;

    const getDeployDeltaSince = async (since: number) => {
      const latestInWindow = await ctx.db
        .query("deployments")
        .withIndex("by_user_created_at", (q) =>
          q.eq("userId", user._id).gte("createdAt", since),
        )
        .order("desc")
        .first();

      if (!latestInWindow) {
        return 0;
      }

      const previous = await ctx.db
        .query("deployments")
        .withIndex("by_user_created_at", (q) =>
          q.eq("userId", user._id).lt("createdAt", since),
        )
        .order("desc")
        .first();

      const base = previous?.totalDeploys ?? 0;
      return Math.max(0, latestInWindow.totalDeploys - base);
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
      samplesShown: deployments.length,
    };
  },
});
