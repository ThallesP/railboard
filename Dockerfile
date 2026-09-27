FROM oven/bun:1 AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile
COPY frontend/ ./
RUN bun run build

FROM rust:1.98-slim-trixie AS backend
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY backend ./backend
RUN cargo build --release --locked --bin railboard

FROM debian:trixie-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /app/target/release/railboard /usr/local/bin/railboard
COPY --from=frontend /app/frontend/dist ./public
ENV STATIC_DIR=/app/public
EXPOSE 3000
CMD ["railboard"]
