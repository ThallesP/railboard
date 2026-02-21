import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";

export const deploymentsByUserAndTime = new TableAggregate<{
  Namespace: Id<"users">;
  Key: number;
  DataModel: DataModel;
  TableName: "deployments";
}>(components.aggregate, {
  namespace: (doc) => doc.userId,
  sortKey: (doc) => doc.createdAt,
  sumValue: (doc) => doc.totalDeploys,
});
