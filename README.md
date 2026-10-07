# AI Social Media Agent

A VS Code-ready starter monorepo for generating, reviewing, approving, scheduling, and publishing social media content. The main safety boundary is built into the workflow: **nothing can be scheduled or published before a human approves it**.

## What is included

- Next.js + React dashboard for creating content and managing approvals
- FastAPI REST API with PostgreSQL persistence
- LangGraph workflow nodes: planner, generator, reviewer, human approval, scheduler, publisher
- Celery + Redis worker scaffolding for background publishing
- Provider-neutral OAuth and social adapter interfaces
- Docker Compose local environment
- Deterministic demo content generation when no OpenAI key is configured
- Backend and frontend starter tests

## Repository layout

```text
.
├── apps/
│   ├── api/                 # FastAPI, LangGraph, SQLAlchemy, Celery
│   │   ├── app/
│   │   │   ├── api/         # REST routes and dependencies
│   │   │   ├── core/        # Configuration
│   │   │   ├── db/          # Database session and models
│   │   │   ├── integrations/# OAuth and social provider contracts
│   │   │   ├── services/    # Application services
│   │   │   ├── workflows/   # LangGraph state and nodes
│   │   │   └── workers/     # Celery tasks
│   │   └── tests/
│   └── web/                 # Next.js App Router dashboard
├── compose.yaml
├── .env.example
└── .vscode/
```

## Quick start with Docker

Prerequisites: Docker Desktop and Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

Open:

- Dashboard: http://localhost:3000
- API docs: http://localhost:8000/docs
- API health: http://localhost:8000/health

The API creates its starter tables on boot. You can create and approve posts immediately without configuring an AI key; the app will use its local demo generator. Stop everything with `docker compose down`.

## Run without Docker

Start PostgreSQL and Redis locally, then change the hostnames in `.env` from `postgres` and `redis` to `localhost`.

Backend (Python 3.12+):

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e '.[dev]'
uvicorn app.main:app --reload
```

In another terminal, start the worker:

```bash
cd apps/api
source .venv/bin/activate
celery -A app.workers.celery_app worker --loglevel=info
```

Frontend (Node.js 20+):

```bash
cd apps/web
npm install
npm run dev
```

## Workflow

```text
planner → generator → reviewer → waiting_for_approval
                                      ├─ reject → generator
                                      └─ approve → scheduler → publisher worker
```

The `POST /api/v1/posts` endpoint runs planning, generation, and review, then stores the post with `waiting_for_approval` status. `POST /api/v1/posts/{id}/approve` is the only route that can enqueue publishing. Rejection records feedback and creates a revised draft.

## API examples

Create a draft:

```bash
curl -X POST http://localhost:8000/api/v1/posts \
  -H 'Content-Type: application/json' \
  -d '{"topic":"Launch our AI course","platforms":["linkedin","instagram"],"tone":"professional","goal":"increase registrations"}'
```

Approve it (replace `POST_ID`):

```bash
curl -X POST http://localhost:8000/api/v1/posts/POST_ID/approve \
  -H 'Content-Type: application/json' \
  -d '{"approved_by":"local-user"}'
```

## Tests

```bash
cd apps/api && pytest
cd apps/web && npm test
```

## Connecting real services

1. Put credentials in `.env`; never commit that file.
2. Implement the provider methods in `apps/api/app/integrations/social/` using each platform's current official API.
3. Exchange OAuth codes server-side and encrypt refresh tokens before storing them.
4. Replace `MockSocialAdapter` in the publisher registry with the appropriate real adapter.
5. For production, add Alembic migrations, a secret manager, HTTPS callbacks, retry/dead-letter policies, audit logging, and provider-specific rate limiting.

Open the repository folder in VS Code. Recommended extensions and a Python debugger profile are included under `.vscode/`.

