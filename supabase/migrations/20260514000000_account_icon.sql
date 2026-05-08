-- Per-account icon override. Stores a key from @cvc/ui's IconKey set
-- (e.g. "bank", "card", "vault", "spark"). When null the UI falls back
-- to the default icon derived from the account type/subtype.

alter table public.accounts
  add column if not exists icon text;
