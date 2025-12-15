import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    totalDeploys: v.number(),
    avatar: v.optional(v.string()),
    name: v.optional(v.string()),
    website: v.optional(v.string()),
  })
    .index("by_username", ["username"])
    .index("by_total_deploys", ["totalDeploys"]),
  deployments: defineTable({
    userId: v.id("users"),
    totalDeploys: v.number(),
    createdAt: v.number(),
  }),
});
