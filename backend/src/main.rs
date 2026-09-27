use railboard::{
    AppState, app,
    config::Config,
    db,
    railway::{RAILWAY_GRAPHQL_URL, RailwayClient},
    refresher,
};
use tokio::{
    net::TcpListener,
    signal::unix::{SignalKind, signal},
};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let config = Config::from_env()?;
    let state = AppState {
        db: db::connect(&config.database_url).await?,
        railway: RailwayClient::new(RAILWAY_GRAPHQL_URL),
    };

    tokio::spawn(refresher::run(state.clone()));

    let listener = TcpListener::bind(("0.0.0.0", config.port)).await?;
    tracing::info!("listening on http://{}", listener.local_addr()?);
    axum::serve(listener, app(state, &config.static_dir))
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let mut terminate = signal(SignalKind::terminate()).expect("failed to listen for SIGTERM");
    tokio::select! {
        _ = tokio::signal::ctrl_c() => {}
        _ = terminate.recv() => {}
    }
}
