use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::{FromRow, PgPool, postgres::PgPoolOptions};

use crate::{railway::Profile, stats::Snapshot};

pub async fn connect(database_url: &str) -> sqlx::Result<PgPool> {
    let pool = PgPoolOptions::new().connect(database_url).await?;
    sqlx::migrate!().run(&pool).await?;
    Ok(pool)
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LeaderboardEntry {
    pub username: String,
    pub total_deploys: i64,
}

#[derive(Debug, FromRow, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    #[serde(skip)]
    pub id: i64,
    pub username: String,
    pub total_deploys: i64,
    pub avatar: Option<String>,
    pub name: Option<String>,
    pub website: Option<String>,
    #[serde(skip)]
    pub created_at: DateTime<Utc>,
}

pub async fn leaderboard(db: &PgPool) -> sqlx::Result<Vec<LeaderboardEntry>> {
    sqlx::query_as("SELECT username, total_deploys FROM users ORDER BY total_deploys DESC, id")
        .fetch_all(db)
        .await
}

pub async fn usernames(db: &PgPool) -> sqlx::Result<Vec<String>> {
    sqlx::query_scalar("SELECT username FROM users ORDER BY id")
        .fetch_all(db)
        .await
}

pub async fn user_exists(db: &PgPool, username: &str) -> sqlx::Result<bool> {
    sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM users WHERE username = $1)")
        .bind(username)
        .fetch_one(db)
        .await
}

pub async fn user_by_username(db: &PgPool, username: &str) -> sqlx::Result<Option<User>> {
    sqlx::query_as(
        "SELECT id, username, total_deploys, avatar, name, website, created_at
         FROM users WHERE username = $1",
    )
    .bind(username)
    .fetch_optional(db)
    .await
}

pub async fn snapshots(db: &PgPool, user_id: i64) -> sqlx::Result<Vec<Snapshot>> {
    let rows: Vec<(DateTime<Utc>, i64)> = sqlx::query_as(
        "SELECT created_at, total_deploys FROM deployment_snapshots
         WHERE user_id = $1 ORDER BY created_at",
    )
    .bind(user_id)
    .fetch_all(db)
    .await?;

    Ok(rows
        .into_iter()
        .map(|(created_at, total)| Snapshot {
            at: created_at.timestamp_millis(),
            total,
        })
        .collect())
}

/// Every user's deploy total as of each of the given instants (epoch ms).
pub async fn totals_at(db: &PgPool, [a, b, c]: [i64; 3]) -> sqlx::Result<Vec<[i64; 3]>> {
    let rows: Vec<(i64, i64, i64)> = sqlx::query_as(
        "SELECT
            COALESCE((SELECT s.total_deploys FROM deployment_snapshots s
                      WHERE s.user_id = u.id AND s.created_at <= $1
                      ORDER BY s.created_at DESC LIMIT 1), 0),
            COALESCE((SELECT s.total_deploys FROM deployment_snapshots s
                      WHERE s.user_id = u.id AND s.created_at <= $2
                      ORDER BY s.created_at DESC LIMIT 1), 0),
            COALESCE((SELECT s.total_deploys FROM deployment_snapshots s
                      WHERE s.user_id = u.id AND s.created_at <= $3
                      ORDER BY s.created_at DESC LIMIT 1), 0)
         FROM users u",
    )
    .bind(from_millis(a))
    .bind(from_millis(b))
    .bind(from_millis(c))
    .fetch_all(db)
    .await?;

    Ok(rows.into_iter().map(|(a, b, c)| [a, b, c]).collect())
}

/// Upserts the user and records a snapshot, unless their total is unchanged.
pub async fn save_profile(db: &PgPool, username: &str, profile: &Profile) -> sqlx::Result<()> {
    // Every CTE reads the same snapshot, so `previous` sees the row as it was before the upsert.
    sqlx::query(
        "WITH previous AS (
            SELECT total_deploys FROM users WHERE username = $1
        ), saved AS (
            INSERT INTO users (username, total_deploys, avatar, name, website)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (username) DO UPDATE SET
                total_deploys = EXCLUDED.total_deploys,
                avatar = EXCLUDED.avatar,
                name = EXCLUDED.name,
                website = EXCLUDED.website
            RETURNING id
        )
        INSERT INTO deployment_snapshots (user_id, total_deploys)
        SELECT id, $2 FROM saved
        WHERE NOT EXISTS (SELECT 1 FROM previous WHERE total_deploys = $2)",
    )
    .bind(username)
    .bind(profile.total_deploys)
    .bind(&profile.avatar)
    .bind(&profile.name)
    .bind(&profile.website)
    .execute(db)
    .await?;

    Ok(())
}

pub fn from_millis(timestamp: i64) -> DateTime<Utc> {
    DateTime::from_timestamp_millis(timestamp).unwrap_or_default()
}
