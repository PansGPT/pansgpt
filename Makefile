.PHONY: help dev dev-web dev-api test test-api lint typecheck docker-up docker-down clean

help:
	@echo "PansGPT 2.0 Monorepo Developer Commands"
	@echo "---------------------------------------"
	@echo "  make dev         - Start all services concurrently (Turbo)"
	@echo "  make dev-web     - Start Next.js web application"
	@echo "  make dev-api     - Start FastAPI backend with reload"
	@echo "  make test        - Run all tests across monorepo"
	@echo "  make test-api    - Run pytest suite in apps/api"
	@echo "  make lint        - Run linting checks across all packages"
	@echo "  make typecheck   - Run typecheck across all packages"
	@echo "  make docker-up   - Start local Postgres & Redis containers"
	@echo "  make docker-down - Stop local Docker containers"
	@echo "  make clean       - Clean turbo and build caches"

dev:
	pnpm dev

dev-web:
	pnpm --filter=@pansgpt/web dev

dev-api:
	cd apps/api && uvicorn app.main:app --reload --port 8000

test:
	pnpm test
	cd apps/api && pytest -v

test-api:
	cd apps/api && pytest -v

lint:
	pnpm lint
	cd apps/api && ruff check .

typecheck:
	pnpm typecheck

docker-up:
	docker compose up -d

docker-down:
	docker compose down

clean:
	pnpm turbo clean
