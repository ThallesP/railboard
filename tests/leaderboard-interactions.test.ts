import { describe, expect, it } from "bun:test";
import {
  applyLeaderboardDialogOpenChange,
  applyLeaderboardRowClick,
  CLICKABLE_ROW_CLASSNAME,
  isValidLeaderboardUsername,
  type LeaderboardDialogState,
} from "../src/lib/leaderboard-dialog-state";
import {
  normalizeUsername,
  shouldFetchUserDetails,
} from "../src/lib/user-details-dialog-utils";

const initialState: LeaderboardDialogState = {
  selectedUsername: "",
  open: false,
};

describe("UserDetailsDialog helpers", () => {
  it("normalizes usernames from props", () => {
    expect(normalizeUsername("  railboard-user  ")).toBe("railboard-user");
    expect(normalizeUsername("   ")).toBe("");
    expect(normalizeUsername(undefined)).toBe("");
  });

  it("enables query only when dialog is open with valid username", () => {
    expect(shouldFetchUserDetails(true, "alice")).toBe(true);
    expect(shouldFetchUserDetails(false, "alice")).toBe(false);
    expect(shouldFetchUserDetails(true, "")).toBe(false);
  });
});

describe("Leaderboard row click behavior", () => {
  it("accepts valid usernames from row model values", () => {
    expect(isValidLeaderboardUsername("alice")).toBe(true);
    expect(isValidLeaderboardUsername("   bob  ")).toBe(true);
    expect(isValidLeaderboardUsername("")).toBe(false);
    expect(isValidLeaderboardUsername("   ")).toBe(false);
    expect(isValidLeaderboardUsername(null)).toBe(false);
  });

  it("opens dialog and stores the clicked username", () => {
    const nextState = applyLeaderboardRowClick(initialState, "alice");

    expect(nextState).toEqual({
      selectedUsername: "alice",
      open: true,
    });
  });

  it("ignores invalid usernames when rows are clicked", () => {
    const openState: LeaderboardDialogState = {
      selectedUsername: "alice",
      open: true,
    };

    expect(applyLeaderboardRowClick(openState, "")).toEqual(openState);
    expect(applyLeaderboardRowClick(openState, "   ")).toEqual(openState);
    expect(applyLeaderboardRowClick(openState, null)).toEqual(openState);
  });

  it("updates selected username while dialog is already open", () => {
    const openState: LeaderboardDialogState = {
      selectedUsername: "alice",
      open: true,
    };

    const nextState = applyLeaderboardRowClick(openState, "charlie");
    expect(nextState).toEqual({
      selectedUsername: "charlie",
      open: true,
    });
  });

  it("closes dialog and resets state on onOpenChange(false)", () => {
    const openState: LeaderboardDialogState = {
      selectedUsername: "alice",
      open: true,
    };

    const nextState = applyLeaderboardDialogOpenChange(openState, false);
    expect(nextState).toEqual(initialState);
  });

  it("keeps selected username when onOpenChange(true) is emitted", () => {
    const openState: LeaderboardDialogState = {
      selectedUsername: "alice",
      open: false,
    };

    const nextState = applyLeaderboardDialogOpenChange(openState, true);
    expect(nextState).toEqual({
      selectedUsername: "alice",
      open: true,
    });
  });

  it("applies clickable row affordance classes", () => {
    expect(CLICKABLE_ROW_CLASSNAME).toContain("cursor-pointer");
    expect(CLICKABLE_ROW_CLASSNAME).toContain("hover:bg-slate-800/70");
  });
});

describe("Row click flow integration", () => {
  it("supports click row -> dialog opens -> change user -> close", () => {
    let state = initialState;

    state = applyLeaderboardRowClick(state, "alice");
    expect(state).toEqual({ selectedUsername: "alice", open: true });

    state = applyLeaderboardRowClick(state, "bob");
    expect(state).toEqual({ selectedUsername: "bob", open: true });

    state = applyLeaderboardDialogOpenChange(state, false);
    expect(state).toEqual(initialState);
  });

  it("supports multiple rapid row clicks by keeping the last username", () => {
    const rapidClicks = ["a", "b", "c", "d"];
    const state = rapidClicks.reduce(
      (currentState, username) =>
        applyLeaderboardRowClick(currentState, username),
      initialState,
    );

    expect(state).toEqual({ selectedUsername: "d", open: true });
  });
});
