-- Adds the `paycheck` value to the budget_period enum so users can set caps
-- that reset every paycheck cycle. The cycle's length is derived from the
-- user's income cadence at read time (see packages/domain/src/paycheck-cycle.ts),
-- so no extra columns are needed on `budgets`. The existing
-- unique (space_id, category, period) constraint already permits a paycheck
-- budget to coexist with a monthly budget on the same category.

alter type public.budget_period_t add value if not exists 'paycheck';
