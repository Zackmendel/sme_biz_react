# Supabase setup

We use Supabase for **Postgres** (businesses, users, products, sales,
purchases, accounting cycles, debtors, daily summaries, audit trail) and
**Auth** (email sign-in only). Set up a **new** project for this rebuild —
don't reuse the existing Streamlit app's project, so that Alembic migrations
are the source of truth from the first commit.

## 1. Create an account & project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Open [New project](https://supabase.com/dashboard/new).
3. Name it something like `sme-biz-analyst` (or `promise-business-tech`).
4. Set and save a database password.
5. Pick a region close to your users (Nigeria) — check what's currently
   closest at supabase.com/docs/guides/platform/regions when you create the
   project, since available regions change.
6. Create and wait for the project to go healthy.

## 2. Collect credentials

| Value | Where to find it | Used by |
| ----- | ---------------- | ------- |
| **Project URL** | Project Settings → API | Frontend + backend |
| **anon (public) key** | Same page | Frontend (browser-safe) |
| **service_role (secret) key** | Same page | Backend only — never expose to the browser |
| **Direct database connection string** | Project Settings → Database | Alembic migrations |
| **Database password** | Set at project creation | Direct Postgres connection |

Keep `service_role` out of git, client bundles, and frontend env files.

## 3. Auth settings

Email auth only — no SSO for MVP.

1. Dashboard → Authentication → Providers → leave Email enabled.
2. For local dev, Authentication → Email → you may disable "Confirm email"
   so sign-up works without inbox access. Re-enable before production
   (see the deployment guide).

## 4. Storage

Create a bucket for proof-of-business uploads (e.g. `business-documents`),
private by default, with an RLS policy scoping access to the owning
business's members.

## 5. Database schema management

This project uses Alembic from the Python backend to manage schema — do not
hand-create tables in the Supabase dashboard. `docs/schema.sql` is the
canonical reference; turn it into SQLAlchemy models + a reviewed Alembic
migration (see [backend-setup](backend-setup.md)).

Alembic migrations need to create, in order:

- All enums (`nigeria_city_list`, `business_industry`, `business_scale`,
  `role_enum`, `status_enum`, `period_enum`, `payment_type`)
- The `pg_trgm` extension
- Every table in `docs/schema.sql`, with foreign keys
- The `handle_new_user()` function + `on_auth_user_created` trigger
- RLS enabled + policies on every table
- The `daily_summaries` upsert trigger
- The `audit_trail` write trigger with an INSERT-only RLS policy

Use the **direct/session** database connection string for Alembic, not the
transaction pooler URL.

```bash
uv run alembic upgrade head
```

## Next steps

- [Backend setup](backend-setup.md)
- [Frontend setup](frontend-setup.md)
- [Deployment](deployment.md)
