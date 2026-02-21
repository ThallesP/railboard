export const PLATFORM_STATS_STALE_TIME_MS = 5 * 60 * 1000;

export function formatWeekOverWeekPercentage(change: number) {
  if (!Number.isFinite(change)) {
    return "0%";
  }

  const absolute = Math.abs(change);
  const formatted = absolute.toFixed(absolute % 1 === 0 ? 0 : 2);

  if (change > 0) {
    return `+${formatted}%`;
  }

  if (change < 0) {
    return `-${formatted}%`;
  }

  return `${formatted}%`;
}
