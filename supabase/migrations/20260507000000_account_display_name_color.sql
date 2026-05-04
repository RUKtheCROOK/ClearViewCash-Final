-- Per-user overrides for account presentation. Plaid-supplied `name` is kept
-- as the source of truth; UI prefers `display_name` when set. `color` is a
-- hex string (e.g. "#0EA5E9") used to tint the account card header.

alter table public.accounts
  add column if not exists display_name text,
  add column if not exists color text;
