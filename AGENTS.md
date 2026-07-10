# Agent Instructions

This file is the source of truth for any coding agent (Claude Code, Cursor,
Codex, etc.) working in this repo. Read it before touching code.

## Stack

- **Backend:** Python + FastAPI
- **Frontend:** Vite + React SPA + TypeScript
- **Database:** Supabase Postgres (businesses, users, products, sales,
  purchases, accounting cycles, debtors, daily summaries, audit trail —
  see `docs/schema.sql`)
- **Migrations:** SQLAlchemy models + Alembic from the backend
- **AI orchestration:** PydanticAI, typed agent with bounded tools over
  structured accounting tables — **no pgvector, no document retrieval, no
  free-form agent-generated SQL**
- **Auth:** Supabase Auth (email only)
- **Hosting:** Vercel (frontend) + Google Cloud Run (backend), Google Cloud
  Scheduler for nightly jobs
- **LLM:** Google Gemini
- **Reporting/notifications:** WeasyPrint (PDF) + Telegram Bot API

Stack is locked unless explicitly changed. Don't propose alternatives
without a stated reason.

**CRUD boundary is deliberate and non-default:** unlike a typical
"frontend always talks to backend" setup, Sales/Purchases/Products/Debtors
CRUD and dashboard reads talk to Supabase **directly** from the frontend,
relying on RLS. FastAPI is reserved for AI chat, the nightly
aggregation/cycle-close job, PDF generation, and Telegram delivery. See
`docs/architecture.md` — System Boundaries before adding a new backend
route for something that could be plain Supabase CRUD.

## Repo layout

```text
sme-biz-analyst/
├── AGENTS.md           # this file
├── README.md
├── docs/               # specs, briefs, schema, guides
├── backend/            # FastAPI service (see backend/AGENTS.md)
└── frontend/           # React SPA (see frontend/AGENTS.md)
```

## Dependency policy

**Default: write it yourself. Reach for a library only when the
alternative would be non-trivial, error-prone, or reinvention of a
standard.** Every dependency is a liability — bundle size, supply-chain
risk, future upgrade work.

OK to depend on:

- Things that are genuinely hard to get right (HTTP clients, ASGI servers,
  SQL drivers, LLM SDKs, ORM, migrations, auth SDKs, PDF rendering).
- The declared stack (FastAPI, React, Vite, Supabase clients, Gemini SDK,
  PydanticAI, WeasyPrint, etc.).

Not OK:

- Helper libraries that wrap 5–20 lines of stdlib or platform APIs.
- Frameworks where a function would do.
- "Nicer API" layers on top of an already-present dependency.

Per-stack specifics live in `backend/AGENTS.md` and `frontend/AGENTS.md`.

## Configuration

A single settings module is the source of truth for environment per service
(`backend/app/config.py`, `frontend/src/lib/env.ts`). Do not call
`os.getenv` / read `process.env` directly in app code. Do not call
`load_dotenv` anywhere. Fail fast on startup if required config is missing.

## Code style (universal)

- **Small, obvious functions.** A 15-line function with clear names beats a
  three-class abstraction.
- **No premature abstraction.** Three similar lines is better than a
  badly-named base class. Extract when there's a third caller, not a
  hypothetical one.
- **No error handling for cases that can't happen.** Trust internal
  callers and framework guarantees. Validate only at boundaries: HTTP
  input, external APIs, DB writes, untrusted parsing.
- **No backwards-compat shims** unless explicitly asked for.
- **No feature flags** added speculatively.
- **Comments:** explain *why* when non-obvious, never *what*. Remove stale
  TODOs.
- **Keep files focused.** Prefer small modules.
- **The ledger is append-and-correct, never silently overwritten.**
  `total` fields are computed server-side/by trigger, never trusted from a
  client payload. `audit_trail` writes are never something application code
  can skip or bypass.
