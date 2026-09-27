pub mod api;
pub mod config;
pub mod db;
pub mod error;
pub mod railway;
pub mod refresher;
pub mod stats;

use std::path::Path;

use axum::{
    Router,
    http::{HeaderValue, Response, header::CACHE_CONTROL},
};
use sqlx::PgPool;
use tower_http::{
    compression::CompressionLayer,
    services::{ServeDir, ServeFile},
    set_header::SetResponseHeader,
    trace::TraceLayer,
};

use crate::railway::RailwayClient;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub railway: RailwayClient,
}

/// The JSON API under `/api`, plus the built frontend in `static_dir` for everything else.
pub fn app(state: AppState, static_dir: &Path) -> Router {
    // Vite fingerprints everything under /assets, so those files never change.
    let assets = SetResponseHeader::overriding(
        ServeDir::new(static_dir.join("assets")),
        CACHE_CONTROL,
        |response: &Response<_>| {
            response
                .status()
                .is_success()
                .then(|| HeaderValue::from_static("public, max-age=31536000, immutable"))
        },
    );
    // Any other path is a client-side route: serve index.html and let the router take over.
    let spa = SetResponseHeader::overriding(
        ServeDir::new(static_dir).fallback(ServeFile::new(static_dir.join("index.html"))),
        CACHE_CONTROL,
        HeaderValue::from_static("no-cache"),
    );

    Router::new()
        .nest("/api", api::router())
        .nest_service("/assets", assets)
        .fallback_service(spa)
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
