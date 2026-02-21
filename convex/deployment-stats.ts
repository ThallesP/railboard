export type TrendDirection = "up" | "down" | "neutral";

export type ComparisonStats = {
  currentPeriod: number;
  previousPeriod: number;
  percentageChange: number;
  trend: TrendDirection;
};

export type DeploymentChartData = {
  date: string;
  count: number;
  delta: number;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function toIsoDateUtc(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function startOfUtcDay(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function resolveTrend(
  currentPeriod: number,
  previousPeriod: number,
): TrendDirection {
  if (currentPeriod > previousPeriod) {
    return "up";
  }

  if (currentPeriod < previousPeriod) {
    return "down";
  }

  return "neutral";
}

export function calculatePercentageChange(
  currentPeriod: number,
  previousPeriod: number,
) {
  if (previousPeriod === 0) {
    if (currentPeriod === 0) {
      return 0;
    }
    return 100;
  }

  return Number(
    (((currentPeriod - previousPeriod) / previousPeriod) * 100).toFixed(2),
  );
}

export function createComparisonStats(
  currentPeriod: number,
  previousPeriod: number,
): ComparisonStats {
  return {
    currentPeriod,
    previousPeriod,
    percentageChange: calculatePercentageChange(currentPeriod, previousPeriod),
    trend: resolveTrend(currentPeriod, previousPeriod),
  };
}

export function buildChartDataFromCumulativeSnapshots(
  startDayTimestamp: number,
  cumulativeByDayEnd: number[],
  cumulativeBeforeRange: number,
): DeploymentChartData[] {
  if (cumulativeByDayEnd.length === 0) {
    return [];
  }

  return cumulativeByDayEnd.map((cumulativeTotal, index) => {
    const previousCumulative =
      index === 0 ? cumulativeBeforeRange : cumulativeByDayEnd[index - 1];
    const dailyDelta = Math.max(0, cumulativeTotal - previousCumulative);

    return {
      date: toIsoDateUtc(startDayTimestamp + DAY_IN_MS * index),
      count: dailyDelta,
      delta: dailyDelta,
    };
  });
}

export function createDayRange(now: number, days: number) {
  const todayStart = startOfUtcDay(now);
  const start = todayStart - (days - 1) * DAY_IN_MS;
  const end = todayStart + DAY_IN_MS - 1;

  return {
    start,
    end,
    dayInMs: DAY_IN_MS,
  };
}

export async function computeDeployDeltaSince(
  getCumulativeAt: (timestamp: number) => Promise<number>,
  now: number,
  since: number,
) {
  const [currentTotal, previousTotal] = await Promise.all([
    getCumulativeAt(now),
    getCumulativeAt(since - 1),
  ]);

  return Math.max(0, currentTotal - previousTotal);
}

export async function computeComparisonForPeriod(
  getCumulativeAt: (timestamp: number) => Promise<number>,
  now: number,
  periodDays: number,
) {
  const periodMs = periodDays * DAY_IN_MS;
  const [currentPeriodTotal, previousPeriodBoundaryTotal, previousStartTotal] =
    await Promise.all([
      getCumulativeAt(now),
      getCumulativeAt(now - periodMs - 1),
      getCumulativeAt(now - periodMs * 2 - 1),
    ]);

  const currentPeriod = Math.max(
    0,
    currentPeriodTotal - previousPeriodBoundaryTotal,
  );
  const previousPeriod = Math.max(
    0,
    previousPeriodBoundaryTotal - previousStartTotal,
  );

  return createComparisonStats(currentPeriod, previousPeriod);
}

export async function computePlatformWeekStats(
  userIds: string[],
  getCumulativeAt: (userId: string, timestamp: number) => Promise<number>,
  now: number,
) {
  const { start, end, dayInMs } = createDayRange(now, 7);
  const previousStart = start - 7 * dayInMs;

  const totalsByUser = await Promise.all(
    userIds.map(async (userId) => {
      const [currentTotal, previousWeekBoundaryTotal, previousStartTotal] =
        await Promise.all([
          getCumulativeAt(userId, end),
          getCumulativeAt(userId, start - 1),
          getCumulativeAt(userId, previousStart - 1),
        ]);

      return {
        thisWeek: Math.max(0, currentTotal - previousWeekBoundaryTotal),
        lastWeek: Math.max(0, previousWeekBoundaryTotal - previousStartTotal),
      };
    }),
  );

  const totalDeploysThisWeek = totalsByUser.reduce(
    (sum, total) => sum + total.thisWeek,
    0,
  );
  const totalDeploysLastWeek = totalsByUser.reduce(
    (sum, total) => sum + total.lastWeek,
    0,
  );
  const comparison = createComparisonStats(
    totalDeploysThisWeek,
    totalDeploysLastWeek,
  );

  return {
    totalDeploysThisWeek,
    totalDeploysLastWeek,
    weekOverWeekChange: comparison.percentageChange,
    trend: comparison.trend,
    totalTrackedUsers: userIds.length,
  };
}
