use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};

use crate::{
    AppState,
    db::{self, User},
    error::AppError,
    refresher,
    stats::{ChartPoint, Comparison, SnapshotDelta, Timeline, UserStats},
};

const RECENT_SNAPSHOTS: usize = 60;

#[derive(Deserialize)]
pub struct NewUser {
    username: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AddedUser {
    username: String,
    total_deploys: i64,
}

pub async fn add(
    State(state): State<AppState>,
    Json(body): Json<NewUser>,
) -> Result<(StatusCode, Json<AddedUser>), AppError> {
    let username = body.username.trim();
    if username.is_empty() {
        return Err(AppError::BadRequest("Username is required"));
    }
    if db::user_exists(&state.db, username).await? {
        return Err(AppError::Conflict("User already exists on the leaderboard"));
    }

    let total_deploys = refresher::refresh_user(&state, username).await?;

    Ok((
        StatusCode::CREATED,
        Json(AddedUser {
            username: username.to_owned(),
            total_deploys,
        }),
    ))
}

#[derive(Clone, Copy, Default, Deserialize)]
pub enum Period {
    #[default]
    #[serde(rename = "7d")]
    Week,
    #[serde(rename = "30d")]
    Month,
}

impl Period {
    fn days(self) -> i64 {
        match self {
            Self::Week => 7,
            Self::Month => 30,
        }
    }
}

#[derive(Deserialize)]
pub struct DetailsQuery {
    #[serde(default)]
    period: Period,
}

#[derive(Serialize)]
pub struct UserDetails {
    user: User,
    stats: UserStats,
    snapshots: Vec<SnapshotDelta>,
    chart: Vec<ChartPoint>,
    comparison: Comparison,
}

pub async fn details(
    State(state): State<AppState>,
    Path(username): Path<String>,
    Query(query): Query<DetailsQuery>,
) -> Result<Json<UserDetails>, AppError> {
    let user = db::user_by_username(&state.db, &username)
        .await?
        .ok_or_else(|| AppError::NotFound("This user is no longer on the leaderboard.".into()))?;
    let timeline = Timeline::new(db::snapshots(&state.db, user.id).await?);
    let now = Utc::now().timestamp_millis();
    let days = query.period.days();

    let stats = timeline.stats(now).unwrap_or_else(|| {
        let created_at = user.created_at.timestamp_millis();
        UserStats {
            first_tracked_at: created_at,
            last_tracked_at: created_at,
            current_total_deploys: user.total_deploys,
            ..UserStats::default()
        }
    });

    Ok(Json(UserDetails {
        stats,
        snapshots: timeline.recent(RECENT_SNAPSHOTS),
        chart: timeline.daily_chart(now, days),
        comparison: timeline.comparison(now, days),
        user,
    }))
}
