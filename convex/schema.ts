import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    totalDeploys: v.number(),
  })
    .index("by_username", ["username"])
    .index("by_total_deploys", ["totalDeploys"]),
  deployments: defineTable({
    userId: v.id("users"),
    totalDeploys: v.number(),
    createdAt: v.number(),
  }),
});
