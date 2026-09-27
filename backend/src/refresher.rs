use std::time::Duration;

use backon::{ExponentialBuilder, Retryable};
use tokio::time::MissedTickBehavior;

use crate::{AppState, db, error::AppError, railway::RailwayError};

const REFRESH_INTERVAL: Duration = Duration::from_secs(60 * 60);

/// Fetches the user's profile from Railway and stores it. Returns their deploy total.
pub async fn refresh_user(state: &AppState, username: &str) -> Result<i64, AppError> {
    let profile = state.railway.fetch_profile(username).await?;
    db::save_profile(&state.db, username, &profile).await?;
    Ok(profile.total_deploys)
}

/// Refreshes every tracked user at startup and then hourly.
pub async fn run(state: AppState) {
    let mut interval = tokio::time::interval(REFRESH_INTERVAL);
    interval.set_missed_tick_behavior(MissedTickBehavior::Delay);

    loop {
        interval.tick().await;
        refresh_all(&state).await;
    }
}

async fn refresh_all(state: &AppState) {
    let usernames = match db::usernames(&state.db).await {
        Ok(usernames) => usernames,
        Err(error) => {
            tracing::error!(%error, "failed to list users to refresh");
            return;
        }
    };

    // One user at a time to stay gentle on Railway's API.
    let mut failed = 0;
    for username in &usernames {
        let result = async {
            let profile = (|| state.railway.fetch_profile(username))
                .retry(ExponentialBuilder::default().with_max_times(2))
                .when(RailwayError::is_transient)
                .await?;
            db::save_profile(&state.db, username, &profile).await?;
            Ok::<_, AppError>(())
        }
        .await;

        if let Err(error) = result {
            failed += 1;
            tracing::warn!(%username, %error, "failed to refresh user");
        }
    }

    tracing::info!(users = usernames.len(), failed, "refreshed users");
}
