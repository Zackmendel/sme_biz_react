# Frontend — agent notes

This is the React SPA for SME Biz Analyst. Read [../AGENTS.md](../AGENTS.md)
first — universal building rules live there. This file adds
frontend-specific conventions.

## Stack

- **Plain React SPA** (Vite + TypeScript, strict). **Not Next.js** — do not
  suggest Next, SSR, server components, or file-based routing.
- **Tailwind CSS** for styling. No CSS modules, styled-components, Emotion,
  or `.module.css` files for component styles. Global theme tokens live in
  `src/index.css`.
- **shadcn/ui** for UI primitives. Add components with
  `pnpm dlx shadcn@latest add <n>` — don't hand-roll what shadcn already
  ships.
- **React Router** for routing.
- **Recharts** for dashboard charts (income vs. expenditure, trend lines).
  This app has real charting needs the reference template didn't.
- **`@supabase/supabase-js`** for auth (email only) **and** direct CRUD
  against `sales`, `purchases`, `products`, `debtors`, and reads from
  `daily_summaries`.

## Package manager

**`pnpm` only.** Do not use `npm install` or `yarn add`. If you see
`package-lock.json` or `yarn.lock` appear, that's a bug — delete it.

## Two data paths — keep them visibly separate

- `src/lib/supabase-data.ts` (or similar): direct Supabase table access for
  Sales, Purchases, Products, Debtors CRUD and `daily_summaries` dashboard
  reads. RLS is the security boundary here, not this code.
- `src/lib/api.ts`: the FastAPI client for AI chat (`/chat/stream`) and
  anything reporting-related. Handles base URL, JSON, Supabase bearer
  token, timeouts, typed `ApiError`s.

Don't blur these — a component reading `daily_summaries` should call
Supabase directly, not proxy through FastAPI, and the chat UI should never
call Supabase directly for AI answers.

## Dependency policy

See universal policy in [../AGENTS.md](../AGENTS.md). Frontend-specific:

- **HTTP (to FastAPI):** native `fetch` through `src/lib/http.ts` +
  `src/lib/api.ts`. **No axios, ky, got, superagent, redaxios.**
- **Dates:** native `Date` and `Intl.DateTimeFormat`. No moment, dayjs,
  date-fns unless genuinely needed.
- **Utilities:** native `Array` / `Object` / `Map` methods. No lodash,
  ramda.
- **State:** `useState` / `useReducer` / `useContext` first.
- **Forms:** native `<form>` + `FormData` first — this app has a lot of
  data-entry forms (sales, purchases, onboarding, staff invites); resist
  reaching for a form library until the plain approach is genuinely
  painful.
- **Charts:** Recharts — already a declared dependency, don't add a second
  charting library.
- **Validation:** only add a schema library when actually needed for
  runtime validation at boundaries (e.g. mirroring the DB check
  constraints — quantity > 0, price >= 0 — client-side for fast feedback).

## Layout (to be created during build)

```text
frontend/
├── src/
│   ├── components/        # App components. shadcn primitives under components/ui/
│   │   ├── sales/          # Sales entry form, list, filters
│   │   ├── purchases/      # Purchases entry form, list, filters
│   │   ├── dashboard/      # Metric cards, charts, cycle filter
│   │   ├── chat/           # AI assistant drawer, messages, row citations
│   │   └── onboarding/     # Business setup, product list setup, staff invites
│   ├── lib/                # http, api, supabase, supabase-data, env
│   ├── pages/               # Route-level components
│   ├── App.tsx              # Router
│   ├── main.tsx
│   └── index.css
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

Keep imports consistent with the `@/*` alias.

## Code style (frontend-specific)

- **TypeScript strict.** No `any` unless there's no alternative; prefer
  `unknown` and narrow.
- **Small, composable functions and components** over clever abstractions.
- **One component = one file.**
- **Tailwind classes inline.**
- **Mirror server-side constraints in form validation** (quantity > 0,
  price >= 0, discount >= 0) so users get instant feedback, but never treat
  client-side validation as the source of truth — the DB check constraints
  and computed `total` are.

## Configuration

- All env reads go through `src/lib/env.ts`. Never read
  `import.meta.env.X` directly in components.
- Env vars are prefixed `VITE_`.

## Backend integration

- AI chat and reporting-triggered calls go through `src/lib/api.ts` to
  FastAPI, with the Supabase bearer token injected automatically.
- Everything else (sales, purchases, products, debtors, dashboard reads)
  goes through `src/lib/supabase-data.ts` directly to Supabase.

## Testing

**No frontend tests.** Do not write `*.test.ts` / `*.test.tsx` files or
introduce a test runner. Verify manually in the browser plus
`pnpm tsc --noEmit` and `pnpm lint`.

## Anti-patterns (rejected)

- Reading `import.meta.env.X` directly outside `lib/env.ts`.
- Importing an HTTP library when `fetch` would do.
- Proxying plain Supabase CRUD through FastAPI "for consistency" — it adds
  latency and a maintenance burden for no security benefit given RLS.
- Trusting a client-computed `total` instead of what the DB actually
  stored after the trigger/generated column runs.
- `any` annotations to silence the type-checker.
- Reaching for Next.js, SSR, or any framework that requires a Node server
  in front of the SPA.
