-- Fix RLS infinite recursion between accounts ⇄ account_shares and
-- transactions ⇄ transaction_shares.
--
-- Root cause: the *_owner_write policies were FOR ALL (which includes SELECT)
-- and queried the parent table. When the parent's SELECT policy then queried
-- the child, RLS recursed.
--
-- Fix: split FOR ALL into separate INSERT/UPDATE/DELETE policies, leaving
-- SELECT to the dedicated *_visible_select / *_member_select policies.

drop policy if exists account_shares_owner_write on public.account_shares;

create policy account_shares_owner_insert on public.account_shares
  for insert to authenticated
  with check (
    exists(select 1 from public.accounts a where a.id = account_id and a.owner_user_id = auth.uid())
  );

create policy account_shares_owner_update on public.account_shares
  for update to authenticated
  using (
    exists(select 1 from public.accounts a where a.id = account_id and a.owner_user_id = auth.uid())
  )
  with check (
    exists(select 1 from public.accounts a where a.id = account_id and a.owner_user_id = auth.uid())
  );

create policy account_shares_owner_delete on public.account_shares
  for delete to authenticated
  using (
    exists(select 1 from public.accounts a where a.id = account_id and a.owner_user_id = auth.uid())
  );

drop policy if exists transaction_shares_owner_write on public.transaction_shares;

create policy transaction_shares_owner_insert on public.transaction_shares
  for insert to authenticated
  with check (
    exists(select 1 from public.transactions t where t.id = transaction_id and t.owner_user_id = auth.uid())
  );

create policy transaction_shares_owner_update on public.transaction_shares
  for update to authenticated
  using (
    exists(select 1 from public.transactions t where t.id = transaction_id and t.owner_user_id = auth.uid())
  )
  with check (
    exists(select 1 from public.transactions t where t.id = transaction_id and t.owner_user_id = auth.uid())
  );

create policy transaction_shares_owner_delete on public.transaction_shares
  for delete to authenticated
  using (
    exists(select 1 from public.transactions t where t.id = transaction_id and t.owner_user_id = auth.uid())
  );
