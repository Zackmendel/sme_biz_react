# SME Biz Analyst — implementation checklist

Work top to bottom. Each phase unlocks the next. Check items off as you go.
This adapts the reference template's phase structure to a structured
accounting domain — no ingestion/retrieval-over-documents here, but a lot
more CRUD screens than the template's chat-only shell.

## Where to start

**Foundation, then backend-led vertical slices, same as the reference
template — but Phase 1 here is bigger** because there's real transactional
CRUD (sales, purchases, products, debtors) in addition to auth and chat.

| Order | Why |
| ----- | --- |
| 1. New Supabase project + schema | Everything persists here; RLS has to exist before any frontend CRUD is safe. |
| 2. Backend schema + migrations | Auth, ledger tables, cycles, audit trail, and the AI all depend on this data model. |
| 3. Thin vertical slices | Auth → business onboarding → one CRUD screen (Sales) end-to-end → the rest of CRUD → dashboard → AI chat → reporting/Telegram. |
| 4. Frontend in parallel | Scaffold the SPA early; build CRUD forms as their backing tables land; don't build AI chat UI until the backend can return real grounded answers. |

The critical path is **schema + RLS → onboarding → sales/purchases entry →
daily_summaries aggregation → dashboard → AI → reporting**. Unlike the
reference template, most of this app's CRUD talks to Supabase directly from
the frontend (see `docs/architecture.md` — System Boundaries); FastAPI only
needs to exist starting at Phase 5 for chat, and Phase 6 for the nightly
job.

---

## Phase 0 — Prerequisites & foundation

- [x] Install toolchain: Python 3.12+, `uv`, Node 20+, `pnpm`
- [x] Create a **new** Supabase project for this rebuild (don't reuse the
  Streamlit app's project — start clean so migrations are the source of
  truth from day one; see [supabase-setup](guides/supabase-setup.md))
- [x] Create a Google AI Studio / Gemini API key (needed from Phase 5)- Google ADC was used in setup...a little more is explained in comment in .env file
- [x] Create a Telegram bot via @BotFather, note the bot token (needed from
  Phase 6)
- [x] Decide the initial `nigeria_city_list` enum values you actually need
  (`docs/schema.sql` ships the PRD's Niger-State-focused list — trim or
  extend before first migration; this enum is flagged as tech debt to
  replace with free text before wider rollout, see Phase 8)

---

## Phase 1 — Backend scaffold & database

Goal: a running FastAPI service with the full accounting schema migrated
and RLS enforced.

- [x] Init backend deps and project layout ([backend-setup](guides/backend-setup.md))
- [x] `app/config.py` — settings module, fail fast on missing env vars
- [x] `app/main.py` — FastAPI app, CORS, health check (`GET /health`)
- [x] SQLAlchemy models in `app/database/models/`, one per table in
  [`docs/schema.sql`](../docs/schema.sql):
  - [x] `businesses`
  - [x] `users`
  - [x] `products`
  - [x] `accounting_cycles`
  - [x] `sales`
  - [x] `purchases`
  - [x] `debtors`
  - [x] `daily_summaries`
  - [x] `audit_trail`
- [x] Check the backend/app/database/models to if the models will work well when deployed on Supabase. For example the user model will depend on the auth.users table, creating a new user means that a new user needs to be created in the users table, if there is a logic issue between them, like UUID not set to be generated at random or date is not automatically set to the current date, it will cause issues in the integration with the frontend down the line. 
- [x] Alembic init + first migration covering all of `docs/schema.sql`:
  - [x] All enums (`nigeria_city_list`, `business_industry`,
    `business_scale`, `role_enum`, `status_enum`, `period_enum`,
    `payment_type`)
  - [x] `pg_trgm` extension + trigram indexes on `businesses.name`
  - [x] `handle_new_user()` function + `on_auth_user_created` trigger
  - [x] RLS enabled + policies on every table (owner/admin/staff/viewer
    scoped to `business_id`, `viewer` read-only, `staff` cannot edit/delete
    per the Admin Privileges table in the PRD)
  - [x] `daily_summaries` upsert trigger on `sales`/`purchases`
    insert/update/delete (see Phase 4)
  - [x] `audit_trail` write trigger, **INSERT-only RLS policy** (no
    UPDATE/DELETE for any role including service role)
  - [x] verify that all the above triggers, indexes and policies work as expected and will not clash when it is to be implemented with the frontend.
- [x] `uv run alembic upgrade head` against the new Supabase project
- [x] `app/database/supabase.py` — user-scoped and service-role clients
- [x] Verify: `uv run uvicorn app.main:app --reload` → health check 200

---

## Phase 2 — Auth & business onboarding (full stack)

Goal: an owner can sign up, set up their business, and staff can be invited
with a role.

**Backend**

- [x] `app/auth/dependencies.py` — verify `Authorization: Bearer <jwt>`,
  expose `get_current_user` (resolves both `auth.users` identity and the
  linked `users`/`business_id` row)
- [x] Reject missing/expired tokens with `401` before any query or chat work. New users are automatically assigned a viewers role.

**Frontend**

- [x] Scaffold Vite + React + TypeScript + Tailwind + shadcn
  ([frontend-setup](guides/frontend-setup.md))
- [x] `src/lib/env.ts`, `src/lib/supabase.ts`, `src/lib/http.ts` +
  `src/lib/api.ts` (same shape as the reference template)
- [x] Sign-up / sign-in pages (email only)
- [x] **Onboarding gate**: a signed-in user with no `business_id` is routed
  to a business-setup flow (name, owner name, description, industry,
  scale, city, address, phone, email, proof-of-business upload to Supabase
  Storage) before anything else — mirrors the existing Streamlit app's
  `show_onboarding_screen` gatekeeper pattern
- [x] Product/item list setup screen (name, default price, unit, category)
  — required before Sales/Purchases can be used meaningfully
- [x] Staff invite + role assignment screen (owner/admin only)
- [x] Protected routes — redirect unauthenticated or un-onboarded users
- [x] Verify: sign up → onboard a business → add a product → see it appear
  for a second staff account scoped to the same `business_id`

---

## Phase 3 — Sales & Purchases ledgers (vertical slice)

Goal: the core daily-use loop — the reason the app exists.

**Direct-to-Supabase, no FastAPI involved** (per `docs/architecture.md`):

- [x] Sales entry form: product dropdown (+ "Other" free-text), quantity,
  customer details, discount, payment type; price pre-fills from
  `products.default_price`, editable by admin/owner only
- [x] `total` computed server-side (Postgres generated column or a
  BEFORE INSERT/UPDATE trigger) — **never trust a client-submitted total**
- [x] Every sale must resolve to an open `accounting_cycles` row for its
  `period_type`; if none is open, prompt the owner to confirm/open one
  (Balance Brought Forward flow from the PRD)
- [x] Purchases entry form — mirrors Sales, vendor details instead of
  customer, no discount/payment_type
- [x] Sales/Purchases list views: sortable, filterable by date range,
  product, customer/vendor
- [x] RLS-scoped so staff only ever see/write their own business's rows
- [x] Verify: log a sale and a purchase as different roles; confirm a
  `staff` account cannot edit or delete an entry (per Admin Privileges
  table), and a `viewer` account cannot create one either

---

## Phase 4 — Daily summaries & dashboard

Goal: fast, pre-aggregated reporting that neither the dashboard nor the AI
has to compute by scanning raw transactions.

- [x] `daily_summaries` upsert trigger fires on every `sales`/`purchases`
  write for the affected `business_id` + date (same pattern as the
  reference template's per-write materialized summary, just recalculating
  ledger totals instead of chunk counts)
- [x] Debtors screen: add/view debtors, mark paid (`debtors` table — a
  distinct notion from purchases/vendors)
- [x] Dashboard: total income, total expenditure, net, transaction count,
  unique customers, top item, income-vs-expenditure chart (Recharts),
  reading `daily_summaries` directly from Supabase
- [x] Cycle filter (daily/weekly/monthly/quarterly/yearly) aggregating
  across `daily_summaries` rows for weekly+ views
- [x] Verify: dashboard loads in under 2 seconds with a nontrivial number of
  seeded transactions; changing the date filter never triggers a raw
  `sales`/`purchases` table scan

---

## Phase 5 — AI assistant (chat, vertical slice)

Goal: an owner can ask a plain-English question and get an answer grounded
in their own recorded data — no invented figures, ever.

**Backend**

- [x] Chat thread CRUD (list threads, create thread, load history) —
  same shape as the reference template
- [x] `POST /chat/stream` — accepts AI SDK message format; **for the first
  pass, stub the assistant reply** before wiring real tools
- [x] `app/assistant/agent.py` — PydanticAI agent configured with a Gemini
  model (verify the current recommended model name against Google's docs;
  don't hardcode a PRD-quoted model string that may be stale by
  implementation time)
- [x] `app/assistant/tools.py` — bounded, typed tools only:
  `query_daily_summary(date_range)`, `query_sales(date_range, filters)`,
  `query_purchases(date_range, filters)`, `query_debtors()`. No
  agent-generated free-form SQL.
- [x] `app/analytics/queries.py` — the actual typed SQL behind those tools,
  scoped to the caller's `business_id`
- [x] `app/grounding/validator.py` — every cited figure maps to a row a
  tool call actually returned this turn; fail closed otherwise
- [x] `app/chat/orchestrator.py` — one turn: resolve `business_id` → agent
  run → validate grounding → stream → persist
- [x] `app/chat/streaming.py` — AI SDK-compatible stream (text deltas +
  row-citation metadata parts)
- [x] Persist citations linked to assistant messages
- [x] Unit tests: tool query correctness (mocked DB), citation validation,
  grounding enforcement — same bar as the reference template's grounding
  tests

**Frontend**

- [x] Chat drawer/icon available from any screen
- [x] AI SDK chat primitives pointed at `POST /chat/stream`
- [x] Row-citation chips on assistant messages ("from your sales, 3 Jul")
- [x] Verify against the example questions in
  [product-brief.md](product-brief.md#example-owner-questions):
  - [x] Answers cite specific dates/rows, not vague summaries
  - [x] Under-specified or unsupported questions get an honest "not enough
    data" response instead of an estimate
  - [x] The agent never attempts to write to the ledger

---

## Phase 6 — Nightly aggregation, cycle close, and reporting

Goal: the automated end-of-day and end-of-cycle pipeline.

- [ ] `app/analytics/aggregator.py` — nightly job logic: aggregate the
  day's transactions, evaluate net position, roll deficits into
  `debts_accrued`, upsert `daily_summaries`
- [ ] Cycle-close logic: when a cycle's `end_date` passes, close it, carry
  the balance/debt forward into a newly opened cycle of the same
  `period_type`
- [ ] `app/reporting/pdf.py` — WeasyPrint templated PDF (business name,
  logo, period summary) — prefer this over screenshot-to-PDF per the PRD
- [ ] Gemini-generated narrative summary built **only** from
  `daily_summaries`/`accounting_cycles` rows, never raw transaction dumps
  (token-cost control, per the PRD's own reasoning)
- [ ] `app/reporting/telegram.py` — deliver narrative + PDF via the
  Telegram Bot API to the business's configured chat ID
- [ ] Secured FastAPI endpoints for Cloud Scheduler to call (nightly
  aggregation, cycle close)
- [ ] Retry policy: automated delivery retried up to 3 times on failure,
  owner notified if all retries fail
- [ ] Verify: manually trigger the endpoint against seeded data, confirm a
  Telegram message + PDF arrive with correct figures

---

## Phase 7 — Fraud / anomaly detection

Goal: rules-based flags on top of the audit trail, not an LLM classifier.

- [ ] `app/analytics/anomaly.py`: price-override detection (vs.
  `products.default_price`), off-hours entry detection, rapid
  delete-after-create detection, quantity-spike detection, new
  vendor/customer added by non-admin
- [ ] Wire into the nightly job; set `is_flagged` on affected
  `sales`/`purchases` rows
- [ ] "Flags & Alerts" panel in the dashboard/reports view
- [ ] Verify: seed a deliberately anomalous entry (e.g. a price 5x the
  default at 2am) and confirm it gets flagged

---

## Phase 8 — Pilot readiness

- [ ] README "Running locally" section — copy-paste commands for backend +
  frontend + env vars
- [ ] Smoke-test all example owner questions from
  [product-brief.md](product-brief.md)
- [ ] Confirm chat history persists across sessions
- [ ] Confirm RLS actually isolates two different businesses' data end to
  end (create two test businesses, verify zero cross-visibility)
- [ ] Structured logging on backend (`structlog`) for debugging failed
  turns and failed nightly jobs
- [ ] Review AI response latency: streaming should start within a few
  seconds for typical queries
- [ ] Revisit the `nigeria_city_list` enum decision from Phase 0 — replace
  with free text or a reference table before onboarding businesses outside
  the seeded cities
- [ ] Decide and document: multiple businesses per owner account? (Open
  question carried over from the PRD — affects auth model if answered
  "yes" later, so decide before Phase 9 lands in production)

---

## Phase 9 — Deployment

- [ ] Vercel: frontend project from `frontend/`, `VITE_*` env vars set at
  build time ([deployment guide](guides/deployment.md))
- [ ] Google Cloud Run: backend container from `backend/`, min instances 0
  (or 1 if cold starts hurt the chat experience)
- [ ] Google Secret Manager: `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`
- [ ] Google Cloud Scheduler: nightly aggregation + cycle-close triggers
  against the deployed Cloud Run endpoints
- [ ] Supabase: re-enable email confirmation for production if disabled
  during dev
- [ ] Run `alembic upgrade head` against production Supabase (direct
  connection, not the pooler URL)
- [ ] End-to-end test on deployed URLs: sign up, onboard, log a sale, see
  the dashboard update, ask the AI a question, wait for (or manually
  trigger) a Telegram report

---

## Quick reference

| Doc | Purpose |
| --- | ------- |
| [product-brief.md](product-brief.md) | What the app needs to do and example owner questions |
| [architecture.md](architecture.md) | System design, data model, streaming contract |
| [schema.sql](schema.sql) | Canonical, consolidated database schema |
| [guides/supabase-setup.md](guides/supabase-setup.md) | Hosted Postgres + Auth |
| [guides/backend-setup.md](guides/backend-setup.md) | FastAPI + Alembic commands |
| [guides/frontend-setup.md](guides/frontend-setup.md) | Vite + React scaffold commands |
| [guides/deployment.md](guides/deployment.md) | Vercel + Cloud Run deployment |
