import { Workpool } from "@convex-dev/workpool";
import { v } from "convex/values";
import ky from "ky";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";

const addUserPool = new Workpool(components.addUserPool, {
  maxParallelism: 1,
});

export const list = query({
  args: {},
  async handler(ctx) {
    return await ctx.db
      .query("users")
      .withIndex("by_total_deploys")
      .order("desc")
      .collect();
  },
});

export const addUser = mutation({
  args: {
    username: v.string(),
  },
  async handler(ctx, { username }) {
    const userExists = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (userExists) {
      console.log(`User ${username} already exists`);
      return;
    }

    await addUserPool.enqueueAction(ctx, internal.leaderboard.addUserInternal, {
      username,
    });
  },
});

export const addUserInternal = internalAction({
  args: {
    username: v.string(),
  },
  async handler(ctx, { username }) {
    const response = await ky.post("https://backboard.railway.com/graphql/v2", {
      json: {
        query: `query GetUserProfile($username: String!){ userProfile(username: $username) {totalDeploys} }`,
        variables: {
          username,
        },
      },
      headers: {
        "User-Agent": "Railboard/1.0.0 (contato@thalles.me)",
      },
    });

    const { data } = await response.json<{
      data: { userProfile: { totalDeploys: number } };
    }>();

    await ctx.runMutation(internal.leaderboard.addDeploymentCount, {
      username,
      totalDeploys: data.userProfile.totalDeploys,
    });

    await addUserPool.enqueueAction(
      ctx,
      internal.leaderboard.addUserInternal,
      {
        username,
      },
      {
        runAfter: 60 * 60 * 1000, // 1 hour from now,
      },
    );
  },
});

export const addDeploymentCount = internalMutation({
  args: {
    username: v.string(),
    totalDeploys: v.number(),
  },
  async handler(ctx, { username, totalDeploys }) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    const userId: Id<"users"> | undefined = user
      ? user._id
      : await ctx.db.insert("users", {
          username,
          totalDeploys,
        });

    await ctx.db.insert("deployments", {
      userId,
      totalDeploys,
      createdAt: Date.now(),
    });
  },
});
