-- Strengthen plaid_items.access_token revocation.
--
-- The original migration used `revoke select (access_token) ... from authenticated`,
-- but Supabase grants table-wide SELECT to `authenticated` by default, and
-- table-wide grants take precedence over column-level revokes. Switch to
-- explicit column allowlist so the access_token can never leak via a SELECT
-- column expansion or `select *`.
--
-- Edge Functions use the service_role key which bypasses these grants.

revoke select on public.plaid_items from authenticated;
revoke insert on public.plaid_items from authenticated;
revoke update on public.plaid_items from authenticated;

grant select (id, owner_user_id, plaid_item_id, institution_name, cursor, status, created_at, updated_at)
  on public.plaid_items to authenticated;

-- We don't grant insert/update — those happen exclusively via Edge Functions
-- (service_role bypasses these grants entirely).
