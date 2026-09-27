export function formatPercentage(change: number) {
  if (!Number.isFinite(change)) {
    return "0%";
  }

  const absolute = Math.abs(change);
  const formatted = absolute.toFixed(absolute % 1 === 0 ? 0 : 2);
  const prefix = change > 0 ? "+" : change < 0 ? "-" : "";
  return `${prefix}${formatted}%`;
}

/** "2026-02-21" → "Feb 21" */
export function formatAxisDate(date: string) {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(timestamp: number) {
  return dateTimeFormatter.format(timestamp);
}
