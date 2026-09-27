export type Trend = "up" | "down" | "neutral";

export type LeaderboardEntry = {
  username: string;
  totalDeploys: number;
};

export type PlatformStats = {
  totalDeploysThisWeek: number;
  totalDeploysLastWeek: number;
  weekOverWeekChange: number;
  trend: Trend;
  totalTrackedUsers: number;
};

export type Period = "7d" | "30d";

export type Comparison = {
  currentPeriod: number;
  previousPeriod: number;
  percentageChange: number;
  trend: Trend;
};

export type ChartPoint = {
  date: string;
  count: number;
};

export type UserDetails = {
  user: {
    username: string;
    totalDeploys: number;
    avatar: string | null;
    name: string | null;
    website: string | null;
  };
  stats: {
    firstTrackedAt: number;
    lastTrackedAt: number;
    currentTotalDeploys: number;
    deploysLast24h: number;
    deploysLast7d: number;
    deploysLast30d: number;
    averagePerDayLast30d: number;
  };
  snapshots: { createdAt: number; totalDeploys: number; delta: number }[];
  chart: ChartPoint[];
  comparison: Comparison;
};

export type AddedUser = {
  username: string;
  totalDeploys: number;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(body?.error ?? response.statusText, response.status);
  }
  return body as T;
}

export const api = {
  leaderboard: () => request<LeaderboardEntry[]>("/leaderboard"),
  stats: () => request<PlatformStats>("/stats"),
  user: (username: string, period: Period) =>
    request<UserDetails>(`/users/${encodeURIComponent(username)}?period=${period}`),
  addUser: (username: string) =>
    request<AddedUser>("/users", { method: "POST", body: JSON.stringify({ username }) }),
};
