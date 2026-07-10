# Frontend setup

Same rationale as the reference template: a Vite + React SPA, not Next.js —
this is an authenticated internal-style app (from the owner's point of
view) that needs fast iteration and a clean connection to Supabase directly
for CRUD, plus FastAPI for AI chat and reporting.

## Init (from empty `frontend/`)

```bash
cd frontend
pnpm create vite . --template react-ts
pnpm install
pnpm add react-router-dom @supabase/supabase-js recharts
pnpm add -D tailwindcss @tailwindcss/vite
pnpm dlx shadcn@latest init
```

`recharts` is added here (not in the reference template) because the
dashboard is a core screen for this app — income vs. expenditure charts,
trend lines — where the document-copilot template had no charting needs.

## Run

```bash
cd frontend
pnpm install
pnpm dev
```

## Check

```bash
pnpm tsc --noEmit
pnpm lint
```

## Direct Supabase CRUD

Unlike the reference template — where the frontend never writes product
data directly — this app's Sales, Purchases, Products, and Debtors screens
read and write Supabase directly via `@supabase/supabase-js`, relying on RLS
for tenant isolation. Only AI chat and reporting-related calls go through
`src/lib/api.ts` to FastAPI. Keep these two paths clearly separated in code
(e.g. `src/lib/supabase-data.ts` for direct table access vs. `src/lib/api.ts`
for the FastAPI client) so it's obvious at a glance which calls hit Supabase
and which hit the backend.
