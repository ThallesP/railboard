export type UserDetailsChartPeriod = "7d" | "30d";

export const DEFAULT_USER_DETAILS_PERIOD: UserDetailsChartPeriod = "7d";

type BuildUserDetailsQueryArgsInput = {
  username: string;
  now: number;
  period: UserDetailsChartPeriod;
  limit?: number;
};

export function buildUserDetailsQueryArgs({
  username,
  now,
  period,
  limit = 60,
}: BuildUserDetailsQueryArgsInput) {
  return {
    username,
    now,
    limit,
    period,
  };
}

export function getResetPeriodForDialog(nextOpen: boolean) {
  return nextOpen ? null : DEFAULT_USER_DETAILS_PERIOD;
}

export function getWeekOverWeekTitle(period: UserDetailsChartPeriod) {
  return period === "7d" ? "Week-over-week (7d)" : "Week-over-week (30d)";
}

export function buildChartDataByPeriod(
  period: UserDetailsChartPeriod,
  chartData: { date: string; count: number; delta: number }[] | undefined,
) {
  return {
    last7d: period === "7d" ? (chartData ?? []) : [],
    last30d: period === "30d" ? (chartData ?? []) : [],
  };
}
