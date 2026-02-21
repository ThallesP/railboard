export type LeaderboardDialogState = {
  selectedUsername: string;
  open: boolean;
};

export const CLICKABLE_ROW_CLASSNAME =
  "cursor-pointer transition-colors hover:bg-slate-800/70 focus-visible:bg-slate-800/70";

export function isValidLeaderboardUsername(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function applyLeaderboardRowClick(
  state: LeaderboardDialogState,
  clickedUsername: unknown,
): LeaderboardDialogState {
  if (!isValidLeaderboardUsername(clickedUsername)) {
    return state;
  }

  return {
    selectedUsername: clickedUsername.trim(),
    open: true,
  };
}

export function applyLeaderboardDialogOpenChange(
  state: LeaderboardDialogState,
  open: boolean,
): LeaderboardDialogState {
  if (open) {
    return {
      ...state,
      open: true,
    };
  }

  return {
    selectedUsername: "",
    open: false,
  };
}
