-- Every space owner needs a matching space_members row.
--
-- Without it, the membership-driven UI can't recognize the owner (e.g. the
-- settings screen computes isOwner from members rather than from
-- spaces.owner_user_id, so user-created spaces silently lost their Edit/Delete
-- affordances). The signup trigger always created the row for the auto-default
-- space, but spaces created via the API/UI did not, leaving an asymmetry.
--
-- Fix: an AFTER INSERT trigger on spaces that idempotently inserts the owner
-- row, plus a one-shot backfill for existing rows. handle_new_auth_user no
-- longer needs to insert the owner row itself — the trigger covers it.
-- =====================================================================

create or replace function public.spaces_auto_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.space_members (space_id, user_id, role, accepted_at)
  select new.id, new.owner_user_id, 'owner', now()
  where not exists (
    select 1 from public.space_members
     where space_id = new.id and user_id = new.owner_user_id
  );
  return new;
end;
$$;

drop trigger if exists spaces_auto_owner_member on public.spaces;
create trigger spaces_auto_owner_member
  after insert on public.spaces
  for each row execute function public.spaces_auto_owner_member();

-- Drop the explicit owner-member insert from handle_new_auth_user; the trigger
-- now creates that row whenever a space is inserted.
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

-- Backfill: any existing space whose owner has no space_members row gets one.
-- Idempotent — re-runs are no-ops. Owners ignore the can_* flags
-- (user_has_space_perm checks spaces.owner_user_id directly), so column
-- defaults are fine.
insert into public.space_members (space_id, user_id, role, accepted_at)
select s.id, s.owner_user_id, 'owner', now()
from public.spaces s
where not exists (
  select 1 from public.space_members m
   where m.space_id = s.id and m.user_id = s.owner_user_id
);
