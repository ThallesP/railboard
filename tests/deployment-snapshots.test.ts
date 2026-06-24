import { describe, expect, it } from "bun:test";
import { shouldRecordDeploymentSnapshot } from "../convex/deployment_snapshots";

describe("deployment snapshot helpers", () => {
  it("records an initial deployment snapshot", () => {
    expect(shouldRecordDeploymentSnapshot(null, 10)).toBe(true);
    expect(shouldRecordDeploymentSnapshot(undefined, 10)).toBe(true);
  });

  it("skips unchanged deployment totals", () => {
    expect(shouldRecordDeploymentSnapshot(10, 10)).toBe(false);
  });

  it("records changed deployment totals", () => {
    expect(shouldRecordDeploymentSnapshot(10, 12)).toBe(true);
    expect(shouldRecordDeploymentSnapshot(12, 10)).toBe(true);
  });
});
