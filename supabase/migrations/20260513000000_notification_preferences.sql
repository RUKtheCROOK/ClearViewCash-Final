-- Per-user notification preferences.
--
-- The settings UI surfaces a Notifications screen with delivery channels
-- (Push / Email / SMS), money-moving toggles (bill reminders, low balance,
-- large transactions with thresholds), insight toggles (weekly summary,
-- budget warnings, goal milestones, unusual spending), an always-on
-- "new device sign-ins" entry (forced-on; not stored), Plaid connection
-- issue alerts, and quiet hours with a time zone.
--
-- One row per user. RLS lets each user read/write only their own row. A
-- trigger on auth.users insertion seeds the defaults so reads after signup
-- never need to insert a row themselves; defensive client-side upsert is
-- still cheap if a row is missing for any reason.
-- =====================================================================

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- Channels
  push_enabled boolean not null default true,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  -- Money moving
  bill_reminders boolean not null default true,
  low_balance boolean not null default true,
  low_balance_threshold_cents integer not null default 25000 check (low_balance_threshold_cents >= 0),
  large_transactions boolean not null default true,
  large_txn_personal_cents integer not null default 20000 check (large_txn_personal_cents >= 0),
  large_txn_shared_cents integer not null default 50000 check (large_txn_shared_cents >= 0),
  -- Insights
  weekly_summary boolean not null default true,
  budget_warnings boolean not null default true,
  goal_milestones boolean not null default false,
  unusual_spending boolean not null default false,
  -- Account & security (new_device_signins is forced-on, not stored)
  plaid_connection_issues boolean not null default true,
  -- Quiet hours
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '07:00',
  time_zone text not null default 'America/Los_Angeles',
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists notif_prefs_select on public.notification_preferences;
drop policy if exists notif_prefs_insert on public.notification_preferences;
drop policy if exists notif_prefs_update on public.notification_preferences;

create policy notif_prefs_select on public.notification_preferences
  for select to authenticated using (auth.uid() = user_id);

create policy notif_prefs_insert on public.notification_preferences
  for insert to authenticated with check (auth.uid() = user_id);

create policy notif_prefs_update on public.notification_preferences
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed defaults on signup. Idempotent — re-runs are no-ops.
create or replace function public.notification_prefs_seed_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists notification_prefs_on_user_create on auth.users;
create trigger notification_prefs_on_user_create
  after insert on auth.users
  for each row execute function public.notification_prefs_seed_defaults();

-- Backfill: existing users get a defaults row.
insert into public.notification_preferences (user_id)
select u.id
from auth.users u
where not exists (
  select 1 from public.notification_preferences p where p.user_id = u.id
);
