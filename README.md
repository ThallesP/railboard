# Railboard

A public leaderboard of how many times people have deployed on [Railway](https://railway.com).

A single Rust server (axum) serves the JSON API, refreshes every tracked user from Railway's
GraphQL API once an hour, and serves the Svelte single-page app.

## Stack

- **Backend** (`backend/`): [axum](https://github.com/tokio-rs/axum),
  [sqlx](https://github.com/launchbadge/sqlx) on Postgres, [reqwest](https://github.com/seanmonstar/reqwest)
  for Railway's API, [backon](https://github.com/Xuanwo/backon) for retries.
- **Frontend** (`frontend/`): [Svelte 5](https://svelte.dev) + [Vite](https://vite.dev),
  [sv-router](https://sv-router.dev) for routing,
  [TanStack Query](https://tanstack.com/query/latest/docs/framework/svelte/overview) for data
  fetching, [shadcn-svelte](https://shadcn-svelte.com) components, and
  [LayerChart](https://layerchart.com) for charts.

```
backend/
  migrations/         SQL migrations, applied automatically on startup
  src/
    main.rs           startup: config, database, refresher, HTTP server
    lib.rs            router: /api + static frontend with SPA fallback
    api/              HTTP handlers
    db.rs             SQL queries
    railway.rs        Railway GraphQL client
    refresher.rs      hourly refresh of every tracked user
    stats.rs          deploy statistics (pure functions)
    bin/import_convex.rs  one-off import of the old Convex data
  tests/              API integration tests (real Postgres, mocked Railway)
frontend/
  src/
    router.ts         routes
    routes/           route components (Home is the layout, UserDetails the dialog)
    lib/              API client, queries, formatting, components
```

## Development

Requires Rust, [Bun](https://bun.sh) and Docker.

```sh
cp .env.example .env
(cd frontend && bun install)
make dev    # Postgres + API on :3000 + Vite on :5173
```

Open http://localhost:5173. Vite proxies `/api` to the Rust server.

| Command     | What it does                                                             |
| ----------- | ------------------------------------------------------------------------ |
| `make db`   | Starts Postgres (port 5433) with docker compose                          |
| `make test` | Rust unit + integration tests and frontend tests                         |
| `make lint` | rustfmt, clippy, svelte-check and prettier                               |
| `make fmt`  | Formats everything                                                       |
| `make build`| Builds `frontend/dist` and the release binary, which serves both on :3000 |

### Environment

| Variable       | Default         | Description                        |
| -------------- | --------------- | ---------------------------------- |
| `DATABASE_URL` | (required)      | Postgres connection string         |
| `PORT`         | `3000`          | HTTP port                          |
| `STATIC_DIR`   | `frontend/dist` | Built frontend to serve            |
| `RUST_LOG`     | `info`          | Log filter, e.g. `info,tower_http=debug` |

## API

| Route                                     | Description                                        |
| ----------------------------------------- | -------------------------------------------------- |
| `GET /api/leaderboard`                    | Every tracked user, most deploys first             |
| `GET /api/stats`                          | Deploys this week vs last week across all users    |
| `POST /api/users` `{"username": "..."}`   | Starts tracking a Railway user                     |
| `GET /api/users/{username}?period=7d\|30d` | Stats, recent snapshots and daily chart for a user |

## Deploying on Railway

The `Dockerfile` builds the frontend and the server into one image. Add a Postgres database to
the project and set `DATABASE_URL` on the service to reference it (`${{Postgres.DATABASE_URL}}`).
Railway sets `PORT`. Migrations run on startup.

## Migrating data from Convex

Export the Convex production data and import it into an empty database:

```sh
bunx convex export --prod --path convex-export.zip
unzip convex-export.zip -d convex-export
DATABASE_URL=postgres://... cargo run --bin import_convex -- convex-export
```

The importer keeps each user's creation time and deploy history. Consecutive snapshots with the
same total are dropped, since they don't change any statistic.
