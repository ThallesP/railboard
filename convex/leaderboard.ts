import { Workpool } from "@convex-dev/workpool";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import ky from "ky";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";

const addUserPool = new Workpool(components.addUserPool, {
  maxParallelism: 1,
});

const USER_PAGE_SIZE = 512;
const ENQUEUE_BATCH_SIZE = 256;

type UsernamesPage = {
  usernames: string[];
  continueCursor: string;
  isDone: boolean;
};

export const userExists = internalQuery({
  args: {
    username: v.string(),
  },
  async handler(ctx, { username }) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();
    return user !== null;
  },
});

export const addUser = action({
  args: {
    username: v.string(),
  },
  async handler(
    ctx,
    { username },
  ): Promise<{ username: string; totalDeploys: number }> {
    const exists = await ctx.runQuery(internal.leaderboard.userExists, {
      username,
    });

    if (exists) {
      throw new ConvexError("User already exists on the leaderboard");
    }

    const { totalDeploys } = await ctx.runAction(
      internal.leaderboard.refreshUser,
      {
        username,
      },
    );

    return {
      username,
      totalDeploys,
    };
  },
});

export const get = query({
  args: {},
  async handler(ctx) {
    const entries = await ctx.db
      .query("users")
      .withIndex("by_total_deploys")
      .order("desc")
      .collect();

    return {
      entries,
      totalDeploys: entries.reduce((sum, entry) => sum + entry.totalDeploys, 0),
      totalUsers: entries.length,
    };
  },
});

export const refreshUser = internalAction({
  args: {
    username: v.string(),
  },
  async handler(ctx, { username }) {
    const response = await ky.post("https://backboard.railway.com/graphql/v2", {
      json: {
        query: `query GetUserProfile($username: String!) {
          userProfile(username: $username) {
            totalDeploys
            avatar
            name
            profile {
              website
            }
          }
        }`,
        variables: {
          username,
        },
      },
      headers: {
        "User-Agent": "Railboard/1.0.0 (contato@thalles.me)",
      },
    });

    const { data } = await response.json<{
      data: {
        userProfile: {
          totalDeploys: number;
          avatar: string | null;
          name: string | null;
          profile: { website: string | null } | null;
        };
      };
    }>();

    await ctx.runMutation(internal.leaderboard.addDeploymentCount, {
      username,
      totalDeploys: data.userProfile.totalDeploys,
      avatar: data.userProfile.avatar ?? undefined,
      name: data.userProfile.name ?? undefined,
      website: data.userProfile.profile?.website ?? undefined,
    });

    return {
      totalDeploys: data.userProfile.totalDeploys,
    };
  },
});

export const listUsernamesPage = internalQuery({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  async handler(ctx, { paginationOpts }) {
    const page = await ctx.db
      .query("users")
      .withIndex("by_username")
      .paginate(paginationOpts);

    return {
      usernames: page.page.map((user) => user.username),
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});

export const enqueueAllUsersForRefresh = internalAction({
  args: {},
  async handler(ctx) {
    let cursor: string | null = null;
    let totalUsers = 0;
    let totalBatches = 0;
    let totalPages = 0;

    while (true) {
      const page: UsernamesPage = await ctx.runQuery(
        internal.leaderboard.listUsernamesPage,
        {
          paginationOpts: {
            cursor,
            numItems: USER_PAGE_SIZE,
            maximumRowsRead: USER_PAGE_SIZE * 4,
          },
        },
      );

      totalPages += 1;

      for (
        let index = 0;
        index < page.usernames.length;
        index += ENQUEUE_BATCH_SIZE
      ) {
        const batch = page.usernames
          .slice(index, index + ENQUEUE_BATCH_SIZE)
          .map((username: string) => ({ username }));

        if (batch.length === 0) {
          continue;
        }

        await addUserPool.enqueueActionBatch(
          ctx,
          internal.leaderboard.refreshUser,
          batch,
        );

        totalUsers += batch.length;
        totalBatches += 1;
      }

      if (page.isDone) {
        break;
      }

      cursor = page.continueCursor;
    }

    return {
      totalUsers,
      totalBatches,
      totalPages,
    };
  },
});

export const addDeploymentCount = internalMutation({
  args: {
    username: v.string(),
    totalDeploys: v.number(),
    avatar: v.optional(v.string()),
    name: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  async handler(ctx, { username, totalDeploys, avatar, name, website }) {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    let userId: Id<"users">;
    if (user) {
      // Update existing user with new data
      await ctx.db.patch(user._id, {
        totalDeploys,
        avatar,
        name,
        website,
      });
      userId = user._id;
    } else {
      // Create new user
      userId = await ctx.db.insert("users", {
        username,
        totalDeploys,
        avatar,
        name,
        website,
      });
    }

    await ctx.db.insert("deployments", {
      userId,
      totalDeploys,
      createdAt: Date.now(),
    });
  },
});
