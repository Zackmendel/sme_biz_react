# SME Biz Analyst

AI-powered accounting and business intelligence for small Nigerian businesses.

This repository consists of:
- **`backend/`**: A FastAPI application powered by SQLAlchemy, Alembic, and PydanticAI.
- **`frontend/`**: A mobile-first Vite + React + TypeScript SPA.

---

## Architecture & Tenancy Model
- **Tenancy**: Single-owner-per-tenant, multiple tenants. Multiple businesses per owner account are **not supported**. A user's profile maps to exactly one business via `users.business_id`.
- **Database & CRUD Boundary**:
  - The frontend reads/writes directly to Supabase (`sales`, `purchases`, `products`, `debtors`) using Row-Level Security (RLS) policies based on user business ID.
  - The FastAPI backend handles heavy/secured tasks: AI chat orchestration, EOD nightly jobs, PDF report generation, and Telegram bot notification delivery.

---

## Local Setup & Run Instructions

### 1. Prerequisites
- **Node.js**: `v20` or higher
- **PNPM**: `v9` or higher
- **Python**: `v3.12` or higher
- **`uv`**: for Python package management

### 2. Backend Setup
1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```
   Set the following variables in backend `.env`:
   - `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (direct/transaction pooled Supabase Postgres URL)
   - `GEMINI_API_KEY` (Gemini API access)
   - `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`
   - `ALLOWED_ORIGINS` (default: `http://localhost:5173`)

3. Install dependencies and set up the virtual environment using `uv`:
   ```bash
   uv sync
   ```

4. Run the database migrations to set up the schema:
   ```bash
   uv run alembic upgrade head
   ```

5. Launch the FastAPI development server:
   ```bash
   uv run uvicorn app.main:app --reload --port 8000
   ```

### 3. Frontend Setup
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   ```
   Set the following variables in frontend `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BACKEND_URL` (default: `http://localhost:8000`)

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Launch the frontend development server:
   ```bash
   pnpm dev
   ```

5. Open your browser to `http://localhost:5173` to interact with the application.

---

## Production Deployment

This application deploys in two parts:
- **Frontend** (`frontend/`) is hosted on **Vercel** as a static Vite build.
- **Backend** (`backend/`) is hosted on **Google Cloud Run** as a containerized FastAPI application.

### 1. Backend Deployment (Google Cloud Run)

To deploy the backend to Google Cloud Run:

1. Build and deploy the container from the `backend/` directory:
   ```bash
   gcloud run deploy sme-biz-analyst-backend \
     --source backend \
     --region europe-west1 \
     --allow-unauthenticated \
     --min-instances 0
   ```
   *(Replace `europe-west1` with your target GCP region).*

2. Configure environment variables and secrets (use Secret Manager for database credentials and tokens):
   ```bash
   gcloud run services update sme-biz-analyst-backend \
     --region europe-west1 \
     --set-secrets \
       SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,\
       GEMINI_API_KEY=gemini-api-key:latest,\
       TELEGRAM_BOT_TOKEN=telegram-bot-token:latest,\
       DATABASE_URL=database-url:latest
   ```

### 2. Frontend Deployment (Vercel)

1. Connect your repository to Vercel and select the root directory as `frontend/`.
2. Select **Vite** as the framework preset.
3. Configure the following environment variables in the Vercel dashboard:
   - `VITE_API_URL`: Your deployed backend Cloud Run URL (e.g., `https://sme-biz-analyst-backend-xxxxx.a.run.app`).
   - `VITE_SUPABASE_URL`: Your Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous public key.
4. Deploy the project. Note your frontend domain (e.g., `https://sme-biz-react.vercel.app`).

### 3. Configure CORS on Backend (Important)

Because `gcloud` has complex and fragile command-line escaping rules for commas and colons in URLs, the safest and easiest way to configure `ALLOWED_ORIGINS` is via the **Google Cloud Console UI**:

1. Go to the **Google Cloud Console** and navigate to **Cloud Run**.
2. Click on your service: **`sme-biz-analyst-backend`**.
3. Click **Edit & Deploy New Revision** at the top.
4. Scroll down to the **Container(s)** settings and click the **Variables & Secrets** tab.
5. Under **Environment variables**, look for **`ALLOWED_ORIGINS`** (or click **Add Variable** if it's not there).
6. Set the value to:
   ```text
   https://sme-biz-react.vercel.app,http://localhost:5173
   ```
   *(No quotes or backslash escaping are needed in the UI).*
7. Click **Deploy** at the bottom of the page.


