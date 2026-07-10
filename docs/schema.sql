-- SME Biz Analyst — canonical schema
--
-- This reconciles the three PRD drafts and the existing Supabase ER diagram
-- into one source of truth. It supersedes all three PRDs' schema sections.
-- Implement this via SQLAlchemy models + Alembic migrations, per
-- docs/architecture.md — do not hand-create tables in the Supabase dashboard.
--
-- Naming carried over as-is from the existing project because a working
-- Streamlit app and ER diagram already depend on these exact table/column
-- names: businesses, users, products, sales, purchases, accounting_cycles,
-- debtors, daily_summaries, audit_trail.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type nigeria_city_list as enum (
  'Minna', 'Suleja', 'Bida', 'Kontagora', 'Lapai', 'Mokwa',
  'New Bussa', 'Agaie', 'Paiko', 'Kagara', 'Lagos', 'Abuja',
  'Port Harcourt', 'Kano', 'Ibadan', 'Enugu', 'Kaduna', 'Jos', 'Ilorin'
);
-- Growth note: this enum is a known scaling limitation (Phase 1 is Niger
-- State + major-city focused per the PRD). Phase 2+ should replace it with a
-- free-text `city text` column, or a `cities` reference table, before
-- onboarding businesses outside the seeded list. Don't let this enum block
-- onboarding — track it as tech debt in todos.md Phase 8.

create type business_industry as enum (
  'retail', 'food_services', 'services', 'distributors', 'IT'
);

create type business_scale as enum (
  'sole_trader', 'micro', 'small', 'medium'
);

create type role_enum as enum ('owner', 'admin', 'staff', 'viewer');

create type status_enum as enum (
  'permanent', 'part_time', 'intern', 'contract'
);

create type period_enum as enum (
  'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
);

create type payment_type as enum ('cash', 'transfer', 'card', 'credit');

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------

create table businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_name text,
  description text,
  industry business_industry not null,
  scale business_scale not null,
  phone text,
  email text unique,
  city nigeria_city_list not null,
  address text,
  proof_url text,
  created_at timestamptz not null default now()
);

alter table businesses enable row level security;

create index idx_businesses_name on businesses using gin (name extensions.gin_trgm_ops);
create index idx_businesses_city_industry on businesses (city, industry);

-- ---------------------------------------------------------------------------
-- users (one row per Supabase auth.users id — profile + RBAC, not auth itself)
-- ---------------------------------------------------------------------------

create table users (
  id uuid primary key references auth.users (id) on delete cascade,
  business_id uuid references businesses (id) on delete cascade,
  email text unique not null,
  first_name text,
  last_name text,
  role role_enum not null default 'viewer',
  status status_enum,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table users enable row level security;

create index idx_users_role on users (role);
create index idx_users_status on users (status);
create index idx_users_business_id on users (business_id);

-- New auth.users rows get a `users` profile row automatically (role defaults
-- to 'viewer' until an owner/admin assigns a business_id + real role during
-- onboarding — see the onboarding flow in todos.md Phase 2).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role, is_active)
  values (new.id, new.email, 'viewer', true);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- products (the shared item list behind Sales/Purchases dropdowns)
-- ---------------------------------------------------------------------------

create table products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name text not null,
  default_price numeric(12, 2) not null check (default_price >= 0),
  unit text,
  category text,
  is_archived boolean not null default false
);

alter table products enable row level security;

create index idx_products_business_id on products (business_id);

-- ---------------------------------------------------------------------------
-- accounting_cycles (daily/weekly/monthly/quarterly/yearly reporting periods)
-- ---------------------------------------------------------------------------

create table accounting_cycles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  period_type period_enum not null,
  start_date date not null,
  end_date date not null,
  balance_brought_forward numeric(14, 2) not null default 0,
  debts_accrued numeric(14, 2) not null default 0,
  is_closed boolean not null default false
);

alter table accounting_cycles enable row level security;

create index idx_accounting_cycles_business_id on accounting_cycles (business_id);
create unique index idx_accounting_cycles_open_period
  on accounting_cycles (business_id, period_type)
  where not is_closed;

-- ---------------------------------------------------------------------------
-- sales
-- ---------------------------------------------------------------------------

create table sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id uuid not null references users (id),
  cycle_id uuid not null references accounting_cycles (id),
  product_id uuid references products (id),
  item_name text not null, -- always populated: copied from product or free text for 'Other'
  customer_details text,
  quantity numeric(12, 2) not null check (quantity > 0),
  price_per_unit numeric(12, 2) not null check (price_per_unit >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  total numeric(14, 2) not null, -- (quantity * price_per_unit) - discount; enforced by trigger, not app code
  payment_type payment_type not null default 'cash',
  created_at timestamptz not null default now(),
  is_flagged boolean not null default false -- set by fraud/anomaly checks, never by the user
);

alter table sales enable row level security;

create index idx_sales_business_id_created_at on sales (business_id, created_at);
create index idx_sales_cycle_id on sales (cycle_id);

-- ---------------------------------------------------------------------------
-- purchases (mirrors sales; vendor instead of customer, no discount/payment_type)
-- ---------------------------------------------------------------------------

create table purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id uuid not null references users (id),
  cycle_id uuid not null references accounting_cycles (id),
  product_id uuid references products (id),
  item_name text not null,
  vendor_details text,
  quantity numeric(12, 2) not null check (quantity > 0),
  price_per_unit numeric(12, 2) not null check (price_per_unit >= 0),
  total numeric(14, 2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  is_flagged boolean not null default false
);

alter table purchases enable row level security;

create index idx_purchases_business_id_created_at on purchases (business_id, created_at);
create index idx_purchases_cycle_id on purchases (cycle_id);

-- ---------------------------------------------------------------------------
-- debtors (customers who owe the business money — distinct from purchases/vendors)
-- ---------------------------------------------------------------------------

create table debtors (
  id bigint generated always as identity primary key,
  business_id uuid not null references businesses (id) on delete cascade,
  customer_name text not null,
  amount bigint not null check (amount > 0), -- kobo/smallest-unit integer, not float
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table debtors enable row level security;

create index idx_debtors_business_id on debtors (business_id);

-- ---------------------------------------------------------------------------
-- daily_summaries (pre-computed — the table the dashboard AND the AI both read)
-- ---------------------------------------------------------------------------

create table daily_summaries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  summary_date date not null,
  total_sales numeric(14, 2) not null default 0,
  total_purchases numeric(14, 2) not null default 0,
  net numeric(14, 2) not null default 0,
  transaction_count integer not null default 0,
  unique_customers integer not null default 0,
  top_item text,
  updated_at timestamptz not null default now(),
  unique (business_id, summary_date)
);

alter table daily_summaries enable row level security;

create index idx_daily_summaries_business_id_date on daily_summaries (business_id, summary_date);

-- ---------------------------------------------------------------------------
-- audit_trail (immutable — no application code, including the service role,
-- may UPDATE or DELETE a row here; INSERT only, via trigger)
-- ---------------------------------------------------------------------------

create table audit_trail (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  user_id uuid references users (id),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  before_value jsonb,
  after_value jsonb,
  changed_at timestamptz not null default now()
);

alter table audit_trail enable row level security;

create index idx_audit_trail_business_id_changed_at on audit_trail (business_id, changed_at);
create index idx_audit_trail_table_record on audit_trail (table_name, record_id);

-- Explicit RLS + trigger-immutability rules, HNSW-equivalent indexes, the
-- daily_summaries upsert trigger, and the audit_trail write trigger all need
-- hand-written Alembic operations (autogenerate won't produce them
-- reliably) — see docs/architecture.md "Schema Management" and
-- docs/todos.md Phase 1.
