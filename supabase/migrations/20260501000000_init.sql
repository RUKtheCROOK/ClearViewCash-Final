-- ClearViewCash V1 — initial schema, RLS policies, triggers.
-- The single most load-bearing file in the project. RLS bugs here leak
-- one user's transactions to another's shared space.
--
-- Conventions:
--   * Money stored as integer cents (avoids float drift).
--   * Every table has created_at/updated_at managed by trigger.
--   * RLS is deny-by-default; explicit policies grant access.
--   * helper user_can_see_space() centralizes membership check.

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- =====================================================================
-- Enums
-- =====================================================================
create type tier_t as enum ('starter', 'pro', 'household');
create type space_kind_t as enum ('personal', 'shared');
create type space_role_t as enum ('owner', 'member');
create type account_type_t as enum ('depository', 'credit', 'loan', 'investment', 'other');
create type cadence_t as enum ('monthly', 'weekly', 'biweekly', 'yearly', 'custom');
create type bill_source_t as enum ('detected', 'manual');
create type bill_payment_status_t as enum ('paid', 'overdue', 'skipped');
create type goal_kind_t as enum ('save', 'payoff');
create type budget_period_t as enum ('monthly', 'weekly');

-- =====================================================================
-- Helper: updated_at trigger
-- =====================================================================
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- =====================================================================
-- users (mirrors auth.users 1:1)
-- =====================================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  default_space_id uuid,
  stripe_customer_id text unique,
  tier tier_t not null default 'starter',
  tier_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger users_updated_at before update on public.users for each row execute function set_updated_at();

-- =====================================================================
-- spaces
-- =====================================================================
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 64),
  tint text not null default '#3B82F6' check (tint ~ '^#[0-9a-fA-F]{6}$'),
  kind space_kind_t not null default 'shared',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index spaces_owner_idx on public.spaces(owner_user_id);
create trigger spaces_updated_at before update on public.spaces for each row execute function set_updated_at();

alter table public.users add constraint users_default_space_fk
  foreign key (default_space_id) references public.spaces(id) on delete set null;

-- =====================================================================
-- space_members
-- =====================================================================
create table public.space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role space_role_t not null default 'member',
  invited_email text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id is not null or invited_email is not null)
);
create unique index space_members_space_user_uniq on public.space_members(space_id, user_id) where user_id is not null;
create unique index space_members_space_email_uniq on public.space_members(space_id, lower(invited_email)) where invited_email is not null;
create index space_members_user_idx on public.space_members(user_id) where user_id is not null;

-- =====================================================================
-- plaid_items (access_token never exposed via PostgREST)
-- =====================================================================
create table public.plaid_items (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  plaid_item_id text not null unique,
  access_token text not null,
  institution_name text,
  cursor text,
  status text not null default 'good',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index plaid_items_owner_idx on public.plaid_items(owner_user_id);
create trigger plaid_items_updated_at before update on public.plaid_items for each row execute function set_updated_at();

-- =====================================================================
-- accounts
-- =====================================================================
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  plaid_item_id uuid not null references public.plaid_items(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  plaid_account_id text not null unique,
  name text not null,
  mask text,
  type account_type_t not null,
  subtype text,
  current_balance bigint,
  available_balance bigint,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index accounts_owner_idx on public.accounts(owner_user_id);
create index accounts_item_idx on public.accounts(plaid_item_id);
create trigger accounts_updated_at before update on public.accounts for each row execute function set_updated_at();

-- =====================================================================
-- account_shares (account -> space exposure)
-- =====================================================================
create table public.account_shares (
  account_id uuid not null references public.accounts(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  share_balances boolean not null default true,
  share_transactions boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (account_id, space_id)
);
create index account_shares_space_idx on public.account_shares(space_id);

-- =====================================================================
-- transactions
-- =====================================================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  plaid_transaction_id text not null unique,
  posted_at date not null,
  amount bigint not null,
  merchant_name text,
  category text,
  subcategory text,
  note text,
  is_recurring boolean not null default false,
  recurring_group_id uuid,
  pending boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index transactions_account_idx on public.transactions(account_id, posted_at desc);
create index transactions_owner_idx on public.transactions(owner_user_id, posted_at desc);
create index transactions_recurring_idx on public.transactions(recurring_group_id) where recurring_group_id is not null;
create trigger transactions_updated_at before update on public.transactions for each row execute function set_updated_at();

-- =====================================================================
-- transaction_shares (per-txn override on top of account_shares)
-- =====================================================================
create table public.transaction_shares (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  hidden boolean not null default false,
  primary key (transaction_id, space_id)
);
create index transaction_shares_space_idx on public.transaction_shares(space_id);

-- =====================================================================
-- transaction_splits
-- =====================================================================
create table public.transaction_splits (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  category text not null,
  amount bigint not null,
  created_at timestamptz not null default now()
);
create index transaction_splits_txn_idx on public.transaction_splits(transaction_id);

-- =====================================================================
-- bills
-- =====================================================================
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  amount bigint not null,
  due_day int check (due_day between 1 and 31),
  cadence cadence_t not null,
  next_due_at date not null,
  autopay boolean not null default false,
  linked_account_id uuid references public.accounts(id) on delete set null,
  source bill_source_t not null default 'manual',
  recurring_group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bills_space_idx on public.bills(space_id, next_due_at);
create trigger bills_updated_at before update on public.bills for each row execute function set_updated_at();

create table public.bill_payments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  paid_at date not null,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount bigint not null,
  status bill_payment_status_t not null default 'paid'
);
create index bill_payments_bill_idx on public.bill_payments(bill_id);

-- =====================================================================
-- income_events (mirror of bills, inbound)
-- =====================================================================
create table public.income_events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  amount bigint not null,
  due_day int,
  cadence cadence_t not null,
  next_due_at date not null,
  autopay boolean not null default false,
  linked_account_id uuid references public.accounts(id) on delete set null,
  source bill_source_t not null default 'manual',
  recurring_group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index income_events_space_idx on public.income_events(space_id, next_due_at);
create trigger income_events_updated_at before update on public.income_events for each row execute function set_updated_at();

-- =====================================================================
-- payment_links (cross-space — owned by user, not space)
-- =====================================================================
create table public.payment_links (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  funding_account_id uuid not null references public.accounts(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payment_links_owner_idx on public.payment_links(owner_user_id);
create trigger payment_links_updated_at before update on public.payment_links for each row execute function set_updated_at();

create table public.payment_link_cards (
  payment_link_id uuid not null references public.payment_links(id) on delete cascade,
  card_account_id uuid not null references public.accounts(id) on delete cascade,
  split_pct numeric(5,2) not null check (split_pct >= 0 and split_pct <= 100),
  primary key (payment_link_id, card_account_id)
);
create index payment_link_cards_card_idx on public.payment_link_cards(card_account_id);

-- =====================================================================
-- budgets
-- =====================================================================
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  category text not null,
  period budget_period_t not null default 'monthly',
  limit_amount bigint not null,
  rollover boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (space_id, category, period)
);
create trigger budgets_updated_at before update on public.budgets for each row execute function set_updated_at();

-- =====================================================================
-- goals
-- =====================================================================
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  kind goal_kind_t not null,
  name text not null,
  target_amount bigint not null,
  target_date date,
  linked_account_id uuid references public.accounts(id) on delete set null,
  monthly_contribution bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_space_idx on public.goals(space_id);
create trigger goals_updated_at before update on public.goals for each row execute function set_updated_at();

-- =====================================================================
-- subscriptions
-- =====================================================================
create table public.subscriptions (
  user_id uuid primary key references public.users(id) on delete cascade,
  stripe_subscription_id text unique,
  tier tier_t not null,
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subscriptions_updated_at before update on public.subscriptions for each row execute function set_updated_at();

-- =====================================================================
-- invitations
-- =====================================================================
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  email text not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index invitations_email_idx on public.invitations(email);

-- =====================================================================
-- notifications
-- =====================================================================
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

-- =====================================================================
-- Helper functions
-- =====================================================================
create or replace function public.user_can_see_space(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.space_members
    where space_id = p_space_id
      and user_id = auth.uid()
      and accepted_at is not null
  ) or exists(
    select 1 from public.spaces
    where id = p_space_id and owner_user_id = auth.uid()
  );
$$;

grant execute on function public.user_can_see_space(uuid) to authenticated;

create or replace function public.user_is_space_owner(p_space_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.spaces
    where id = p_space_id and owner_user_id = auth.uid()
  );
$$;

grant execute on function public.user_is_space_owner(uuid) to authenticated;

-- =====================================================================
-- Auto-create users row + personal space on signup
-- =====================================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_space_id uuid;
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;

  insert into public.spaces (owner_user_id, name, kind, tint)
  values (new.id, 'Personal', 'personal', '#0EA5E9')
  returning id into v_space_id;

  insert into public.space_members (space_id, user_id, role, accepted_at)
  values (v_space_id, new.id, 'owner', now());

  update public.users set default_space_id = v_space_id where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =====================================================================
-- Validate split_pct: per card, sum across all linked funding accounts <= 100
-- =====================================================================
create or replace function public.check_split_pct()
returns trigger
language plpgsql
as $$
declare
  v_total numeric(7,2);
begin
  select coalesce(sum(split_pct), 0) into v_total
  from public.payment_link_cards
  where card_account_id = coalesce(new.card_account_id, old.card_account_id);
  if v_total > 100 then
    raise exception 'Split percentages for card % exceed 100%% (total %)', coalesce(new.card_account_id, old.card_account_id), v_total;
  end if;
  return new;
end;
$$;

create constraint trigger check_split_pct
  after insert or update or delete on public.payment_link_cards
  deferrable initially deferred
  for each row execute function public.check_split_pct();

-- =====================================================================
-- Row-Level Security — deny by default, then explicit grants
-- =====================================================================
alter table public.users enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.plaid_items enable row level security;
alter table public.accounts enable row level security;
alter table public.account_shares enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_shares enable row level security;
alter table public.transaction_splits enable row level security;
alter table public.bills enable row level security;
alter table public.bill_payments enable row level security;
alter table public.income_events enable row level security;
alter table public.payment_links enable row level security;
alter table public.payment_link_cards enable row level security;
alter table public.budgets enable row level security;
alter table public.goals enable row level security;
alter table public.subscriptions enable row level security;
alter table public.invitations enable row level security;
alter table public.notifications enable row level security;

-- users: select self only (or members of any space the caller can see — for member directories)
create policy users_self_select on public.users
  for select to authenticated using (id = auth.uid());
create policy users_self_update on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- spaces: members can see; owner can update/delete; auth users can insert (owner_user_id = self)
create policy spaces_member_select on public.spaces
  for select to authenticated using (public.user_can_see_space(id));
create policy spaces_owner_insert on public.spaces
  for insert to authenticated with check (owner_user_id = auth.uid());
create policy spaces_owner_update on public.spaces
  for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy spaces_owner_delete on public.spaces
  for delete to authenticated using (owner_user_id = auth.uid() and kind = 'shared');

-- space_members: visible to space members; owner can mutate
create policy space_members_select on public.space_members
  for select to authenticated using (public.user_can_see_space(space_id));
create policy space_members_owner_write on public.space_members
  for all to authenticated using (public.user_is_space_owner(space_id))
  with check (public.user_is_space_owner(space_id));
create policy space_members_self_accept on public.space_members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- plaid_items: owner only; access_token column revoked from authenticated below
create policy plaid_items_owner on public.plaid_items
  for all to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

-- accounts:
--   SELECT if owner OR account is shared (with share_balances) into a visible space.
--   INSERT/UPDATE/DELETE: owner only.
create policy accounts_owner_all on public.accounts
  for all to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy accounts_shared_select on public.accounts
  for select to authenticated using (
    exists(
      select 1 from public.account_shares s
      where s.account_id = accounts.id
        and s.share_balances = true
        and public.user_can_see_space(s.space_id)
    )
  );

-- account_shares: owner of the account writes; members of the space can read theirs
create policy account_shares_owner_write on public.account_shares
  for all to authenticated using (
    exists(select 1 from public.accounts a where a.id = account_id and a.owner_user_id = auth.uid())
  ) with check (
    exists(select 1 from public.accounts a where a.id = account_id and a.owner_user_id = auth.uid())
  );
create policy account_shares_visible_select on public.account_shares
  for select to authenticated using (public.user_can_see_space(space_id));

-- transactions:
--   SELECT if owner; OR (account shared with share_transactions to a visible space AND no transaction_shares.hidden=true)
--   OR (transaction_shares.hidden=false explicitly exposes a private one).
--   Writes: owner only.
create policy transactions_owner_all on public.transactions
  for all to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

create policy transactions_shared_select on public.transactions
  for select to authenticated using (
    exists(
      select 1
      from public.account_shares s
      where s.account_id = transactions.account_id
        and s.share_transactions = true
        and public.user_can_see_space(s.space_id)
        and not exists(
          select 1 from public.transaction_shares ts
          where ts.transaction_id = transactions.id
            and ts.space_id = s.space_id
            and ts.hidden = true
        )
    )
    or exists(
      select 1 from public.transaction_shares ts
      where ts.transaction_id = transactions.id
        and ts.hidden = false
        and public.user_can_see_space(ts.space_id)
    )
  );

-- transaction_shares: writes by transaction owner; reads by space members
create policy transaction_shares_owner_write on public.transaction_shares
  for all to authenticated using (
    exists(select 1 from public.transactions t where t.id = transaction_id and t.owner_user_id = auth.uid())
  ) with check (
    exists(select 1 from public.transactions t where t.id = transaction_id and t.owner_user_id = auth.uid())
  );
create policy transaction_shares_member_select on public.transaction_shares
  for select to authenticated using (public.user_can_see_space(space_id));

-- transaction_splits: space members can read/write their splits
create policy transaction_splits_select on public.transaction_splits
  for select to authenticated using (public.user_can_see_space(space_id));
create policy transaction_splits_write on public.transaction_splits
  for all to authenticated using (public.user_can_see_space(space_id))
  with check (public.user_can_see_space(space_id));

-- bills, income_events, budgets, goals: scoped to space membership
create policy bills_space_all on public.bills
  for all to authenticated using (public.user_can_see_space(space_id))
  with check (public.user_can_see_space(space_id));
create policy bill_payments_select on public.bill_payments
  for select to authenticated using (
    exists(select 1 from public.bills b where b.id = bill_id and public.user_can_see_space(b.space_id))
  );
create policy bill_payments_write on public.bill_payments
  for all to authenticated using (
    exists(select 1 from public.bills b where b.id = bill_id and public.user_can_see_space(b.space_id))
  ) with check (
    exists(select 1 from public.bills b where b.id = bill_id and public.user_can_see_space(b.space_id))
  );
create policy income_events_space_all on public.income_events
  for all to authenticated using (public.user_can_see_space(space_id))
  with check (public.user_can_see_space(space_id));
create policy budgets_space_all on public.budgets
  for all to authenticated using (public.user_can_see_space(space_id))
  with check (public.user_can_see_space(space_id));
create policy goals_space_all on public.goals
  for all to authenticated using (public.user_can_see_space(space_id))
  with check (public.user_can_see_space(space_id));

-- payment_links: owner-scoped
create policy payment_links_owner_all on public.payment_links
  for all to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy payment_link_cards_owner_all on public.payment_link_cards
  for all to authenticated using (
    exists(select 1 from public.payment_links pl where pl.id = payment_link_id and pl.owner_user_id = auth.uid())
  ) with check (
    exists(select 1 from public.payment_links pl where pl.id = payment_link_id and pl.owner_user_id = auth.uid())
  );

-- subscriptions: read own only; writes are service-role only (no policy = no access)
create policy subscriptions_self_select on public.subscriptions
  for select to authenticated using (user_id = auth.uid());

-- invitations: space owner writes; invited email reads via RPC; minimal direct exposure
create policy invitations_owner_write on public.invitations
  for all to authenticated using (public.user_is_space_owner(space_id))
  with check (public.user_is_space_owner(space_id));

-- notifications: own only
create policy notifications_self on public.notifications
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- Column-level revoke: never expose plaid access_token to authenticated
-- =====================================================================
revoke select (access_token) on public.plaid_items from authenticated;
revoke update (access_token) on public.plaid_items from authenticated;
revoke insert (access_token) on public.plaid_items from authenticated;

-- Edge Functions use service-role key, which bypasses RLS by design.
