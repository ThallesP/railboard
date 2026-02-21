.PHONY: test lint

test:
	bun test --dom

lint:
	bun run lint
