# Backend setup

The backend is a separate Python + FastAPI service because it owns AI
orchestration, the nightly aggregation/cycle-close job, PDF generation, and
Telegram delivery — not because it fronts ordinary CRUD. Sales/purchases/
product/debtor CRUD talks to Supabase directly from the frontend (see
`docs/architecture.md`).

## Init (from empty `backend/`)

```bash
cd backend
uv sync
uv add fastapi uvicorn pydantic pydantic-settings httpx structlog \
  supabase pydantic-ai sqlalchemy alembic "psycopg[binary]" weasyprint
uv add --dev pytest ruff
```

Use PydanticAI's Google/Gemini integration rather than the OpenAI provider
used in the reference template — check `pydantic-ai`'s current docs for the
exact extra/package name for Gemini support (it has moved between
`pydantic-ai-slim[google]` and similar naming across releases; verify at
implementation time instead of trusting a specific string here).

## Database migrations

Alembic owns schema changes. SQLAlchemy models describe
`docs/schema.sql`'s tables; Alembic migrations apply them to Supabase
Postgres.

```bash
uv run alembic init alembic
```

Configure `alembic/env.py` to import the app's SQLAlchemy metadata and read
the **direct** Supabase database URL from `app.config.settings` — not the
transaction pooler URL.

```bash
uv run alembic revision --autogenerate -m "initial accounting schema"
```

Always review the generated migration. Add explicit operations for what
autogenerate won't reliably infer:

- All seven enums in `docs/schema.sql`
- `create extension if not exists pg_trgm`
- The `handle_new_user()` trigger function + trigger
- RLS enablement and policies on every table
- The `daily_summaries` upsert trigger
- The `audit_trail` INSERT-only RLS policy and write trigger

```bash
uv run alembic upgrade head
```

## Run

```bash
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

## Imports (`from app...`)

Same as the reference template: `backend/app` installs as an editable
package via `uv sync`, so `from app...` imports work from uvicorn, direct
execution, tests, and notebooks. Keep the `[build-system]` /
`[tool.hatch.build.targets.wheel]` sections in `pyproject.toml` intact.

Preferred server command:

```bash
cd backend
uv run uvicorn app.main:app --reload
```

## PDF rendering

WeasyPrint needs system libraries (Pango, cairo) — install per your OS
before running report generation locally; the Cloud Run Dockerfile needs
the equivalent apt packages baked in (see the deployment guide).
