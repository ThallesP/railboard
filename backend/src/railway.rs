use std::time::Duration;

use serde::Deserialize;
use serde_json::json;

pub const RAILWAY_GRAPHQL_URL: &str = "https://backboard.railway.com/graphql/v2";

const USER_PROFILE_QUERY: &str = "query GetUserProfile($username: String!) {
  userProfile(username: $username) {
    totalDeploys
    avatar
    name
    profile {
      website
    }
  }
}";

#[derive(Debug, Clone, PartialEq)]
pub struct Profile {
    pub total_deploys: i64,
    pub avatar: Option<String>,
    pub name: Option<String>,
    pub website: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum RailwayError {
    /// Railway answered but has no public profile under that username.
    #[error("{0}")]
    NotFound(String),
    #[error("failed to reach Railway: {0}")]
    Request(#[from] reqwest::Error),
}

impl RailwayError {
    /// Worth retrying: the request failed rather than Railway saying no.
    pub fn is_transient(&self) -> bool {
        matches!(self, Self::Request(_))
    }
}

#[derive(Clone)]
pub struct RailwayClient {
    http: reqwest::Client,
    endpoint: String,
}

impl RailwayClient {
    pub fn new(endpoint: impl Into<String>) -> Self {
        let http = reqwest::Client::builder()
            .user_agent("Railboard/1.0.0 (contato@thalles.me)")
            .timeout(Duration::from_secs(10))
            .build()
            .expect("failed to build HTTP client");

        Self {
            http,
            endpoint: endpoint.into(),
        }
    }

    pub async fn fetch_profile(&self, username: &str) -> Result<Profile, RailwayError> {
        let response: GraphqlResponse = self
            .http
            .post(&self.endpoint)
            .json(&json!({
                "query": USER_PROFILE_QUERY,
                "variables": { "username": username },
            }))
            .send()
            .await?
            .error_for_status()?
            .json()
            .await?;

        parse_profile(response)
    }
}

#[derive(Debug, Deserialize)]
struct GraphqlResponse {
    data: Option<UserProfileData>,
    #[serde(default)]
    errors: Vec<GraphqlError>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UserProfileData {
    user_profile: Option<UserProfile>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct UserProfile {
    total_deploys: i64,
    avatar: Option<String>,
    name: Option<String>,
    profile: Option<ProfileDetails>,
}

#[derive(Debug, Deserialize)]
struct ProfileDetails {
    website: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GraphqlError {
    message: Option<String>,
}

fn parse_profile(response: GraphqlResponse) -> Result<Profile, RailwayError> {
    let Some(profile) = response.data.and_then(|data| data.user_profile) else {
        let message = response
            .errors
            .into_iter()
            .find_map(|error| error.message)
            .unwrap_or_else(|| "User profile not found".into());
        return Err(RailwayError::NotFound(message));
    };

    Ok(Profile {
        total_deploys: profile.total_deploys,
        avatar: profile.avatar,
        name: profile.name,
        website: profile
            .profile
            .and_then(|details| details.website)
            .and_then(safe_website),
    })
}

/// Profile websites end up in `<a href>`, so only plain web links are kept.
/// Anything else (e.g. `javascript:` URLs) would be an XSS vector.
pub fn safe_website(website: String) -> Option<String> {
    let lower = website.trim().to_ascii_lowercase();
    (lower.starts_with("https://") || lower.starts_with("http://")).then_some(website)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(body: serde_json::Value) -> Result<Profile, RailwayError> {
        parse_profile(serde_json::from_value(body).unwrap())
    }

    #[test]
    fn parses_a_profile() {
        let profile = parse(json!({
            "data": { "userProfile": {
                "totalDeploys": 168565,
                "avatar": "https://example.com/a.gif",
                "name": "jr",
                "profile": { "website": "https://jakerunzer.com" }
            }}
        }))
        .unwrap();

        assert_eq!(
            profile,
            Profile {
                total_deploys: 168565,
                avatar: Some("https://example.com/a.gif".into()),
                name: Some("jr".into()),
                website: Some("https://jakerunzer.com".into()),
            }
        );
    }

    #[test]
    fn allows_missing_optional_fields() {
        let profile = parse(json!({
            "data": { "userProfile": {
                "totalDeploys": 3, "avatar": null, "name": null, "profile": null
            }}
        }))
        .unwrap();

        assert_eq!(profile.total_deploys, 3);
        assert_eq!(
            (profile.avatar, profile.name, profile.website),
            (None, None, None)
        );
    }

    #[test]
    fn surfaces_railway_error_message_for_unknown_users() {
        let error = parse(json!({
            "errors": [{ "message": "User not found", "path": ["userProfile"] }],
            "data": null
        }))
        .unwrap_err();

        assert!(matches!(&error, RailwayError::NotFound(message) if message == "User not found"));
        assert!(!error.is_transient());
    }

    #[test]
    fn falls_back_to_a_default_not_found_message() {
        let error = parse(json!({ "data": { "userProfile": null } })).unwrap_err();
        assert!(
            matches!(error, RailwayError::NotFound(message) if message == "User profile not found")
        );
    }

    #[test]
    fn drops_non_http_websites() {
        assert_eq!(
            safe_website("https://ok.dev".into()),
            Some("https://ok.dev".into())
        );
        assert_eq!(
            safe_website("HTTP://ok.dev".into()),
            Some("HTTP://ok.dev".into())
        );
        assert_eq!(safe_website("javascript:alert(1)".into()), None);
        assert_eq!(safe_website(" javascript:alert(1)".into()), None);
        assert_eq!(safe_website("ok.dev".into()), None);
    }
}
