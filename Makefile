.PHONY: up down logs test test-api test-web format

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f

test: test-api test-web

test-api:
	cd apps/api && pytest

test-web:
	cd apps/web && npm test

format:
	cd apps/api && ruff format . && ruff check --fix .
	cd apps/web && npm run lint

