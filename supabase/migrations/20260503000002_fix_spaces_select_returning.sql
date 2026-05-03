-- Fix INSERT...RETURNING * on spaces failing for the row's own owner.
--
-- Root cause: spaces_member_select used `user_can_see_space(id)`, which is a
-- STABLE SECURITY DEFINER function that queries the spaces table internally.
-- STABLE functions use a snapshot taken at statement start, so they cannot
-- see the in-progress INSERTed row, even when called from the SELECT policy
-- evaluating RETURNING. Result: PostgREST `.insert(...).select()` always fails
-- with 42501 even when the user IS the owner.
--
-- Fix: do the cheap ownership check directly in the policy USING clause
-- (no function call, sees the row's own column values), and keep the
-- function call only for the membership branch where the row's id alone
-- isn't enough information.

drop policy if exists spaces_member_select on public.spaces;

create policy spaces_member_select on public.spaces
  for select to authenticated using (
    -- direct ownership check works against the in-progress row
    owner_user_id = auth.uid()
    -- membership branch goes through the SECDEF function (queries space_members,
    -- which is a different table than the one being INSERTed into)
    or public.user_can_see_space(id)
  );
