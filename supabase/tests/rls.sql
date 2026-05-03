-- pgTAP suite for RLS policies. The gate that prevents data leaks.
--
-- Two execution modes:
--   * supabase test db    — for local pgTAP runner (uses plan/finish, streams TAP)
--   * scripts/run-pgtap.mjs — talks to Supabase Management API which only
--     returns the LAST result set, so we collect every assertion into a temp
--     table and return it at the very end.

begin;
create extension if not exists pgtap;
select plan(20);

create temp table _tap (idx serial, line text);

-- Helper: switch JWT context to a given user.
create or replace function _as_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('role', 'authenticated', true);
end; $$;

-- Helper: capture a single pgTAP assertion result line into _tap.
-- SECURITY DEFINER so it can write to the temp table after we've switched
-- to the authenticated role via _as_user().
create or replace function _record(t text) returns void
language plpgsql security definer set search_path = pg_temp, public as $$
begin
  insert into _tap(line) values (t);
end;
$$;

-- ---------------------------------------------------------------------
-- Fixtures (valid 8-4-4-4-12 hex UUIDs):
--   alice           a0000000-0000-0000-0000-000000000001
--   bob             b0000000-0000-0000-0000-000000000001
--   House space     c0000000-0000-0000-0000-000000000001
--   plaid_item      d0000000-0000-0000-0000-000000000001
--   shared account  e0000000-0000-0000-0000-000000000001
--   private account e0000000-0000-0000-0000-000000000002
--   tx visible      f0000000-0000-0000-0000-000000000001
--   tx hidden       f0000000-0000-0000-0000-000000000002
--   tx exposed      f0000000-0000-0000-0000-000000000003
-- ---------------------------------------------------------------------

insert into auth.users (id, email, encrypted_password, email_confirmed_at, instance_id, aud, role)
values
  ('a0000000-0000-0000-0000-000000000001', 'alice@test', crypt('x', gen_salt('bf')), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('b0000000-0000-0000-0000-000000000001', 'bob@test',   crypt('x', gen_salt('bf')), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
on conflict (id) do nothing;

insert into public.spaces (id, owner_user_id, name, kind, tint)
values ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'House', 'shared', '#10B981');

insert into public.space_members (space_id, user_id, role, accepted_at)
values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'owner', now()),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'member', now());

insert into public.plaid_items (id, owner_user_id, plaid_item_id, access_token, institution_name, status)
values ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'item_alice', 'access_secret_alice', 'TestBank', 'good');

insert into public.accounts (id, plaid_item_id, owner_user_id, plaid_account_id, name, type, current_balance, currency)
values
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'plaid_acc_shared', 'Shared Checking', 'depository', 100000, 'USD'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'plaid_acc_private', 'Private Checking', 'depository', 50000, 'USD');

insert into public.account_shares (account_id, space_id, share_balances, share_transactions)
values ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', true, true);

insert into public.transactions (id, account_id, owner_user_id, plaid_transaction_id, posted_at, amount, merchant_name)
values
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'plaid_tx_visible', '2026-04-01', -2500, 'Coffee'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'plaid_tx_hidden',  '2026-04-02', -10000, 'Therapy'),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'plaid_tx_exposed', '2026-04-03', -5000, 'Gift');

insert into public.transaction_shares (transaction_id, space_id, hidden) values
  ('f0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', true),
  ('f0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', false);

-- Capture Alice's auto-created personal space id (made by the on_auth_user_created
-- trigger) so we can reference it from Bob's session for write-attempt tests.
do $$
declare v_id uuid;
begin
  select id into v_id from public.spaces
   where owner_user_id = 'a0000000-0000-0000-0000-000000000001' and kind = 'personal'
   limit 1;
  perform set_config('test.alice_personal_space', v_id::text, false);
end $$;

-- ---------------------------------------------------------------------
-- Tests — every assertion's result is captured into _tap.
-- ---------------------------------------------------------------------

select _as_user('b0000000-0000-0000-0000-000000000001');

select _record(results_eq(
  $$ select count(*) from public.spaces where id = 'c0000000-0000-0000-0000-000000000001' $$,
  $$ values (1::bigint) $$,
  'bob sees House space he is a member of'
));
select _record(results_eq(
  $$ select count(*) from public.spaces where owner_user_id = 'a0000000-0000-0000-0000-000000000001' and kind = 'personal' $$,
  $$ values (0::bigint) $$,
  'bob does NOT see alice personal space'
));
select _record(results_eq(
  $$ select count(*) from public.accounts where id = 'e0000000-0000-0000-0000-000000000001' $$,
  $$ values (1::bigint) $$,
  'bob sees the shared account via account_shares'
));
select _record(results_eq(
  $$ select count(*) from public.accounts where id = 'e0000000-0000-0000-0000-000000000002' $$,
  $$ values (0::bigint) $$,
  'bob cannot see alice private account'
));
select _record(results_eq(
  $$ select count(*) from public.transactions where plaid_transaction_id = 'plaid_tx_visible' $$,
  $$ values (1::bigint) $$,
  'bob sees normal txn on shared account'
));
select _record(results_eq(
  $$ select count(*) from public.transactions where plaid_transaction_id = 'plaid_tx_hidden' $$,
  $$ values (0::bigint) $$,
  'bob does NOT see hidden txn on shared account'
));
select _record(results_eq(
  $$ select count(*) from public.transactions where plaid_transaction_id = 'plaid_tx_exposed' $$,
  $$ values (1::bigint) $$,
  'bob sees explicitly-exposed txn from private account'
));
select _record(throws_ok(
  $$ insert into public.account_shares(account_id, space_id, share_balances, share_transactions)
     values ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', true, true) $$,
  null,
  'bob cannot write account_shares for alice account'
));
select _record(results_eq(
  $$ select count(*) from public.plaid_items $$,
  $$ values (0::bigint) $$,
  'bob cannot see alice plaid items'
));
select _record(throws_ok(
  $$ select access_token from public.plaid_items $$,
  '42501',
  null,
  'access_token column revoked from authenticated'
));
select _record(lives_ok(
  $$ insert into public.bills(space_id, owner_user_id, name, amount, due_day, cadence, next_due_at, source)
     values ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Internet', 5000, 15, 'monthly', '2026-05-15', 'manual') $$,
  'bob can write bills into House'
));
select _record(throws_ok(
  format($f$ insert into public.bills(space_id, owner_user_id, name, amount, due_day, cadence, next_due_at, source)
     values (%L, 'b0000000-0000-0000-0000-000000000001', 'X', 100, 1, 'monthly', '2026-05-01', 'manual') $f$,
     current_setting('test.alice_personal_space')),
  null,
  'bob cannot write bills into alice personal space'
));

select _as_user('a0000000-0000-0000-0000-000000000001');

select _record(results_eq(
  $$ select count(*) from public.accounts where owner_user_id = 'a0000000-0000-0000-0000-000000000001' $$,
  $$ values (2::bigint) $$,
  'alice sees both her accounts'
));
select _record(results_eq(
  $$ select count(*) from public.transactions where owner_user_id = 'a0000000-0000-0000-0000-000000000001' $$,
  $$ values (3::bigint) $$,
  'alice sees all her transactions'
));
select _record(results_eq(
  $$ select count(*) from public.spaces $$,
  $$ values (2::bigint) $$,
  'alice sees House and her personal space'
));
select _record(lives_ok(
  $$ update public.spaces set tint = '#FF00AA' where id = 'c0000000-0000-0000-0000-000000000001' $$,
  'alice can update House she owns'
));

select _as_user('b0000000-0000-0000-0000-000000000001');
select _record(results_eq(
  $$ update public.spaces set tint = '#000000' where id = 'c0000000-0000-0000-0000-000000000001' returning 1 $$,
  $$ select where false $$,
  'bob cannot update House (only owner can)'
));

-- Anonymous role sees nothing.
select set_config('role', 'anon', true);
select _record(results_eq(
  $$ select count(*) from public.transactions $$,
  $$ values (0::bigint) $$,
  'anonymous role sees no transactions'
));
select _record(results_eq(
  $$ select count(*) from public.accounts $$,
  $$ values (0::bigint) $$,
  'anonymous role sees no accounts'
));
select _record(results_eq(
  $$ select count(*) from public.users $$,
  $$ values (0::bigint) $$,
  'anonymous role sees no user rows'
));

-- Reset role so we can read our own temp table; then return collected TAP output.
reset role;
select set_config('request.jwt.claim.sub', '', true);
select line from _tap order by idx;
rollback;
