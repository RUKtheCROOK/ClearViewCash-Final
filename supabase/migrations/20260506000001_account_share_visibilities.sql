-- Per-member account share visibility.
--
-- An `account_shares` row currently exposes the account to *every* member of
-- the space. This adds an optional allowlist on top: when at least one row
-- exists in `account_share_visibilities` for a (account_id, space_id), only
-- those listed users (plus the account owner) can see the share. An empty
-- allowlist preserves the original "everyone in the space" behavior, so
-- existing rows need no backfill.
--
-- Recursion note: same trick as user_can_see_space / payment_link_visible_to_member.
-- Wrap the predicate in a SECURITY DEFINER function so its internal reads of
-- accounts / account_share_visibilities don't re-enter RLS.

create table public.account_share_visibilities (
  account_id uuid not null,
  space_id   uuid not null,
  user_id    uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (account_id, space_id, user_id),
  foreign key (account_id, space_id)
    references public.account_shares(account_id, space_id) on delete cascade
);
create index account_share_visibilities_space_user_idx
  on public.account_share_visibilities(space_id, user_id);

alter table public.account_share_visibilities enable row level security;

-- =====================================================================
-- Helper: gates the (account, space) share for the current viewer.
--   * Account owner: always sees their own share.
--   * Otherwise: caller must be a space member AND either the allowlist
--     is empty, or caller is in the allowlist.
-- =====================================================================
create or replace function public.user_can_see_account_share(
  p_account_id uuid,
  p_space_id   uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    -- Owner always sees their own share, regardless of allowlist.
    exists(
      select 1 from public.accounts a
      where a.id = p_account_id and a.owner_user_id = auth.uid()
    )
    or (
      public.user_can_see_space(p_space_id)
      and (
        -- Empty allowlist => visible to every space member.
        not exists(
          select 1 from public.account_share_visibilities v
          where v.account_id = p_account_id and v.space_id = p_space_id
        )
        -- Non-empty allowlist => caller must be on it.
        or exists(
          select 1 from public.account_share_visibilities v
          where v.account_id = p_account_id
            and v.space_id   = p_space_id
            and v.user_id    = auth.uid()
        )
      )
    );
$$;

grant execute on function public.user_can_see_account_share(uuid, uuid) to authenticated;

-- =====================================================================
-- Replace the three SELECT policies that previously assumed "any member
-- of the space can see the share". They now delegate to the helper.
-- =====================================================================
drop policy if exists account_shares_visible_select on public.account_shares;
create policy account_shares_visible_select on public.account_shares
  for select to authenticated using (
    public.user_can_see_account_share(account_id, space_id)
  );

drop policy if exists accounts_shared_select on public.accounts;
create policy accounts_shared_select on public.accounts
  for select to authenticated using (
    exists(
      select 1 from public.account_shares s
      where s.account_id = accounts.id
        and s.share_balances = true
        and public.user_can_see_account_share(s.account_id, s.space_id)
    )
  );

drop policy if exists transactions_shared_select on public.transactions;
create policy transactions_shared_select on public.transactions
  for select to authenticated using (
    exists(
      select 1
      from public.account_shares s
      where s.account_id = transactions.account_id
        and s.share_transactions = true
        and public.user_can_see_account_share(s.account_id, s.space_id)
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

-- =====================================================================
-- account_share_visibilities policies.
-- Writes are split into INSERT/UPDATE/DELETE (mirrors the recursion fix
-- in 20260503000000_fix_rls_recursion.sql) so SELECT goes through the
-- dedicated read policies below.
-- =====================================================================
create policy account_share_vis_owner_insert on public.account_share_visibilities
  for insert to authenticated with check (
    exists(select 1 from public.accounts a
           where a.id = account_id and a.owner_user_id = auth.uid())
  );

create policy account_share_vis_owner_update on public.account_share_visibilities
  for update to authenticated using (
    exists(select 1 from public.accounts a
           where a.id = account_id and a.owner_user_id = auth.uid())
  ) with check (
    exists(select 1 from public.accounts a
           where a.id = account_id and a.owner_user_id = auth.uid())
  );

create policy account_share_vis_owner_delete on public.account_share_visibilities
  for delete to authenticated using (
    exists(select 1 from public.accounts a
           where a.id = account_id and a.owner_user_id = auth.uid())
  );

-- Account owner can read all visibility rows for their accounts (to manage).
create policy account_share_vis_owner_select on public.account_share_visibilities
  for select to authenticated using (
    exists(select 1 from public.accounts a
           where a.id = account_id and a.owner_user_id = auth.uid())
  );

-- A user can see their own visibility row (so future UI can show "shared with you").
create policy account_share_vis_self_select on public.account_share_visibilities
  for select to authenticated using (user_id = auth.uid());
