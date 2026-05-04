-- Goal sharing + per-user tracking + APR/term columns.
--
-- Mirrors the account_shares pattern from 20260501000000_init.sql for goals:
-- a goal still has a single "home" space (goals.space_id), but goal_shares
-- can expose it to additional spaces. goal_trackers is a per-user pin that
-- brings a shared goal back into the user's personal view.
--
-- New goal columns (apr_bps, term_months) are nullable; only meaningful
-- when kind='payoff'. APR stored in basis points to keep ints (24.99% = 2499).

-- =====================================================================
-- 1. APR + term on goals.
-- =====================================================================
alter table public.goals
  add column if not exists apr_bps integer,
  add column if not exists term_months integer;

alter table public.goals
  add constraint goals_apr_bps_nonneg check (apr_bps is null or apr_bps >= 0);
alter table public.goals
  add constraint goals_term_months_pos check (term_months is null or term_months > 0);

-- =====================================================================
-- 2. goal_shares (goal exposed to extra spaces; mirror of account_shares).
-- =====================================================================
create table public.goal_shares (
  goal_id    uuid not null references public.goals(id) on delete cascade,
  space_id   uuid not null references public.spaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (goal_id, space_id)
);
create index goal_shares_space_idx on public.goal_shares(space_id);

-- =====================================================================
-- 3. goal_trackers (per-user pin onto personal view).
-- =====================================================================
create table public.goal_trackers (
  goal_id    uuid not null references public.goals(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (goal_id, user_id)
);
create index goal_trackers_user_idx on public.goal_trackers(user_id);

alter table public.goal_shares   enable row level security;
alter table public.goal_trackers enable row level security;

-- =====================================================================
-- 4. Extend goals SELECT: visible if shared into a space the caller can see,
--    OR if the caller is tracking it. RLS OR-s across policies, so the
--    existing goals_space_all policy still covers the home-space case.
-- =====================================================================
create policy goals_shared_select on public.goals
  for select to authenticated using (
    exists(
      select 1 from public.goal_shares s
      where s.goal_id = goals.id
        and public.user_can_see_space(s.space_id)
    )
  );

create policy goals_tracker_select on public.goals
  for select to authenticated using (
    exists(
      select 1 from public.goal_trackers t
      where t.goal_id = goals.id and t.user_id = auth.uid()
    )
  );

-- =====================================================================
-- 5. goal_shares policies: home-space owner writes; space members read.
--
-- Recursion note: same trick as 20260503000000_fix_rls_recursion.sql.
-- A FOR ALL policy here would cover SELECT, and reading goal_shares would
-- query goals, which would re-enter goals_shared_select and recurse.
-- Split into INSERT/UPDATE/DELETE so SELECT only hits the dedicated
-- goal_shares_visible_select below.
-- =====================================================================
create policy goal_shares_owner_insert on public.goal_shares
  for insert to authenticated
  with check (
    exists(
      select 1 from public.goals g
      join public.spaces sp on sp.id = g.space_id
      where g.id = goal_id and sp.owner_user_id = auth.uid()
    )
  );

create policy goal_shares_owner_update on public.goal_shares
  for update to authenticated
  using (
    exists(
      select 1 from public.goals g
      join public.spaces sp on sp.id = g.space_id
      where g.id = goal_id and sp.owner_user_id = auth.uid()
    )
  )
  with check (
    exists(
      select 1 from public.goals g
      join public.spaces sp on sp.id = g.space_id
      where g.id = goal_id and sp.owner_user_id = auth.uid()
    )
  );

create policy goal_shares_owner_delete on public.goal_shares
  for delete to authenticated
  using (
    exists(
      select 1 from public.goals g
      join public.spaces sp on sp.id = g.space_id
      where g.id = goal_id and sp.owner_user_id = auth.uid()
    )
  );

create policy goal_shares_visible_select on public.goal_shares
  for select to authenticated using (public.user_can_see_space(space_id));

-- =====================================================================
-- 6. goal_trackers: only the user themselves writes/reads their own rows.
--    Split FOR ALL into INSERT/DELETE/SELECT (no UPDATE — rows are
--    effectively immutable; toggle = delete + insert).
-- =====================================================================
create policy goal_trackers_self_select on public.goal_trackers
  for select to authenticated using (user_id = auth.uid());

create policy goal_trackers_self_insert on public.goal_trackers
  for insert to authenticated with check (user_id = auth.uid());

create policy goal_trackers_self_delete on public.goal_trackers
  for delete to authenticated using (user_id = auth.uid());
