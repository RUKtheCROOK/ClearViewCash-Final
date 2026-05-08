-- Space-level sharing defaults.
--
-- Per-account sharing already exists (account_shares + account_share_visibilities).
-- The redesigned Spaces & Members screen exposes four space-level toggles that
-- describe "what this space allows by default":
--   * share_balances_default      — new accounts shared into the space share balances
--   * share_transactions_default  — new accounts shared into the space share txn details
--   * members_can_edit            — non-owners can edit budgets/bills in this space
--   * mine_shared_enabled         — surface the per-transaction "Mine vs Shared" flag
--
-- These are guidance defaults for new account shares + UI affordances. Per-account
-- overrides live in account_shares (existing). Anyone with rename permission on the
-- space can flip these (mirrors the existing rename RLS policy).
-- =====================================================================

alter table public.spaces
  add column if not exists share_balances_default boolean not null default true,
  add column if not exists share_transactions_default boolean not null default true,
  add column if not exists members_can_edit boolean not null default true,
  add column if not exists mine_shared_enabled boolean not null default true;
