-- =====================================================================
-- Transaction renames
--
-- Adds a user-controlled `display_name` override on top of Plaid's
-- `merchant_name`, plus a per-user `merchant_renames` lookup table that
-- stores "for vendor X, always show Y" rules. Rules are applied
-- retroactively by the renameVendor() mutation and prospectively by the
-- Plaid sync job.
-- =====================================================================

alter table public.transactions
  add column if not exists display_name text;

create table public.merchant_renames (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  normalized_merchant text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, normalized_merchant)
);
create index merchant_renames_owner_idx on public.merchant_renames(owner_user_id);
create trigger merchant_renames_updated_at before update on public.merchant_renames
  for each row execute function set_updated_at();

alter table public.merchant_renames enable row level security;

create policy merchant_renames_owner_all on public.merchant_renames
  for all to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());
