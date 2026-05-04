-- Retire goal_trackers ("track on personal").
--
-- The personal/shared space distinction is gone, so the original purpose of
-- goal_trackers — letting a user pin a shared-space goal back into their
-- personal view — no longer fits. Goals are now visible in their home space
-- and any space they're shared into; the goals UI offers a per-space toggle
-- between own-goals-only and own + shared-into-this-space.
--
-- Removed: goal_trackers table, goals_tracker_select RLS policy, and the
-- user_is_tracking_goal helper. goal_shares stays as the single sharing
-- mechanism.
-- =====================================================================

drop policy if exists goals_tracker_select on public.goals;

drop function if exists public.user_is_tracking_goal(uuid);

drop table if exists public.goal_trackers;
