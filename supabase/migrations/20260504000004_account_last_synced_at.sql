-- Track when each account's transactions/balances were last successfully synced.
--
-- Surfaces in the Accounts UI as "Synced 4m ago". Lives on accounts (rather
-- than plaid_items) because the UI renders per-account and the existing
-- plaid_items table has column-level grants that would need editing too.
-- All accounts under one Plaid item are stamped together at the end of a
-- successful sync (see supabase/functions/_shared/sync-logic.ts).

alter table public.accounts
  add column if not exists last_synced_at timestamptz;
