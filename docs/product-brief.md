# Product brief — SME Biz Analyst (Promise Business Tech)

## The product

SME Biz Analyst is a mobile-first accounting, reporting, and AI-assisted
business-intelligence app for small and micro Nigerian businesses — retail
shops, mini supermarkets, food vendors, fashion businesses, and local
distributors. It replaces notebooks, memory, WhatsApp chats, and spreadsheets
with a structured, auditable record of every sale and purchase.

## The problem

Small business owners currently track sales and expenses informally. This
causes missing transaction history, inaccurate profit figures, no visibility
into performance, fraud opportunities (staff under/over-recording, price
overrides, deleted entries), and no way to get a regular performance summary
without hiring an accountant.

## What it does

- Owners and staff log sales and purchases against a shared product list.
- Every entry rolls into a running accounting cycle (day/week/month/quarter/
  year) with a carried-forward opening balance and, if expenses exceeded
  income, a carried-forward debt.
- A nightly job pre-aggregates the day's activity into `daily_summaries` so
  dashboards and AI queries never have to scan raw transaction history.
- An AI assistant answers plain-English questions about the business
  ("what were my sales yesterday", "who owes me money", "which days are
  consistently slow") grounded only in the business's own recorded data.
- Every insert, update, and delete is captured in an append-only audit trail,
  which also powers anomaly/fraud flags (price overrides, off-hours entries,
  deleted-then-reentered records, unusual quantity spikes).
- Reports are delivered automatically via Telegram at the end of each cycle,
  with a PDF export available on demand.

## Target users

- **Primary:** the business owner — full visibility and control.
- **Secondary:** staff who enter daily sales/purchases under permissions the
  owner defines (`role_enum`: owner, admin, staff, viewer).

## What "trust" means here

This app's entire value proposition is being a reliable record of the
business's money. Concretely:

- The AI **never invents figures**. If the data doesn't support an answer,
  it says so — it does not estimate or extrapolate silently.
- Every AI answer traces back to specific rows the backend actually queried
  (a date, a cycle, a set of sales/purchases) — the accounting-domain
  equivalent of "cite the filing and the page."
- The AI **never writes to the ledger.** It reads and explains; it does not
  create, edit, or delete sales, purchases, or balances.
- Audit logs are append-only. No user, including an owner or an admin
  account, can edit or delete them.

A wrong but confident number is worse than "I don't have enough data to
answer that" — it's someone's real cash position.

## Example owner questions

1. What were my total sales yesterday, and how does that compare to the
   same weekday last month?
2. Who are my top 5 customers this quarter by amount spent?
3. Which vendor gives me the best price on rice?
4. Which days of the week consistently have the lowest sales?
5. Do I have any debtors who haven't paid in over 30 days?
6. Were there any suspicious transactions this week — price overrides,
   entries outside business hours, or unusually large quantities?
7. What's my net position for this cycle, and am I carrying forward a debt?
8. Which products are my highest earners this month?

## Constraints

- Users: individual small business owners and their staff — each business is
  its own isolated tenant (unlike Driftwood-style multi-analyst/one-firm
  setups, here it's one-owner-per-tenant, many tenants).
- Currency: Naira (₦). Nigerian English as default language.
- Login: email/password via Supabase Auth. No SSO requirement for MVP.
- Delivery channel for automated reports: Telegram only for MVP (per the PRD;
  WhatsApp/email are explicitly future scope, not MVP).
- Offline-tolerant entry is a stated goal (queue locally, sync on
  reconnect) — flagged as a later-phase item, not MVP, since it changes the
  frontend's data layer significantly (see todos.md).
- Hosting must be low/no-maintenance — no dedicated infra team.

## Out of scope for MVP

- Multi-branch support, multi-currency.
- WhatsApp/email report delivery (Telegram only).
- Predictive/forecasting AI (stock depletion prediction, sales forecasting).
- Two-way Telegram bot (owner messaging the bot directly) — inbound webhook
  handling is a Phase 2 item.
- Native mobile app — mobile-first responsive web only for MVP.

## Definition of done (MVP)

A business owner can, end to end: sign up, complete business + product setup,
log sales and purchases for a full accounting cycle, see a live dashboard,
receive an automated Telegram report at cycle close, and ask the AI assistant
at least the example questions above and get answers grounded in their own
recorded data — with zero invented figures.
