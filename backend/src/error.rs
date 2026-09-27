use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;

use crate::railway::RailwayError;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("{0}")]
    BadRequest(&'static str),
    #[error("{0}")]
    NotFound(String),
    #[error("{0}")]
    Conflict(&'static str),
    #[error(transparent)]
    Railway(#[from] RailwayError),
    #[error(transparent)]
    Database(#[from] sqlx::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match &self {
            Self::BadRequest(_) => StatusCode::BAD_REQUEST,
            Self::NotFound(_) | Self::Railway(RailwayError::NotFound(_)) => StatusCode::NOT_FOUND,
            Self::Conflict(_) => StatusCode::CONFLICT,
            Self::Railway(RailwayError::Request(_)) => StatusCode::BAD_GATEWAY,
            Self::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };

        // Don't leak internals: server-side failures get logged and a generic message.
        let message = if status.is_server_error() {
            tracing::error!(error = ?self, "request failed");
            "Something went wrong. Please try again.".to_string()
        } else {
            self.to_string()
        };

        (status, Json(json!({ "error": message }))).into_response()
    }
}
