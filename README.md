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
