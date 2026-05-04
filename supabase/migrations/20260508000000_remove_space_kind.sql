-- Remove the personal/shared space distinction.
--
-- Spaces are now just "spaces" — a single rename-able item with no schema-level
-- kind. Any future differentiation will be added via a separate editable flag
-- on a per-space basis. This migration:
--   1. Drops the kind-based delete policy guard (any owner may now delete any
--      space they own; default_space_id falls back to NULL via the existing FK).
--   2. Drops the spaces.kind column.
--   3. Drops the space_kind_t enum (no longer referenced).
--   4. Rewrites handle_new_auth_user() so it (a) reads an optional space_name
--      from raw_user_meta_data (collected at signup; falls back to 'My Space'),
--      (b) no longer sets kind, and (c) preserves the auto-claim-invitations
--      flow introduced in 20260504000000_invitation_acceptance.sql.
--
-- Note on ordering: replace the trigger function before dropping the column it
-- referenced; drop the policy before the column it references; drop the column
-- before the enum it depends on.
-- =====================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_space_id uuid;
  inv record;
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;

  insert into public.spaces (owner_user_id, name, tint)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'space_name'), ''), 'My Space'),
    '#0EA5E9'
  )
  returning id into v_space_id;

  insert into public.space_members (space_id, user_id, role, accepted_at)
  values (v_space_id, new.id, 'owner', now());

  update public.users set default_space_id = v_space_id where id = new.id;

  for inv in
    select id, space_id
      from public.invitations
     where lower(email) = lower(new.email)
       and accepted_user_id is null
       and expires_at > now()
  loop
    if not exists (
      select 1 from public.space_members
       where space_id = inv.space_id and user_id = new.id
    ) then
      insert into public.space_members (space_id, user_id, role, accepted_at)
      values (inv.space_id, new.id, 'member', now());
    end if;
    update public.invitations
       set accepted_user_id = new.id
     where id = inv.id;
  end loop;

  return new;
end;
$$;

drop policy if exists spaces_owner_delete on public.spaces;

alter table public.spaces drop column if exists kind;

drop type if exists public.space_kind_t;

create policy spaces_owner_delete on public.spaces
  for delete to authenticated using (owner_user_id = auth.uid());
