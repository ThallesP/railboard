.PHONY: db dev dev-api dev-web build test lint fmt

# Local Postgres (see compose.yaml). Other targets that need it depend on this.
db:
	docker compose up -d --wait

# API on :3000 and the Vite dev server on :5173 (proxies /api to the API).
dev: db
	$(MAKE) -j2 dev-api dev-web

dev-api:
	cargo run

dev-web:
	cd frontend && bun run dev

# Release binary + frontend/dist; run with `./target/release/railboard`.
build:
	cd frontend && bun install && bun run build
	cargo build --release

test: db
	cargo test
	cd frontend && bun run test

lint:
	cargo fmt --check
	cargo clippy --all-targets -- -D warnings
	cd frontend && bun run check && bun run lint

fmt:
	cargo fmt
	cd frontend && bun run format
