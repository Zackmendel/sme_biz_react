# Backend — agent notes

This is the FastAPI service for SME Biz Analyst. Read [../AGENTS.md](../AGENTS.md)
first — universal building rules live there. This file adds backend-specific
conventions.

## Stack

- Python 3.12+
- FastAPI + uvicorn
- Pydantic v2 + pydantic-settings
- `httpx` for outbound HTTP (Telegram Bot API, and Gemini if not going
  through an SDK wrapper)
- `pytest` for tests
- Supabase Python client (DB + auth)
- SQLAlchemy models + Alembic migrations for database schema changes
- PydanticAI for typed LLM orchestration, configured with a **Gemini**
  model — not OpenAI
- WeasyPrint for templated PDF report generation
- `structlog` for logging
- `uv` for dependency + project management

## What this backend is *not* for

This backend does not front ordinary CRUD. Sales, purchases, products, and
debtors reads/writes happen directly from the frontend against Supabase,
scoped by RLS. Before adding a new FastAPI route, check whether it's really
just "read/write a business-scoped row" — if so, it belongs in Supabase +
RLS, not here. This backend owns: AI chat (`/chat/stream`), the nightly
aggregation and cycle-close jobs (Cloud-Scheduler-triggered), PDF rendering,
and Telegram delivery.

## Retrieval is structured, not semantic

There is no document corpus, no chunking, no embeddings, no pgvector, no
full-text search in this system. "Retrieval" for the AI assistant means
typed, bounded SQL tool calls over `sales`, `purchases`, `accounting_cycles`,
`debtors`, and — for anything spanning more than a day or two —
`daily_summaries`. Do not introduce `pgvector` or a vector store; if a
future feature genuinely needs semantic search over free-text notes, treat
that as a deliberate, separately-justified addition, not a default.

## Dependency policy

See universal policy in [../AGENTS.md](../AGENTS.md). Backend-specific:

- **Prefer stdlib:** `pathlib`, `datetime`, `uuid`, `enum`, `dataclasses`,
  `asyncio`, `collections`, `itertools`, `json`, `urllib`.
- **Not OK without justification:** `python-dateutil`, `toolz`, `funcy`,
  `more-itertools`, small JSON/string micro-libs, "ergonomic" wrappers on
  top of declared SDKs.
- Dev deps (test/lint/build) have a looser bar but still pick widely-used,
  low-footprint tools (`pytest`, `ruff`, `httpx`).

## Layout (to be created during build)

```text
backend/
├── alembic/
│   ├── env.py           # Imports app database metadata for autogenerate
│   └── versions/        # Reviewed migration files
├── alembic.ini
├── app/
│   ├── main.py          # FastAPI entrypoint
│   ├── config.py        # Pydantic settings — single source of truth for env
│   ├── api/             # chat.py, reports.py (Scheduler-triggered endpoints)
│   ├── auth/            # Supabase JWT verification + current user dependency
│   ├── chat/            # turn orchestration, AI SDK message conversion, streaming
│   ├── assistant/       # PydanticAI agent (Gemini), deps, outputs, tools, instructions
│   ├── analytics/       # typed queries, nightly aggregator, anomaly/fraud heuristics
│   ├── grounding/       # citation validation — every figure maps to a queried row
│   ├── reporting/       # WeasyPrint PDF rendering, Telegram delivery
│   └── database/        # SQLAlchemy models, Supabase client wrapper, query helpers
├── tests/
└── pyproject.toml
```

## Code style (backend-specific)

- **Type hints on public functions and module-level things.** Don't
  annotate every local.
- **Async by default in request-path code.** Don't run blocking I/O on the
  event loop. WeasyPrint rendering is CPU-bound and synchronous — run it in
  a thread pool executor rather than blocking the event loop directly.
- **Use `async def` for all route handlers** and any I/O service function.
- **Validate at boundaries only.** HTTP input is validated by Pydantic
  models. External API responses (Gemini, Telegram) are validated when
  parsed. Internal callers are trusted.
- **Ledger totals are never trusted from the caller.** `sales.total` /
  `purchases.total` are computed by a Postgres generated column or a
  BEFORE INSERT/UPDATE trigger, not application code accepting a client
  value.

## Configuration

- `app.config.settings` is the single source of truth. Import settings
  where needed; never call `os.getenv` in app code, never call
  `load_dotenv`.
- Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `GEMINI_API_KEY`,
  `GEMINI_MODEL`, `TELEGRAM_BOT_TOKEN`, `ALLOWED_ORIGINS`.
- Fail fast on startup when required env vars are missing.

## Database migrations

- Alembic is the source of truth for schema changes. Do not change
  production tables manually in the Supabase dashboard.
- `docs/schema.sql` is canonical — SQLAlchemy models should match it
  exactly, including enum values, defaults, and check constraints.
- Postgres-specific features belong in explicit migration operations:
  `create extension pg_trgm`, all enum types, the `daily_summaries` upsert
  trigger, the `audit_trail` write trigger + INSERT-only RLS policy, RLS
  enablement and policies on every table.
- Alembic must use the direct/session database connection, not the
  Supabase transaction pooler URL.
- Run migrations from `backend/` with `uv run alembic upgrade head`.

## Tests

- **Prefer unit over integration.** Mock at the service boundary.
- Fast suite (`pytest -m "not integration"`) must stay green and hit no
  network / no DB.
- Integration tests go behind `@pytest.mark.integration` and may require
  live Gemini / Supabase credentials.
- Tests live next to what they test (`analytics/aggregator.py` →
  `tests/analytics/test_aggregator.py`).
- Required test coverage: aggregation/cycle-close logic, anomaly
  heuristics, tool query correctness, citation extraction, grounding
  enforcement.

## Anti-patterns (rejected)

- `os.getenv` / `load_dotenv` in modules.
- Wrapping FastAPI responses in custom envelope classes.
- Over-catching `Exception` just to log and re-raise; let it propagate.
- Shared state through globals instead of FastAPI `app.state` or DI.
- Silent fallbacks that hide real config errors.
- Mocking the LLM in unit tests without also testing the grounding
  contract — the prompt is the product.
- Agent tools that accept a raw SQL string or free-form filter dict instead
  of a typed, validated argument shape.
- Giving the assistant agent any insert/update/delete tool. It reads and
  explains; it never writes to the ledger.
