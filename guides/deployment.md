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

## GitHub Actions — Nightly Job Scheduler (Recommended)

To run the nightly aggregation and close cycles at midnight, configure a GitHub Actions workflow that pings your deployed Cloud Run endpoint.

1. Create a file `.github/workflows/nightly-job.yml`:
   ```yaml
   name: Nightly Job Trigger
   on:
     schedule:
       - cron: '0 0 * * *' # Every night at midnight UTC
     workflow_dispatch: # Allows manual trigger from GitHub UI
   jobs:
     trigger:
       runs-on: ubuntu-latest
       steps:
         - name: Ping backend API
           run: |
             curl -X POST "https://your-backend-url.run.app/reports/trigger-daily" \
                  -H "x-scheduler-token: ${{ secrets.SCHEDULER_API_TOKEN }}" \
                  --fail --show-error
   ```

2. Go to your GitHub Repository Settings → **Secrets and variables** → **Actions** → **New repository secret**.
3. Add a secret named `SCHEDULER_API_TOKEN` and set its value to your configured scheduler secret (matches the `SCHEDULER_API_TOKEN` environment variable on the Cloud Run backend).

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
