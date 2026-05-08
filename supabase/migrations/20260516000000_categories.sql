-- User-managed categories.
--
-- Replaces the freeform-text + hardcoded-9-kind system that previously powered
-- transactions / transaction_splits / budgets / bills / income_events. Each
-- space gets its own taxonomy (auto-seeded by trigger on space insert with a
-- 17-row starter pack). Users can create, rename, recolor, archive and reorder
-- their own categories from the new /settings/categories surface.
--
-- Strategy
--   * `categories` is space-scoped; RLS mirrors `budgets`.
--   * `seed_key` is a stable handle for Plaid PFC mapping that survives renames.
--   * `is_system` rows can be renamed/recolored but not hard-deleted (delete
--     trigger raises). Soft-archive via `archived_at` is always allowed.
--   * Every consumer table (transactions, transaction_splits, budgets, bills,
--     income_events) gets a nullable `category_id` FK alongside the existing
--     `category` text column. New writers populate both; the text column is a
--     denormalized read-cache + compatibility shim. A follow-up migration will
--     drop the text columns once the FK-only release has baked.
--   * Backfill creates one category per (space, distinct text) pair, then
--     resolves the FKs via case-insensitive name lookup. Transactions are
--     resolved against the owner's `default_space_id` (transactions are
--     owner-scoped and may render in multiple spaces — the API client unions
--     across spaces at read time).
--
-- This file is written to be safely re-runnable: every DDL uses
-- `if not exists` guards (or DO blocks for enums/policies that lack one) so
-- a partial application can be picked up where it left off.

-- =====================================================================
-- 1. Enum + table
-- =====================================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'category_kind_t') then
    create type category_kind_t as enum ('expense', 'income', 'transfer');
  end if;
end $$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null check (length(name) between 1 and 40),
  icon text not null check (length(icon) between 1 and 32),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  kind category_kind_t not null default 'expense',
  sort_order integer not null default 0,
  archived_at timestamptz,
  is_system boolean not null default false,
  seed_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists categories_space_name_uniq
  on public.categories (space_id, lower(name)) where archived_at is null;
create unique index if not exists categories_space_seed_key_uniq
  on public.categories (space_id, seed_key) where seed_key is not null;
create index if not exists categories_space_idx on public.categories (space_id, sort_order);

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
  for each row execute function set_updated_at();

-- =====================================================================
-- 2. Block hard-deletion of system rows; UI must archive instead
-- =====================================================================
create or replace function public.guard_category_delete()
returns trigger
language plpgsql
as $$
begin
  if old.is_system then
    raise exception 'system categories cannot be deleted; archive instead';
  end if;
  return old;
end;
$$;

drop trigger if exists categories_guard_delete on public.categories;
create trigger categories_guard_delete before delete on public.categories
  for each row execute function public.guard_category_delete();

-- =====================================================================
-- 3. RLS — mirrors budgets
-- =====================================================================
alter table public.categories enable row level security;

drop policy if exists categories_space_select on public.categories;
create policy categories_space_select on public.categories
  for select to authenticated using (public.user_can_see_space(space_id));

drop policy if exists categories_space_write on public.categories;
create policy categories_space_write on public.categories
  for all to authenticated using (public.user_can_see_space(space_id))
  with check (public.user_can_see_space(space_id));

-- =====================================================================
-- 4. FK columns on consumers (additive; text columns retained for one release)
-- =====================================================================
alter table public.transactions
  add column if not exists category_id uuid references public.categories(id) on delete set null;
create index if not exists transactions_category_idx on public.transactions(category_id)
  where category_id is not null;

alter table public.transaction_splits
  add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.transaction_splits alter column category drop not null;
create index if not exists transaction_splits_category_idx on public.transaction_splits(category_id)
  where category_id is not null;

alter table public.budgets
  add column if not exists category_id uuid references public.categories(id) on delete restrict;
create index if not exists budgets_category_idx on public.budgets(category_id)
  where category_id is not null;

alter table public.bills
  add column if not exists category_id uuid references public.categories(id) on delete set null;
create index if not exists bills_category_idx on public.bills(category_id) where category_id is not null;

alter table public.income_events
  add column if not exists category_id uuid references public.categories(id) on delete set null;
create index if not exists income_events_category_idx on public.income_events(category_id)
  where category_id is not null;

-- =====================================================================
-- 5. Seed function + after-insert trigger on spaces
--
-- The 17-row starter pack matches the categories that the legacy
-- PLAID_PFC_TO_CVC map produces, plus two common user categories
-- (Groceries, Subscriptions) that don't have a Plaid PFC mapping.
-- =====================================================================
create or replace function public.seed_categories_for_space(p_space_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.categories
    (space_id, name, icon, color, kind, sort_order, is_system, seed_key)
  values
    (p_space_id, 'Income',             'income',   '#3c8f8f', 'income',    10, true, 'INCOME'),
    (p_space_id, 'Transfer',           'transfer', '#428ba1', 'transfer',  20, true, 'TRANSFER'),
    (p_space_id, 'Groceries',          'cart',     '#618d62', 'expense',   30, true, null),
    (p_space_id, 'Food & Dining',      'fork',     '#ab6e64', 'expense',   40, true, 'FOOD_AND_DRINK'),
    (p_space_id, 'Transportation',     'car',      '#5187ab', 'expense',   50, true, 'TRANSPORTATION'),
    (p_space_id, 'Bills & Utilities',  'bolt',     '#574c1f', 'expense',   60, true, 'RENT_AND_UTILITIES'),
    (p_space_id, 'Shopping',           'shirt',    '#7b79ae', 'expense',   70, true, 'GENERAL_MERCHANDISE'),
    (p_space_id, 'Health',             'heart',    '#6f3a3d', 'expense',   80, true, 'MEDICAL'),
    (p_space_id, 'Subscriptions',      'spark',    '#96719e', 'expense',   90, true, null),
    (p_space_id, 'Entertainment',      'film',     '#4a3868', 'expense',  100, true, 'ENTERTAINMENT'),
    (p_space_id, 'Travel',             'plane',    '#428ba1', 'expense',  110, true, 'TRAVEL'),
    (p_space_id, 'Home',               'home',     '#5a432a', 'expense',  120, true, 'HOME_IMPROVEMENT'),
    (p_space_id, 'Personal Care',      'spark',    '#612e44', 'expense',  130, true, 'PERSONAL_CARE'),
    (p_space_id, 'Services',           'doc',      '#3c4767', 'expense',  140, true, 'GENERAL_SERVICES'),
    (p_space_id, 'Debt Payments',      'card',     '#a96c7a', 'expense',  150, true, 'LOAN_PAYMENTS'),
    (p_space_id, 'Fees',               'doc',      '#6f3a3d', 'expense',  160, true, 'BANK_FEES'),
    (p_space_id, 'Taxes & Government', 'doc',      '#3a4566', 'expense',  170, true, 'GOVERNMENT_AND_NON_PROFIT')
  on conflict do nothing;
end;
$$;

grant execute on function public.seed_categories_for_space(uuid) to authenticated;

create or replace function public.seed_categories_on_space_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.seed_categories_for_space(new.id);
  return new;
end;
$$;

drop trigger if exists categories_seed_on_space_insert on public.spaces;
create trigger categories_seed_on_space_insert
  after insert on public.spaces
  for each row execute function public.seed_categories_on_space_insert();

-- =====================================================================
-- 6. Backfill existing data
-- =====================================================================

-- 6a. Seed every existing space.
do $$
declare s record;
begin
  for s in select id from public.spaces loop
    perform public.seed_categories_for_space(s.id);
  end loop;
end $$;

-- 6b. Auto-create a row for every (space, distinct text) combination not
--     already covered by the seeded set. Anything that case-folds to an
--     existing seed name (e.g. user-typed "groceries") collapses into the
--     seeded row via the unique index.
--
-- Note: the `'expense'::category_kind_t` cast is required because INSERT...SELECT
-- doesn't auto-coerce a text literal to an enum the way INSERT...VALUES does.
with src as (
  select space_id, category as name from public.budgets where category is not null
  union
  select space_id, category from public.transaction_splits where category is not null
  union
  select space_id, category from public.bills where category is not null
  union
  select space_id, category from public.income_events where category is not null
)
insert into public.categories (space_id, name, icon, color, kind)
select s.space_id, s.name, 'doc', '#7b79ae', 'expense'::category_kind_t
from src s
where length(trim(coalesce(s.name, ''))) > 0
on conflict do nothing;

-- 6c. Resolve FKs by case-insensitive name lookup.
update public.budgets b set category_id = c.id
  from public.categories c
 where c.space_id = b.space_id
   and lower(c.name) = lower(b.category)
   and b.category_id is null;

update public.transaction_splits ts set category_id = c.id
  from public.categories c
 where c.space_id = ts.space_id
   and lower(c.name) = lower(ts.category)
   and ts.category_id is null;

update public.bills b set category_id = c.id
  from public.categories c
 where c.space_id = b.space_id
   and lower(c.name) = lower(b.category)
   and b.category_id is null;

update public.income_events i set category_id = c.id
  from public.categories c
 where c.space_id = i.space_id
   and lower(c.name) = lower(i.category)
   and i.category_id is null;

-- 6d. Transactions are owner-scoped — resolve via the owner's default space.
--     Materialize any new (default_space, distinct text) categories first so
--     the lookup below succeeds.
insert into public.categories (space_id, name, icon, color, kind)
select distinct u.default_space_id, t.category, 'doc', '#7b79ae', 'expense'::category_kind_t
  from public.transactions t
  join public.users u on u.id = t.owner_user_id
 where t.category is not null
   and length(trim(t.category)) > 0
   and u.default_space_id is not null
on conflict do nothing;

update public.transactions t set category_id = c.id
  from public.users u, public.categories c
 where t.owner_user_id = u.id
   and c.space_id = u.default_space_id
   and lower(c.name) = lower(t.category)
   and t.category_id is null;
