# SME Biz Analyst — Implementation Checklist v2

This checklist serves as a comprehensive, phase-by-phase blueprint for rebuilding or replicating the **SME Biz Analyst** application from scratch. It incorporates structural patterns, architectural choices, and folder hierarchies learned from the current implementation.

---

## Stack & Architecture Reference

- **Backend:** Python 3.12+ (FastAPI) + Alembic + SQLAlchemy models + PydanticAI
- **Frontend:** Vite + React SPA + TypeScript + Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL with Row Level Security, Triggers, and functions)
- **Deployment:** Vercel (Frontend), Google Cloud Run (Backend), Google Cloud Scheduler (Nightly Crons)
- **Reporting:** WeasyPrint (HTML-to-PDF) + Telegram Bot API

### The System Boundary Rule
*   **Frontend Direct-to-Supabase (CRUD):** All operations on `sales`, `purchases`, `products`, `debtors`, and `accounting_cycles` (read/write) are performed directly from the React frontend to Supabase client library, relying on Row-Level Security (RLS) policies.
*   **FastAPI Backend (Heavy Lifting):** The backend is strictly reserved for non-CRUD services:
    1. AI Chat processing with grounding validation (`POST /chat/stream`).
    2. Nightly data aggregation and cycle closing cron jobs (`POST /cron/nightly` / `POST /cron/cycle-close`).
    3. PDF report generation via WeasyPrint and delivery to Telegram Bot API.

---

## Phase 0 — Prerequisites & Local Setup

- [ ] **Tooling installation:**
  - Python 3.12+ and `uv` package manager.
  - Node.js 20+ and `pnpm` or `npm`.
- [ ] **Supabase Setup:**
  - Create a new project in the Supabase console.
  - Obtain the `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **Third-Party Integrations:**
  - Create a Google AI Studio account and retrieve a Gemini API Key.
  - Create a Telegram bot via `@BotFather` and retrieve the Bot Token and target Chat ID (for testing).

---

## Phase 1 — Database Schema & RLS Policies (Supabase)

Goal: Enforce strict multi-tenant schema rules and security policies in Postgres before building code.

- [ ] **Define PostgreSQL Schema (`docs/schema.sql`):**
  - Enums: `role_enum` (owner, admin, staff, viewer), `period_enum` (daily, weekly, monthly, quarterly, yearly), `payment_type`.
  - Tables:
    - `businesses`: Details about the business tenant.
    - `users`: Extends Supabase auth, linking a user UUID to a `business_id` and a `role_enum`.
    - `products`: Product catalogs with default prices.
    - `accounting_cycles`: Tracks open/closed ledger periods.
    - `sales` / `purchases`: Transaction ledgers.
    - `debtors`: Tracks credit customers and status.
    - `daily_summaries`: Pre-aggregated daily performance metrics.
    - `audit_trail`: Append-only security log.
- [ ] **Automated User Triggers:**
  - Create a Postgres function and trigger on `auth.users` to automatically insert a corresponding record into public `users` (defaulting to the `viewer` role) upon sign-up.
- [ ] **Row-Level Security (RLS) Rules:**
  - Enable RLS on every table.
  - Write tenant isolation policies: `WHERE business_id = (SELECT business_id FROM users WHERE id = auth.uid())`.
  - Restrict writing capabilities: `staff` cannot edit/delete transactions; `viewer` has read-only access.
- [ ] **Immutable Audit Trail:**
  - Create a trigger on `sales` and `purchases` that writes to `audit_trail` on INSERT, UPDATE, or DELETE.
  - Apply an RLS policy to `audit_trail` that **only** allows `INSERT` (no updates or deletes allowed even by admins).

---

## Phase 2 — Backend Scaffold & SQLAlchemy Modeling

Goal: Establish the FastAPI service structure and match the Supabase schema using SQLAlchemy/Alembic.

- [ ] **Initialize Backend Structure:**
  - Layout:
    ```text
    backend/
    ├── alembic/
    ├── app/
    │   ├── analytics/
    │   ├── api/
    │   ├── assistant/
    │   ├── auth/
    │   ├── chat/
    │   ├── database/
    │   │   ├── models/
    │   │   └── connection.py
    │   ├── grounding/
    │   ├── reporting/
    │   ├── config.py
    │   └── main.py
    ├── pyproject.toml
    └── Dockerfile
    ```
- [ ] **Environment Validation (`app/config.py`):**
  - Implement a Pydantic Settings class to validate required keys (`DATABASE_URL`, `GEMINI_API_KEY`, etc.) on start.
- [ ] **Database Connection & Models:**
  - Declare SQLAlchemy models mapping to the Supabase tables in `app/database/models/`.
  - Configure Alembic to manage database migrations (`alembic revision --autogenerate`).
- [ ] **Auth Middleware (`app/auth/dependencies.py`):**
  - Write a dependency that validates the Bearer JWT token from the Request header against Supabase Auth.
  - Expose `get_current_user` to yield the authenticated user model along with their `business_id` and role.

---

## Phase 3 — Frontend Setup & Onboarding Flow

Goal: Scaffold the React single-page app and build authentication and onboarding.

- [ ] **Scaffold Frontend:**
  - Create a Vite React TS app.
  - Install dependencies: Tailwind CSS, shadcn/ui components, Lucide React icons, and Recharts.
- [ ] **Create Routing & Environment config:**
  - Set up a router (e.g., `react-router-dom`) with Protected Route guards.
  - Define environment variables in `src/lib/env.ts` and initialize the Supabase client.
- [ ] **Onboarding Gate (`src/pages/onboarding.tsx`):**
  - If a logged-in user doesn't have a linked `business_id`, redirect them to the onboarding form.
  - Form inputs: Business name, description, industry, scale, location (city/address), phone, and logo/proof upload to Supabase Storage.
- [ ] **Staff Invitation (`src/pages/staff.tsx`):**
  - Form to invite other staff members by email and assign them roles (admin, staff, viewer).

---

## Phase 4 — Product Catalog & Transaction Ledgers

Goal: Log sales and purchases direct to Supabase from the frontend client.

- [ ] **Product Setup (`src/pages/products.tsx`):**
  - Screen to add products/items with default pricing, category, and units of measurement.
- [ ] **Ledger Forms & Lists (`src/pages/ledger.tsx`):**
  - **Record Sale:** Product selection, quantity (default to 1), unit price (pre-filled, but editable by admin/owner only), customer name, payment type (Cash, Card, Transfer, Debt).
  - **Record Purchase:** Vendor name, item name, quantity, unit price, payment type.
  - **Dynamic Total Calculation:** `total` should be marked as read-only and recalculated on the server-side via a Postgres trigger or generated column to prevent tampering.
- [ ] **Accounting Cycle Validation:**
  - Validate that an active `accounting_cycles` row exists for the current date. If not, prompt the owner to open a new cycle with a Balance Brought Forward entry.

---

## Phase 5 — Aggregations, Debtors & Analytics Dashboard

Goal: Provide real-time operational metrics and debt tracking.

- [ ] **Daily Summary Trigger:**
  - Write a Postgres database trigger that updates/upserts `daily_summaries` every time a transaction is inserted, updated, or deleted. This avoids costly raw transaction table scans when loading dashboards.
- [ ] **Debtors Ledger (`src/pages/debtors.tsx`):**
  - Screen listing customers who have outstanding balances from sales marked as "Debt".
  - Feature to record payments against outstanding debts.
- [ ] **Interactive Dashboard (`src/pages/dashboard.tsx`):**
  - Fetch aggregated statistics from `daily_summaries` directly.
  - Build charts (using Recharts) for income-vs-expenditure, top products, customer acquisition, and net profit.

---

## Phase 6 — AI Assistant (Chat & Grounding)

Goal: Build the FastAPI-hosted grounded chat service.

- [ ] **Chat Database Schema:**
  - Add tables for `chat_threads` and `chat_messages` in Supabase to persist user conversations.
- [ ] **PydanticAI Agent Configuration (`app/assistant/agent.py`):**
  - Initialize PydanticAI with a Gemini model.
  - Formulate a clear system instruction: "You are an expert SME accounting analyst. You only speak about figures that are retrieved from the tools. You do not extrapolate or make things up."
- [ ] **Analytical DB Queries (`app/analytics/queries.py`):**
  - Write parameterized Python functions to query `daily_summaries`, `sales`, `purchases`, and `debtors`, filtered strictly by the user's `business_id`.
- [ ] **Structured Agent Tools (`app/assistant/tools.py`):**
  - Bind functions to the PydanticAI agent as tools (e.g. `get_sales_summary`, `get_debtor_status`). The agent *cannot* execute raw SQL.
- [ ] **Grounding Validator (`app/grounding/validator.py`):**
  - Run post-processing on the model's text response. Compare every number/fact cited in the response with the exact outputs returned by the tools.
  - If a statistic cannot be matched or verified, redact/fail-closed the message with a placeholder: "I don't have verified data to answer that."
- [ ] **Chat Stream Route (`app/api/chat.py`):**
  - Implement a streaming endpoint (`POST /chat/stream`) yielding server-sent events (SSE) compatible with the frontend client.

---

## Phase 7 — Nightly Crons & Scheduled Reporting

Goal: Automated end-of-day ledger calculations, cycle transitions, and report delivery.

- [ ] **Nightly Aggregator (`app/analytics/aggregator.py`):**
  - Script to close out the day: calculate net position, verify all transactions are reconciled, and compute flags.
- [ ] **Cycle Transition Handler:**
  - Automatically close expired `accounting_cycles` (e.g., end of month) and carry forward the ending balance (net cash + debt adjustments) into a new cycle.
- [ ] **PDF Generator (`app/reporting/pdf.py`):**
  - Create an HTML template styled with standard CSS.
  - Use `WeasyPrint` to compile it to a professional PDF showing the cycle's balance sheet, sales performance, and audit trail flags.
- [ ] **Telegram Bot Delivery (`app/reporting/telegram.py`):**
  - Package the PDF and a Gemini-written textual summary (fed only with high-level summaries).
  - Post the payload to the Telegram bot endpoint using a configured Chat ID.
- [ ] **Cron Endpoints:**
  - Expose `/cron/nightly` and `/cron/cycle-close` in the backend. Secure them using a custom shared secret token header to ensure only Cloud Scheduler can trigger them.

---

## Phase 8 — Anomaly & Fraud Detection

Goal: Proactively flag suspicious activities for the business owner.

- [ ] **Fraud Engine Rules (`app/analytics/anomaly.py`):**
  - Identify transactions matching these warning criteria:
    - **Price Override:** Item unit price deviates significantly from `products.default_price`.
    - **Unusual Hours:** Transaction logged during off-hours (e.g., between 10 PM and 5 AM).
    - **Void & Re-enter:** A transaction was deleted and immediately recreated with different numbers.
    - **Quantity Spike:** Quantity is standard deviations higher than normal product volume.
- [ ] **Flag Propagation:**
  - Set `is_flagged = true` on the database row and log a notification detail in the `audit_trail` table.
- [ ] **Admin Dashboard Notification:**
  - Add an "Alerts & Anomalies" panel on the dashboard UI visible only to `owner` or `admin` roles.

---

## Phase 9 — Deployment & Production Launch

- [ ] **Frontend Deployment (Vercel):**
  - Link repository to Vercel. Set Vite environment variables in Vercel settings. Configure custom rewrites in `vercel.json` if needed.
- [ ] **Backend Deployment (Google Cloud Run):**
  - Package the backend using a Dockerfile.
  - Push image to Google Artifact Registry and deploy to Cloud Run.
  - Store database URLs, API credentials, and Telegram tokens securely in Google Secret Manager.
- [ ] **Cloud Scheduler Config:**
  - Setup a Google Cloud Scheduler job to hit `/cron/nightly` every night at 11:59 PM with the authorization header token.
- [ ] **Production Database Migrations:**
  - Run Alembic migrations against the production database.
  - Set up automated daily backups in Supabase.
- [ ] **End-to-End Smoke Test:**
  - Sign up a new user, onboard a business, add products, log sales/purchases, run the nightly aggregator manually, check for the Telegram report, and run AI analytics queries.
