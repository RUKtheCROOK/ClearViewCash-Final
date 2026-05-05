-- Bill payee branding (hue + glyph) and reminder rules.
--
-- payee_hue / payee_glyph let the UI render the per-bill icon disc shown in
-- the redesigned Bills list and detail screens. notes is a free-text field
-- exposed in the bill detail.
--
-- bill_reminders models the autopay/reminder switches: each bill can have
-- multiple reminder rules (1 day before, on due date, etc.) plus a single
-- "mute_all" rule. Persisting per-bill (not per-cycle) keeps the table
-- small; cycle-specific delivery is calculated on read.

-- =====================================================================
-- 1. payee branding + notes on bills
-- =====================================================================
alter table public.bills
  add column if not exists payee_hue smallint,
  add column if not exists payee_glyph text,
  add column if not exists notes text;

alter table public.bills
  add constraint bills_payee_hue_range
    check (payee_hue is null or (payee_hue >= 0 and payee_hue < 360));

-- =====================================================================
-- 2. bill_reminders
-- =====================================================================
create type public.bill_reminder_kind_t as enum (
  'days_before',   -- fires N days before next_due_at
  'on_due_date',   -- fires on next_due_at
  'mute_all'       -- master mute (when enabled, suppresses all reminders)
);

create table public.bill_reminders (
  id          uuid primary key default gen_random_uuid(),
  bill_id     uuid not null references public.bills(id) on delete cascade,
  kind        public.bill_reminder_kind_t not null,
  days_before int,
  time_of_day time not null default '09:00',
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index bill_reminders_bill_idx on public.bill_reminders(bill_id);
create unique index bill_reminders_unique_kind
  on public.bill_reminders(bill_id, kind, coalesce(days_before, -1));

create trigger bill_reminders_updated_at
  before update on public.bill_reminders
  for each row execute function set_updated_at();

alter table public.bill_reminders enable row level security;

create policy bill_reminders_select on public.bill_reminders
  for select to authenticated using (
    exists(
      select 1 from public.bills b
      where b.id = bill_id and public.user_can_see_space(b.space_id)
    )
  );
create policy bill_reminders_write on public.bill_reminders
  for all to authenticated using (
    exists(
      select 1 from public.bills b
      where b.id = bill_id and public.user_can_see_space(b.space_id)
    )
  ) with check (
    exists(
      select 1 from public.bills b
      where b.id = bill_id and public.user_can_see_space(b.space_id)
    )
  );
