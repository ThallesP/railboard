mod leaderboard;
mod users;

use axum::{
    Router,
    routing::{get, post},
};

use crate::{AppState, error::AppError};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/leaderboard", get(leaderboard::list))
        .route("/stats", get(leaderboard::stats))
        .route("/users", post(users::add))
        .route("/users/{username}", get(users::details))
        .fallback(|| async { AppError::NotFound("Not found".into()) })
}
