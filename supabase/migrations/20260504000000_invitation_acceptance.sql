-- Invitation acceptance.
--
-- Two paths:
--   (1) An authenticated user calls public.claim_invitation(token) — used by
--       the in-app "I have an invite token" screen and the deep-link path.
--   (2) A brand-new user signs up with the same email an invite was sent to;
--       handle_new_auth_user() auto-claims any outstanding invitations on
--       account creation so the new user lands directly inside the space.
--
-- Both paths converge on the same write: a space_members row with
-- (space_id, user_id, role='member', accepted_at=now()) and the matching
-- invitations row stamped with accepted_user_id.

create or replace function public.claim_invitation(p_token text)
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_invitation public.invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_invitation
    from public.invitations
   where token = p_token
   for update;

  if not found then
    raise exception 'invitation not found' using errcode = 'P0002';
  end if;
  if v_invitation.expires_at < now() then
    raise exception 'invitation expired' using errcode = 'P0002';
  end if;
  if v_invitation.accepted_user_id is not null then
    -- Already claimed; if claimed by THIS user, treat as a no-op success so
    -- the deep-link is idempotent. Otherwise surface a conflict.
    if v_invitation.accepted_user_id = v_user_id then
      return json_build_object('space_id', v_invitation.space_id, 'already', true);
    end if;
    raise exception 'invitation already accepted' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.space_members
    where space_id = v_invitation.space_id and user_id = v_user_id
  ) then
    update public.space_members
       set accepted_at = coalesce(accepted_at, now())
     where space_id = v_invitation.space_id and user_id = v_user_id;
  else
    insert into public.space_members (space_id, user_id, role, accepted_at)
    values (v_invitation.space_id, v_user_id, 'member', now());
  end if;

  update public.invitations
     set accepted_user_id = v_user_id
   where id = v_invitation.id;

  return json_build_object('space_id', v_invitation.space_id);
end;
$$;

grant execute on function public.claim_invitation(text) to authenticated;

-- Replace the signup trigger to also auto-claim invites by email.
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

  insert into public.spaces (owner_user_id, name, kind, tint)
  values (new.id, 'Personal', 'personal', '#0EA5E9')
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
