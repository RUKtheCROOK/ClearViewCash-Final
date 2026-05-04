-- Add free-text category to bills and income_events for organization.
-- Nullable; existing rows backfill as NULL. RLS policies are column-agnostic
-- and inherit access automatically. No new index: per-space row counts are
-- low and filtering happens client-side.

alter table public.bills add column category text;
alter table public.income_events add column category text;
