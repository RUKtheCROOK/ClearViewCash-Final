-- Per-member space permissions.
--
-- Until now, only the owner could rename, recolor, invite into, or delete a
-- space. This migration adds three booleans on space_members — can_invite,
-- can_rename, can_delete — that the owner can grant to individual members.
-- The owner implicitly holds all permissions; non-owners get exactly what's
-- granted on their space_members row.
--
-- RLS rewrites:
--   * spaces UPDATE: was owner-only, now owner OR can_rename. A trigger
--     prevents non-owners from transferring ownership via owner_user_id.
--   * spaces DELETE: was owner-only (already kind-free since 20260508), now
--     owner OR can_delete.
--   * invitations FOR ALL: was owner-only, now owner OR can_invite (covers
--     creating invites and revoking them).
--   * space_members write: stays owner-only — only the owner edits perms.
-- =====================================================================

alter table public.space_members
  add column if not exists can_invite boolean not null default false,
  add column if not exists can_rename boolean not null default false,
  add column if not exists can_delete boolean not null default false;

-- Single helper used by all policy expressions. SECURITY DEFINER bypasses RLS
-- on space_members so the policy doesn't recurse.
create or replace function public.user_has_space_perm(p_space_id uuid, p_perm text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.spaces
     where id = p_space_id and owner_user_id = auth.uid()
  ) or exists (
    select 1 from public.space_members
     where space_id = p_space_id
       and user_id = auth.uid()
       and accepted_at is not null
       and case p_perm
             when 'invite' then can_invite
             when 'rename' then can_rename
             when 'delete' then can_delete
             else false
           end
  );
$$;

grant execute on function public.user_has_space_perm(uuid, text) to authenticated;

-- Spaces: replace the owner-only update/delete policies.
drop policy if exists spaces_owner_update on public.spaces;
drop policy if exists spaces_owner_delete on public.spaces;

create policy spaces_update_perm on public.spaces
  for update to authenticated
  using (public.user_has_space_perm(id, 'rename'))
  with check (public.user_has_space_perm(id, 'rename'));

create policy spaces_delete_perm on public.spaces
  for delete to authenticated
  using (public.user_has_space_perm(id, 'delete'));

-- Block ownership transfer by anyone other than the current owner. UPDATE
-- can't compare new vs old in RLS; a BEFORE UPDATE trigger does the job.
create or replace function public.spaces_block_owner_change()
returns trigger
language plpgsql
as $$
begin
  if new.owner_user_id is distinct from old.owner_user_id
     and old.owner_user_id <> auth.uid() then
    raise exception 'only the current owner can transfer ownership'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists spaces_block_owner_change on public.spaces;
create trigger spaces_block_owner_change
  before update on public.spaces
  for each row execute function public.spaces_block_owner_change();

-- Invitations: was for-all-by-owner; now for-all by owner or can_invite.
drop policy if exists invitations_owner_write on public.invitations;

create policy invitations_invite_perm on public.invitations
  for all to authenticated
  using (public.user_has_space_perm(space_id, 'invite'))
  with check (public.user_has_space_perm(space_id, 'invite'));
