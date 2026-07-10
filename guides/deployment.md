# Deployment — Vercel + Google Cloud Run

This app deploys as two independently hosted pieces, per the PRD's stated
hosting rationale (serverless, pay-per-use, cost-efficient for a bursty
AI + nightly-cron workload):

- **Frontend** (`frontend/`) → **Vercel** — static Vite build.
- **Backend** (`backend/`) → **Google Cloud Run** — FastAPI + Uvicorn
  container, triggered by Google Cloud Scheduler for nightly jobs.

Supabase stays hosted at Supabase in both cases — no Vercel Postgres, no
Cloud SQL.

## Before you deploy

Have these ready:

- A Git repo with this project pushed.
- A Supabase project from [supabase-setup](supabase-setup.md), with
  migrations applied.
- A Gemini API key.
- A Telegram bot token.
- Verify the current gcloud CLI / Vercel CLI commands against the vendors'
  own docs before running them — CLI flags and defaults change between
  releases and shouldn't be trusted verbatim from any static doc,
  including this one.

Use the **direct** Supabase Postgres connection string for `DATABASE_URL`,
not the transaction pooler URL.

## Frontend — Vercel

1. Import the repo into Vercel, set the project root to `frontend/`.
2. Framework preset: Vite.
3. Set build-time environment variables (these get baked into the static
   build, so set them before the first production build):

   ```text
   VITE_API_BASE_URL=https://your-backend-url.run.app
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

4. Deploy. Note the resulting production URL — the backend's
   `ALLOWED_ORIGINS` needs it.

## Backend — Google Cloud Run

1. Write a `backend/Dockerfile` that installs system dependencies WeasyPrint
   needs (Pango, cairo, etc. via `apt-get`) in addition to the Python deps —
   this differs from the reference template's Dockerfile, which had no PDF
   rendering requirement.
2. Build and deploy:

   ```bash
   gcloud run deploy sme-biz-analyst-backend \
     --source backend \
     --region <region-near-nigeria> \
     --allow-unauthenticated \
     --min-instances 0
   ```

   Check current Cloud Run region options and pricing at deploy time —
   don't assume the region named in any PRD draft is still the best/only
   choice.

3. Set environment variables and secrets (prefer Secret Manager for
   anything sensitive rather than plain env vars):

   ```bash
   gcloud run services update sme-biz-analyst-backend \
     --set-env-vars ALLOWED_ORIGINS=https://your-frontend.vercel.app \
     --set-secrets \
       SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,\
   GEMINI_API_KEY=gemini-api-key:latest,\
   TELEGRAM_BOT_TOKEN=telegram-bot-token:latest,\
   DATABASE_URL=database-url:latest
   ```

4. Run migrations against production before or as part of first deploy:

   ```bash
   uv run alembic upgrade head
   ```

5. Confirm the health check:

   ```text
   https://your-backend-url.run.app/health
   ```

## Google Cloud Scheduler — nightly jobs

Create two scheduler jobs pointing at secured backend endpoints (protect
these with a shared secret or Cloud Run's built-in IAM invoker auth, not an
open route):

- Nightly aggregation → the `daily_summaries` rollup endpoint.
- Cycle-close → the cycle-close + report-generation endpoint, on whatever
  cadence a given business's `accounting_cycles.period_type` requires.

```bash
gcloud scheduler jobs create http sme-biz-nightly-aggregation \
  --schedule="0 0 * * *" \
  --uri="https://your-backend-url.run.app/reports/aggregate" \
  --http-method=POST \
  --oidc-service-account-email=<scheduler-invoker>@<project>.iam.gserviceaccount.com
```

Verify the current recommended way to authenticate Scheduler → Cloud Run
(OIDC token vs. a shared-secret header) against Google's docs — this has
had more than one supported pattern over time.

## Supabase auth URLs

Authentication → URL Configuration:

- **Site URL:** your Vercel production URL.
- **Redirect URLs:** add `https://your-frontend.vercel.app/*`.

Keep `http://localhost:5173/*` for local development too.

## Final check

1. Open the Vercel URL, sign up, onboard a business.
2. Log a sale, confirm the dashboard updates.
3. Ask the AI assistant a question, confirm a grounded, cited answer.
4. Manually trigger the aggregation endpoint (or wait for the schedule) and
   confirm a Telegram message + PDF arrive.
5. `https://your-backend-url.run.app/health` returns `{"status":"ok"}`.
