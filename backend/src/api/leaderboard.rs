use axum::{Json, extract::State};
use chrono::Utc;

use crate::{
    AppState,
    db::{self, LeaderboardEntry},
    error::AppError,
    stats::{self, PlatformStats},
};

pub async fn list(State(state): State<AppState>) -> Result<Json<Vec<LeaderboardEntry>>, AppError> {
    Ok(Json(db::leaderboard(&state.db).await?))
}

pub async fn stats(State(state): State<AppState>) -> Result<Json<PlatformStats>, AppError> {
    let boundaries = stats::platform_week_boundaries(Utc::now().timestamp_millis());
    let totals = db::totals_at(&state.db, boundaries).await?;
    Ok(Json(stats::platform_week_stats(&totals)))
}
