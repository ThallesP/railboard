use std::{env, path::PathBuf};

use anyhow::Context;

pub struct Config {
    pub database_url: String,
    pub port: u16,
    pub static_dir: PathBuf,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            database_url: env::var("DATABASE_URL").context("DATABASE_URL is required")?,
            port: match env::var("PORT") {
                Ok(port) => port.parse().context("PORT must be a valid port number")?,
                Err(_) => 3000,
            },
            static_dir: env::var("STATIC_DIR")
                .unwrap_or_else(|_| "frontend/dist".into())
                .into(),
        })
    }
}
