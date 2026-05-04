-- Fix infinite recursion (SQLSTATE 42P17) in goals SELECT policies introduced
-- by 20260507000010_goal_shares_trackers_apr.sql.
--
-- Root cause: goals_shared_select / goals_tracker_select inlined EXISTS
-- subqueries against goal_shares / goal_trackers. Postgres' RLS recursion
-- detector walks the full policy graph for the referenced relation (not just
-- the SELECT-applicable policies), and the goal_shares_owner_{insert,update,
-- delete} policies back-reference goals — closing the cycle goals → goal_shares
-- → goals and tripping 42P17 on plain `select * from goals`.
--
-- Fix: lift the EXISTS predicates into SECURITY DEFINER helpers (mirrors
-- public.user_can_see_account_share from 20260506000001_account_share_visibilities).
-- The helpers run as the function owner (BYPASSRLS), so the inner reads of
-- goal_shares / goal_trackers don't pull those tables' RLS into the goals
-- policy expansion. Visibility semantics are unchanged.

create or replace function public.user_can_see_goal_via_share(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.goal_shares s
    where s.goal_id = p_goal_id
      and public.user_can_see_space(s.space_id)
  );
$$;

grant execute on function public.user_can_see_goal_via_share(uuid) to authenticated;

create or replace function public.user_is_tracking_goal(p_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists(
    select 1 from public.goal_trackers t
    where t.goal_id = p_goal_id and t.user_id = auth.uid()
  );
$$;

grant execute on function public.user_is_tracking_goal(uuid) to authenticated;

drop policy if exists goals_shared_select  on public.goals;
drop policy if exists goals_tracker_select on public.goals;

create policy goals_shared_select on public.goals
  for select to authenticated
  using (public.user_can_see_goal_via_share(id));

create policy goals_tracker_select on public.goals
  for select to authenticated
  using (public.user_is_tracking_goal(id));
