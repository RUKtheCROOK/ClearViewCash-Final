-- Income page redesign: typed sources, optional ranges, pause state, receipts history.
--
-- Adds:
--   1. income_source_t enum to categorize sources (paycheck/freelance/rental/investment/one_time).
--      Drives icon glyph + hue-tinted disc in the UI.
--   2. amount_low / amount_high (cents) for variable income (e.g. freelance, dividends).
--      When non-null the UI shows "$low–$high" with average; amount remains the forecast point.
--   3. paused_at (timestamptz) — nullable; set when the user pauses an income source.
--      Paused sources are excluded from forecasts/next-paycheck/this-month math.
--   4. income_receipts table — append-only history of past deposits, parallel to bill_payments.
--      Lets the detail screen render variability bar chart + deposit list independently of
--      the single (actual_amount, received_at) pair on income_events (which only tracks the
--      most recent receipt for cadence advancement).

create type public.income_source_t as enum (
  'paycheck',
  'freelance',
  'rental',
  'investment',
  'one_time'
);

alter table public.income_events
  add column if not exists source_type public.income_source_t not null default 'paycheck',
  add column if not exists amount_low bigint,
  add column if not exists amount_high bigint,
  add column if not exists paused_at timestamptz;

-- Receipts history. RLS via income_event ownership.
create table if not exists public.income_receipts (
  id uuid primary key default gen_random_uuid(),
  income_event_id uuid not null references public.income_events(id) on delete cascade,
  amount bigint not null,
  received_at date not null,
  transaction_id uuid references public.transactions(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists income_receipts_event_received_at_idx
  on public.income_receipts (income_event_id, received_at desc);

alter table public.income_receipts enable row level security;

-- Members of the income_event's space can read; the owner can insert/update/delete.
create policy "income_receipts_select"
  on public.income_receipts for select
  using (
    exists (
      select 1
      from public.income_events ie
      join public.space_members sm on sm.space_id = ie.space_id
      where ie.id = income_receipts.income_event_id
        and sm.user_id = auth.uid()
    )
  );

create policy "income_receipts_insert"
  on public.income_receipts for insert
  with check (
    exists (
      select 1
      from public.income_events ie
      where ie.id = income_receipts.income_event_id
        and ie.owner_user_id = auth.uid()
    )
  );

create policy "income_receipts_update"
  on public.income_receipts for update
  using (
    exists (
      select 1
      from public.income_events ie
      where ie.id = income_receipts.income_event_id
        and ie.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.income_events ie
      where ie.id = income_receipts.income_event_id
        and ie.owner_user_id = auth.uid()
    )
  );

create policy "income_receipts_delete"
  on public.income_receipts for delete
  using (
    exists (
      select 1
      from public.income_events ie
      where ie.id = income_receipts.income_event_id
        and ie.owner_user_id = auth.uid()
    )
  );

-- Backfill receipts from existing income_events that have a recent received_at.
insert into public.income_receipts (income_event_id, amount, received_at)
select id, coalesce(actual_amount, amount), received_at
from public.income_events
where received_at is not null
on conflict do nothing;
