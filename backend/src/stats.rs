//! Deploy statistics. Railway only reports a user's cumulative deploy count, so
//! activity within a window is the difference between the totals at its edges.
//!
//! Timestamps are Unix epoch milliseconds (UTC). Window baselines are taken 1ms
//! before the window starts, so a snapshot recorded exactly at the start counts
//! towards the window.

use chrono::DateTime;
use serde::Serialize;

pub const DAY_MS: i64 = 24 * 60 * 60 * 1000;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Trend {
    Up,
    Down,
    Neutral,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Comparison {
    pub current_period: i64,
    pub previous_period: i64,
    pub percentage_change: f64,
    pub trend: Trend,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct ChartPoint {
    pub date: String,
    pub count: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlatformStats {
    pub total_deploys_this_week: i64,
    pub total_deploys_last_week: i64,
    pub week_over_week_change: f64,
    pub trend: Trend,
    pub total_tracked_users: usize,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserStats {
    pub first_tracked_at: i64,
    pub last_tracked_at: i64,
    pub current_total_deploys: i64,
    pub deploys_last_24h: i64,
    pub deploys_last_7d: i64,
    pub deploys_last_30d: i64,
    pub average_per_day_last_30d: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SnapshotDelta {
    pub created_at: i64,
    pub total_deploys: i64,
    pub delta: i64,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Snapshot {
    pub at: i64,
    pub total: i64,
}

pub fn to_iso_date_utc(timestamp: i64) -> String {
    DateTime::from_timestamp_millis(timestamp)
        .map(|date| date.format("%Y-%m-%d").to_string())
        .unwrap_or_default()
}

pub fn start_of_utc_day(timestamp: i64) -> i64 {
    timestamp - timestamp.rem_euclid(DAY_MS)
}

/// The last `days` UTC days, today included: `[start of first day, end of today]`.
pub struct DayRange {
    pub start: i64,
    pub end: i64,
}

pub fn day_range(now: i64, days: i64) -> DayRange {
    let today = start_of_utc_day(now);
    DayRange {
        start: today - (days - 1) * DAY_MS,
        end: today + DAY_MS - 1,
    }
}

pub fn resolve_trend(current: i64, previous: i64) -> Trend {
    match current.cmp(&previous) {
        std::cmp::Ordering::Greater => Trend::Up,
        std::cmp::Ordering::Less => Trend::Down,
        std::cmp::Ordering::Equal => Trend::Neutral,
    }
}

pub fn percentage_change(current: i64, previous: i64) -> f64 {
    if previous == 0 {
        return if current == 0 { 0.0 } else { 100.0 };
    }
    round2((current - previous) as f64 / previous as f64 * 100.0)
}

pub fn comparison(current: i64, previous: i64) -> Comparison {
    Comparison {
        current_period: current,
        previous_period: previous,
        percentage_change: percentage_change(current, previous),
        trend: resolve_trend(current, previous),
    }
}

/// Turns end-of-day cumulative totals into per-day deploy counts.
pub fn chart_from_cumulative(
    start_day: i64,
    cumulative_by_day_end: &[i64],
    cumulative_before_range: i64,
) -> Vec<ChartPoint> {
    let mut previous = cumulative_before_range;
    cumulative_by_day_end
        .iter()
        .zip(0..)
        .map(|(&total, index)| {
            let count = (total - previous).max(0);
            previous = total;
            ChartPoint {
                date: to_iso_date_utc(start_day + DAY_MS * index),
                count,
            }
        })
        .collect()
}

/// The instants every user's total is needed at for [`platform_week_stats`]:
/// the end of today, and just before this week and last week start.
pub fn platform_week_boundaries(now: i64) -> [i64; 3] {
    let week = day_range(now, 7);
    [week.end, week.start - 1, week.start - 7 * DAY_MS - 1]
}

/// Aggregates each user's totals at the [`platform_week_boundaries`].
pub fn platform_week_stats(totals: &[[i64; 3]]) -> PlatformStats {
    let (this_week, last_week) = totals.iter().fold(
        (0, 0),
        |(this_week, last_week), &[end, week_start, last_week_start]| {
            (
                this_week + (end - week_start).max(0),
                last_week + (week_start - last_week_start).max(0),
            )
        },
    );
    let comparison = comparison(this_week, last_week);

    PlatformStats {
        total_deploys_this_week: this_week,
        total_deploys_last_week: last_week,
        week_over_week_change: comparison.percentage_change,
        trend: comparison.trend,
        total_tracked_users: totals.len(),
    }
}

/// One user's deploy history, oldest snapshot first.
pub struct Timeline(Vec<Snapshot>);

impl Timeline {
    pub fn new(mut snapshots: Vec<Snapshot>) -> Self {
        snapshots.sort_by_key(|snapshot| snapshot.at);
        Self(snapshots)
    }

    /// The total of the latest snapshot at or before `timestamp`, 0 before the first one.
    pub fn total_at(&self, timestamp: i64) -> i64 {
        let after = self.0.partition_point(|snapshot| snapshot.at <= timestamp);
        after.checked_sub(1).map_or(0, |index| self.0[index].total)
    }

    pub fn delta_since(&self, now: i64, since: i64) -> i64 {
        (self.total_at(now) - self.total_at(since - 1)).max(0)
    }

    /// Deploys in the last `period_days` compared with the period before that.
    pub fn comparison(&self, now: i64, period_days: i64) -> Comparison {
        let period = period_days * DAY_MS;
        let boundary = self.total_at(now - period - 1);
        comparison(
            (self.total_at(now) - boundary).max(0),
            (boundary - self.total_at(now - 2 * period - 1)).max(0),
        )
    }

    /// Deploys per UTC day for the last `days` days; empty when there is no history.
    pub fn daily_chart(&self, now: i64, days: i64) -> Vec<ChartPoint> {
        if self.0.is_empty() {
            return Vec::new();
        }
        let range = day_range(now, days);
        let day_ends: Vec<i64> = (1..=days)
            .map(|day| self.total_at(range.start + DAY_MS * day - 1))
            .collect();
        chart_from_cumulative(range.start, &day_ends, self.total_at(range.start - 1))
    }

    /// `None` when there is no history yet.
    pub fn stats(&self, now: i64) -> Option<UserStats> {
        let (first, last) = (self.0.first()?, self.0.last()?);
        let deploys_last_30d = self.delta_since(now, now - 30 * DAY_MS);

        Some(UserStats {
            first_tracked_at: first.at,
            last_tracked_at: last.at,
            current_total_deploys: last.total,
            deploys_last_24h: self.delta_since(now, now - DAY_MS),
            deploys_last_7d: self.delta_since(now, now - 7 * DAY_MS),
            deploys_last_30d,
            average_per_day_last_30d: round2(deploys_last_30d as f64 / 30.0),
        })
    }

    /// The latest `limit` snapshots, oldest first, each with its increase over the one before.
    pub fn recent(&self, limit: usize) -> Vec<SnapshotDelta> {
        let skip = self.0.len().saturating_sub(limit);
        self.0
            .iter()
            .enumerate()
            .skip(skip)
            .map(|(index, snapshot)| SnapshotDelta {
                created_at: snapshot.at,
                total_deploys: snapshot.total,
                delta: index.checked_sub(1).map_or(0, |previous| {
                    (snapshot.total - self.0[previous].total).max(0)
                }),
            })
            .collect()
    }
}

fn round2(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use chrono::{TimeZone, Utc};

    use super::*;

    fn utc(year: i32, month: u32, day: u32, hour: u32, min: u32, sec: u32) -> i64 {
        Utc.with_ymd_and_hms(year, month, day, hour, min, sec)
            .unwrap()
            .timestamp_millis()
    }

    fn timeline(points: &[(i64, i64)]) -> Timeline {
        Timeline::new(
            points
                .iter()
                .map(|&(at, total)| Snapshot { at, total })
                .collect(),
        )
    }

    fn counts(points: &[ChartPoint]) -> Vec<i64> {
        points.iter().map(|point| point.count).collect()
    }

    #[test]
    fn builds_daily_chart_data_from_cumulative_snapshots() {
        let result = chart_from_cumulative(utc(2026, 2, 1, 0, 0, 0), &[10, 12, 18], 8);

        let expected = [("2026-02-01", 2), ("2026-02-02", 2), ("2026-02-03", 6)];
        assert_eq!(
            result,
            expected.map(|(date, count)| ChartPoint {
                date: date.into(),
                count
            })
        );
    }

    #[test]
    fn handles_missing_chart_snapshots_with_zero_deltas() {
        let result = chart_from_cumulative(utc(2026, 2, 10, 0, 0, 0), &[5, 5, 5], 5);
        assert_eq!(counts(&result), [0, 0, 0]);
    }

    #[test]
    fn returns_empty_chart_data_when_there_are_no_snapshots() {
        assert!(chart_from_cumulative(utc(2026, 2, 1, 0, 0, 0), &[], 0).is_empty());
        assert!(
            timeline(&[])
                .daily_chart(utc(2026, 2, 1, 0, 0, 0), 7)
                .is_empty()
        );
    }

    #[test]
    fn caps_negative_deltas_at_zero() {
        let result = chart_from_cumulative(utc(2026, 2, 1, 0, 0, 0), &[10, 8, 12], 9);
        assert_eq!(counts(&result), [1, 0, 4]);
    }

    #[test]
    fn calculates_percentage_change_for_growth_and_decline() {
        assert_eq!(percentage_change(20, 10), 100.0);
        assert_eq!(percentage_change(5, 10), -50.0);
        assert_eq!(percentage_change(10, 10), 0.0);
    }

    #[test]
    fn handles_zero_previous_value_in_percentage_calculations() {
        assert_eq!(percentage_change(0, 0), 0.0);
        assert_eq!(percentage_change(3, 0), 100.0);
    }

    #[test]
    fn resolves_trend_direction() {
        assert_eq!(resolve_trend(10, 9), Trend::Up);
        assert_eq!(resolve_trend(9, 10), Trend::Down);
        assert_eq!(resolve_trend(10, 10), Trend::Neutral);
    }

    #[test]
    fn creates_complete_comparison_stats() {
        assert_eq!(
            comparison(12, 6),
            Comparison {
                current_period: 12,
                previous_period: 6,
                percentage_change: 100.0,
                trend: Trend::Up,
            }
        );
    }

    #[test]
    fn returns_iso_dates() {
        assert_eq!(to_iso_date_utc(utc(2026, 11, 5, 13, 45, 10)), "2026-11-05");
    }

    #[test]
    fn calculates_start_of_utc_day_and_day_ranges() {
        let now = utc(2026, 2, 21, 18, 12, 0);
        assert_eq!(start_of_utc_day(now), utc(2026, 2, 21, 0, 0, 0));

        let range = day_range(now, 7);
        assert_eq!(range.start, utc(2026, 2, 15, 0, 0, 0));
        assert_eq!(range.end, utc(2026, 2, 21, 23, 59, 59) + 999);
    }

    #[test]
    fn computes_deploy_delta_using_boundary_exclusive_baseline() {
        let now = utc(2026, 2, 21, 12, 0, 0);
        let since = now - 7 * DAY_MS;
        let history = timeline(&[(since - 1, 10), (since, 12), (now, 25)]);

        assert_eq!(history.delta_since(now, since), 15);
    }

    #[test]
    fn computes_period_comparison_with_correct_previous_period_totals() {
        let now = utc(2026, 2, 21, 12, 0, 0);
        let history = timeline(&[
            (now - 14 * DAY_MS - 1, 14),
            (now - 7 * DAY_MS - 1, 20),
            (now, 30),
        ]);

        assert_eq!(
            history.comparison(now, 7),
            Comparison {
                current_period: 10,
                previous_period: 6,
                percentage_change: 66.67,
                trend: Trend::Up,
            }
        );
    }

    #[test]
    fn computes_platform_weekly_stats_across_multiple_users() {
        let now = utc(2026, 2, 21, 12, 0, 0);
        let range = day_range(now, 7);
        assert_eq!(
            platform_week_boundaries(now),
            [range.end, range.start - 1, range.start - 7 * DAY_MS - 1]
        );

        assert_eq!(
            platform_week_stats(&[[20, 15, 10], [8, 8, 3]]),
            PlatformStats {
                total_deploys_this_week: 5,
                total_deploys_last_week: 10,
                week_over_week_change: -50.0,
                trend: Trend::Down,
                total_tracked_users: 2,
            }
        );
    }

    #[test]
    fn returns_zeroed_platform_stats_when_there_are_no_users() {
        assert_eq!(
            platform_week_stats(&[]),
            PlatformStats {
                total_deploys_this_week: 0,
                total_deploys_last_week: 0,
                week_over_week_change: 0.0,
                trend: Trend::Neutral,
                total_tracked_users: 0,
            }
        );
    }

    #[test]
    fn totals_step_between_snapshots() {
        let history = timeline(&[(100, 5), (200, 9)]);

        assert_eq!(history.total_at(99), 0);
        assert_eq!(history.total_at(100), 5);
        assert_eq!(history.total_at(199), 5);
        assert_eq!(history.total_at(500), 9);
    }

    #[test]
    fn builds_daily_chart_from_history() {
        let now = utc(2026, 2, 21, 12, 0, 0);
        let history = timeline(&[
            (utc(2026, 2, 10, 9, 0, 0), 100),
            (utc(2026, 2, 16, 9, 0, 0), 103),
            (utc(2026, 2, 21, 9, 0, 0), 110),
        ]);

        let chart = history.daily_chart(now, 7);
        assert_eq!(chart.first().unwrap().date, "2026-02-15");
        assert_eq!(chart.last().unwrap().date, "2026-02-21");
        assert_eq!(counts(&chart), [0, 3, 0, 0, 0, 0, 7]);
    }

    #[test]
    fn summarizes_user_stats() {
        let now = utc(2026, 2, 21, 12, 0, 0);
        let first = now - 40 * DAY_MS;
        let history = timeline(&[
            (first, 100),
            (now - 10 * DAY_MS, 110),
            (now - 3 * DAY_MS, 118),
            (now - 60 * 60 * 1000, 120),
        ]);

        assert_eq!(
            history.stats(now),
            Some(UserStats {
                first_tracked_at: first,
                last_tracked_at: now - 60 * 60 * 1000,
                current_total_deploys: 120,
                deploys_last_24h: 2,
                deploys_last_7d: 10,
                deploys_last_30d: 20,
                average_per_day_last_30d: 0.67,
            })
        );
        assert_eq!(timeline(&[]).stats(now), None);
    }

    #[test]
    fn lists_recent_snapshots_with_deltas_against_the_previous_snapshot() {
        let history = timeline(&[(1, 10), (2, 15), (3, 12), (4, 20)]);

        let recent = history.recent(3);
        let deltas: Vec<_> = recent.iter().map(|s| (s.created_at, s.delta)).collect();
        assert_eq!(deltas, [(2, 5), (3, 0), (4, 8)]);
        assert_eq!(history.recent(10)[0].delta, 0);
    }
}
