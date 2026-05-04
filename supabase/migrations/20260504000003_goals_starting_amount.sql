-- Goals: starting_amount baseline.
--
-- Payoff goals need a baseline to measure progress against. target_amount on
-- a payoff goal represents the desired ending balance (typically 0), so
-- progress = (starting_amount - current_balance) / (starting_amount - target_amount).
--
-- For savings goals, starting_amount is optional and only used if the user
-- wants progress to ignore a pre-existing balance in the linked account.

alter table public.goals
  add column if not exists starting_amount bigint;
