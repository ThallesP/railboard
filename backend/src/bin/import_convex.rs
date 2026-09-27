//! One-off import of the old Convex data. Point it at an unzipped export:
//!
//! ```sh
//! bunx convex export --prod --path convex-export.zip && unzip convex-export.zip -d convex-export
//! cargo run --bin import_convex -- convex-export
//! ```

use std::{collections::HashMap, fs, path::Path};

use anyhow::{Context, bail};
use chrono::{DateTime, Utc};
use railboard::{db, railway::safe_website};
use serde::{Deserialize, de::DeserializeOwned};

const CHUNK_SIZE: usize = 5_000;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConvexUser {
    #[serde(rename = "_id")]
    id: String,
    #[serde(rename = "_creationTime")]
    creation_time: f64,
    username: String,
    total_deploys: f64,
    avatar: Option<String>,
    name: Option<String>,
    website: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConvexDeployment {
    user_id: String,
    total_deploys: f64,
    created_at: f64,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    let dir = std::env::args()
        .nth(1)
        .context("usage: import_convex <unzipped convex export dir>")?;
    let dir = Path::new(&dir);

    let users: Vec<ConvexUser> = read_jsonl(&dir.join("users/documents.jsonl"))?;
    let deployments: Vec<ConvexDeployment> = read_jsonl(&dir.join("deployments/documents.jsonl"))?;

    let database_url = std::env::var("DATABASE_URL").context("DATABASE_URL is required")?;
    let pool = db::connect(&database_url).await?;
    let existing: i64 = sqlx::query_scalar("SELECT count(*) FROM users")
        .fetch_one(&pool)
        .await?;
    if existing > 0 {
        bail!("refusing to import: the users table already has {existing} rows");
    }

    let mut tx = pool.begin().await?;
    let mut ids = HashMap::with_capacity(users.len());
    for user in &users {
        let id: i64 = sqlx::query_scalar(
            "INSERT INTO users (username, total_deploys, avatar, name, website, created_at)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
        )
        .bind(&user.username)
        .bind(user.total_deploys as i64)
        .bind(&user.avatar)
        .bind(&user.name)
        .bind(user.website.clone().and_then(safe_website))
        .bind(to_datetime(user.creation_time))
        .fetch_one(&mut *tx)
        .await?;
        ids.insert(user.id.as_str(), id);
    }

    let snapshots = dedupe(&ids, &deployments);
    for chunk in snapshots.chunks(CHUNK_SIZE) {
        let (user_ids, totals, created_at): (Vec<i64>, Vec<i64>, Vec<DateTime<Utc>>) =
            chunk.iter().copied().fold(
                (Vec::new(), Vec::new(), Vec::new()),
                |(mut user_ids, mut totals, mut created_at), (user_id, total, at)| {
                    user_ids.push(user_id);
                    totals.push(total);
                    created_at.push(at);
                    (user_ids, totals, created_at)
                },
            );
        sqlx::query(
            "INSERT INTO deployment_snapshots (user_id, total_deploys, created_at)
             SELECT * FROM UNNEST($1::bigint[], $2::bigint[], $3::timestamptz[])",
        )
        .bind(user_ids)
        .bind(totals)
        .bind(created_at)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;

    println!(
        "imported {} users and {} snapshots ({} unchanged or orphaned snapshots skipped)",
        users.len(),
        snapshots.len(),
        deployments.len() - snapshots.len()
    );
    Ok(())
}

fn read_jsonl<T: DeserializeOwned>(path: &Path) -> anyhow::Result<Vec<T>> {
    let contents =
        fs::read_to_string(path).with_context(|| format!("failed to read {}", path.display()))?;
    contents
        .lines()
        .filter(|line| !line.trim().is_empty())
        .enumerate()
        .map(|(index, line)| {
            serde_json::from_str(line).with_context(|| {
                format!("{}: invalid document on line {}", path.display(), index + 1)
            })
        })
        .collect()
}

fn to_datetime(millis: f64) -> DateTime<Utc> {
    db::from_millis(millis as i64)
}

/// Snapshots per user in time order, keeping only those where the total changed, as the
/// live refresher does. Snapshots of unknown users are dropped.
fn dedupe(
    ids: &HashMap<&str, i64>,
    deployments: &[ConvexDeployment],
) -> Vec<(i64, i64, DateTime<Utc>)> {
    let mut rows: Vec<(i64, f64, i64)> = deployments
        .iter()
        .filter_map(|deployment| {
            let user_id = *ids.get(deployment.user_id.as_str())?;
            Some((
                user_id,
                deployment.created_at,
                deployment.total_deploys as i64,
            ))
        })
        .collect();
    rows.sort_by(|a, b| a.0.cmp(&b.0).then(a.1.total_cmp(&b.1)));

    let mut previous: Option<(i64, i64)> = None;
    rows.into_iter()
        .filter(|&(user_id, _, total)| previous.replace((user_id, total)) != Some((user_id, total)))
        .map(|(user_id, created_at, total)| (user_id, total, to_datetime(created_at)))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn deployment(user_id: &str, created_at: f64, total_deploys: f64) -> ConvexDeployment {
        ConvexDeployment {
            user_id: user_id.into(),
            total_deploys,
            created_at,
        }
    }

    #[test]
    fn parses_convex_documents() {
        let user: ConvexUser = serde_json::from_str(
            r#"{"_creationTime":1765740000123.456,"_id":"k57abc","avatar":"https://x/a.png","totalDeploys":42,"username":"alice"}"#,
        )
        .unwrap();
        assert_eq!(
            (user.username.as_str(), user.total_deploys as i64),
            ("alice", 42)
        );
        assert_eq!(user.name, None);
        assert_eq!(
            to_datetime(user.creation_time).timestamp_millis(),
            1765740000123
        );

        let deployment: ConvexDeployment = serde_json::from_str(
            r#"{"_creationTime":1.0,"_id":"j9","createdAt":1765740000000,"totalDeploys":42,"userId":"k57abc"}"#,
        )
        .unwrap();
        assert_eq!(deployment.user_id, "k57abc");
    }

    #[test]
    fn drops_unchanged_and_orphaned_snapshots_in_time_order() {
        let ids = HashMap::from([("a", 1), ("b", 2)]);
        let deployments = [
            deployment("a", 3000.0, 12.0),
            deployment("a", 1000.0, 10.0),
            deployment("a", 2000.0, 10.0),
            deployment("b", 1500.0, 10.0),
            deployment("ghost", 1000.0, 99.0),
            deployment("a", 4000.0, 12.0),
            deployment("b", 2500.0, 11.0),
        ];

        let kept: Vec<_> = dedupe(&ids, &deployments)
            .into_iter()
            .map(|(user_id, total, at)| (user_id, total, at.timestamp_millis()))
            .collect();
        assert_eq!(
            kept,
            [(1, 10, 1000), (1, 12, 3000), (2, 10, 1500), (2, 11, 2500)]
        );
    }
}
