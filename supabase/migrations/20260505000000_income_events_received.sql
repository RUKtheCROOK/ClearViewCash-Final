-- Add 'once' cadence for one-time income (and bills, if used later) and add
-- expected-vs-received tracking columns to income_events.
--
-- 'once' cadence means a single, non-recurring occurrence; the forecast layer
-- skips it after received_at is set. Recurring income rows continue to use
-- their existing cadence; received_at/actual_amount track the most-recent
-- receipt and next_due_at advances on mark-received.

alter type cadence_t add value if not exists 'once';

alter table public.income_events
  add column if not exists actual_amount bigint,
  add column if not exists received_at date;
