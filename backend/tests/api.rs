use std::path::Path;

use axum::{
    body::{Body, to_bytes},
    http::{Request, Response, StatusCode, header},
};
use railboard::{AppState, app, railway::RailwayClient, refresher};
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;
use wiremock::{Mock, MockServer, ResponseTemplate, matchers::method};

/// For tests that never reach Railway.
const NO_RAILWAY: &str = "http://127.0.0.1:9";

fn state(db: PgPool, railway_url: &str) -> AppState {
    AppState {
        db,
        railway: RailwayClient::new(railway_url),
    }
}

fn lazy_db() -> PgPool {
    PgPool::connect_lazy("postgres://localhost/unused").unwrap()
}

async fn send(state: AppState, method: &str, uri: &str, body: Option<Value>) -> Response<Body> {
    let static_dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/static");
    let request = Request::builder().method(method).uri(uri);
    let request = match body {
        Some(body) => request
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(body.to_string())),
        None => request.body(Body::empty()),
    };
    app(state, &static_dir)
        .oneshot(request.unwrap())
        .await
        .unwrap()
}

async fn read_json(response: Response<Body>) -> (StatusCode, Value) {
    let status = response.status();
    let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
    (status, serde_json::from_slice(&body).unwrap())
}

async fn get(state: AppState, uri: &str) -> (StatusCode, Value) {
    read_json(send(state, "GET", uri, None).await).await
}

async fn add_user(state: AppState, username: &str) -> (StatusCode, Value) {
    read_json(
        send(
            state,
            "POST",
            "/api/users",
            Some(json!({ "username": username })),
        )
        .await,
    )
    .await
}

async fn mock_profile(railway: &MockServer, total_deploys: i64) {
    railway.reset().await;
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "data": { "userProfile": {
                "totalDeploys": total_deploys,
                "avatar": null,
                "name": "Dave",
                "profile": { "website": "javascript:alert(1)" }
            }}
        })))
        .mount(railway)
        .await;
}

async fn snapshot_totals(db: &PgPool, username: &str) -> Vec<i64> {
    sqlx::query_scalar(
        "SELECT s.total_deploys FROM deployment_snapshots s
         JOIN users u ON u.id = s.user_id
         WHERE u.username = $1 ORDER BY s.id",
    )
    .bind(username)
    .fetch_all(db)
    .await
    .unwrap()
}

fn chart_counts(body: &Value) -> Vec<i64> {
    body["chart"]
        .as_array()
        .unwrap()
        .iter()
        .map(|point| point["count"].as_i64().unwrap())
        .collect()
}

#[sqlx::test(fixtures("users"))]
async fn leaderboard_is_sorted_by_total_deploys(db: PgPool) {
    let (status, body) = get(state(db, NO_RAILWAY), "/api/leaderboard").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body,
        json!([
            { "username": "alice", "totalDeploys": 120 },
            { "username": "bob", "totalDeploys": 50 },
            { "username": "carol", "totalDeploys": 50 },
        ])
    );
}

#[sqlx::test(fixtures("users"))]
async fn platform_stats_compare_this_week_with_last_week(db: PgPool) {
    let (status, body) = get(state(db, NO_RAILWAY), "/api/stats").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body,
        json!({
            "totalDeploysThisWeek": 20,
            "totalDeploysLastWeek": 15,
            "weekOverWeekChange": 33.33,
            "trend": "up",
            "totalTrackedUsers": 3,
        })
    );
}

#[sqlx::test(fixtures("users"))]
async fn user_details_summarize_deploy_history(db: PgPool) {
    let (status, body) = get(state(db.clone(), NO_RAILWAY), "/api/users/alice").await;

    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body["user"],
        json!({
            "username": "alice",
            "totalDeploys": 120,
            "avatar": null,
            "name": "Alice",
            "website": "https://alice.dev",
        })
    );
    let stats = &body["stats"];
    assert_eq!(stats["currentTotalDeploys"], 120);
    assert_eq!(stats["deploysLast24h"], 10);
    assert_eq!(stats["deploysLast7d"], 20);
    assert_eq!(stats["deploysLast30d"], 25);
    assert_eq!(stats["averagePerDayLast30d"], 0.83);
    let deltas: Vec<_> = body["snapshots"]
        .as_array()
        .unwrap()
        .iter()
        .map(|snapshot| snapshot["delta"].as_i64().unwrap())
        .collect();
    assert_eq!(deltas, [0, 5, 10, 10]);

    let counts = chart_counts(&body);
    assert_eq!((counts.len(), counts.iter().sum::<i64>()), (7, 20));
    assert_eq!(
        body["comparison"],
        json!({ "currentPeriod": 20, "previousPeriod": 5, "percentageChange": 300.0, "trend": "up" })
    );

    let (_, body) = get(state(db, NO_RAILWAY), "/api/users/alice?period=30d").await;
    let counts = chart_counts(&body);
    assert_eq!((counts.len(), counts.iter().sum::<i64>()), (30, 25));
    assert_eq!(
        body["comparison"],
        json!({ "currentPeriod": 25, "previousPeriod": 95, "percentageChange": -73.68, "trend": "down" })
    );
}

#[sqlx::test(fixtures("users"))]
async fn user_details_without_history_fall_back_to_the_user(db: PgPool) {
    let (status, body) = get(state(db, NO_RAILWAY), "/api/users/carol").await;

    assert_eq!(status, StatusCode::OK);
    let stats = &body["stats"];
    assert_eq!(stats["currentTotalDeploys"], 50);
    assert_eq!(stats["deploysLast30d"], 0);
    assert_eq!(stats["firstTrackedAt"], stats["lastTrackedAt"]);
    assert_eq!(
        (body["snapshots"].clone(), body["chart"].clone()),
        (json!([]), json!([]))
    );
    assert_eq!(body["comparison"]["trend"], "neutral");
}

#[sqlx::test(fixtures("users"))]
async fn user_details_for_unknown_users_are_not_found(db: PgPool) {
    let (status, body) = get(state(db, NO_RAILWAY), "/api/users/nobody").await;

    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(
        body,
        json!({ "error": "This user is no longer on the leaderboard." })
    );
}

#[sqlx::test(fixtures("users"))]
async fn adding_a_user_validates_the_username(db: PgPool) {
    let state = state(db, NO_RAILWAY);

    assert_eq!(
        add_user(state.clone(), "   ").await,
        (
            StatusCode::BAD_REQUEST,
            json!({ "error": "Username is required" })
        )
    );
    assert_eq!(
        add_user(state, "alice").await,
        (
            StatusCode::CONFLICT,
            json!({ "error": "User already exists on the leaderboard" })
        )
    );
}

#[sqlx::test]
async fn adding_a_user_fetches_their_railway_profile(db: PgPool) {
    let railway = MockServer::start().await;
    mock_profile(&railway, 7).await;

    let (status, body) = add_user(state(db.clone(), &railway.uri()), " dave ").await;

    assert_eq!(status, StatusCode::CREATED);
    assert_eq!(body, json!({ "username": "dave", "totalDeploys": 7 }));
    assert_eq!(snapshot_totals(&db, "dave").await, [7]);
    let (name, website): (Option<String>, Option<String>) =
        sqlx::query_as("SELECT name, website FROM users WHERE username = 'dave'")
            .fetch_one(&db)
            .await
            .unwrap();
    assert_eq!((name.as_deref(), website), (Some("Dave"), None));
}

#[sqlx::test]
async fn adding_an_unknown_railway_user_returns_railways_message(db: PgPool) {
    let railway = MockServer::start().await;
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "errors": [{ "message": "User not found", "path": ["userProfile"] }],
            "data": null
        })))
        .mount(&railway)
        .await;

    assert_eq!(
        add_user(state(db, &railway.uri()), "ghost").await,
        (StatusCode::NOT_FOUND, json!({ "error": "User not found" }))
    );
}

#[sqlx::test]
async fn adding_a_user_while_railway_is_down_is_a_bad_gateway(db: PgPool) {
    let railway = MockServer::start().await;
    Mock::given(method("POST"))
        .respond_with(ResponseTemplate::new(503))
        .mount(&railway)
        .await;

    let (status, body) = add_user(state(db.clone(), &railway.uri()), "dave").await;

    assert_eq!(status, StatusCode::BAD_GATEWAY);
    assert_eq!(
        body,
        json!({ "error": "Something went wrong. Please try again." })
    );
    assert!(snapshot_totals(&db, "dave").await.is_empty());
}

#[sqlx::test]
async fn refreshing_records_a_snapshot_only_when_the_total_changes(db: PgPool) {
    let railway = MockServer::start().await;
    let state = state(db.clone(), &railway.uri());

    for total in [10, 10, 12, 12, 9] {
        mock_profile(&railway, total).await;
        assert_eq!(
            refresher::refresh_user(&state, "erin").await.unwrap(),
            total
        );
    }

    assert_eq!(snapshot_totals(&db, "erin").await, [10, 12, 9]);
}

#[tokio::test]
async fn serves_the_frontend_for_client_side_routes() {
    for uri in ["/", "/users/alice"] {
        let response = send(state(lazy_db(), NO_RAILWAY), "GET", uri, None).await;

        assert_eq!(response.status(), StatusCode::OK);
        assert_eq!(response.headers()[header::CACHE_CONTROL], "no-cache");
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        assert!(String::from_utf8_lossy(&body).contains("railboard test"));
    }
}

#[tokio::test]
async fn unknown_api_routes_and_assets_are_not_found() {
    assert_eq!(
        get(state(lazy_db(), NO_RAILWAY), "/api/nope").await,
        (StatusCode::NOT_FOUND, json!({ "error": "Not found" }))
    );

    let response = send(
        state(lazy_db(), NO_RAILWAY),
        "GET",
        "/assets/missing.js",
        None,
    )
    .await;
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    assert!(!response.headers().contains_key(header::CACHE_CONTROL));
}
