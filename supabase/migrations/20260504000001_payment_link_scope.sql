-- Payment links: cross-space scope.
--
-- Default behavior is unchanged: a payment link is owner-private. With
-- cross_space=true, the link participates in any space the owner is a member
-- of — i.e. effective-available math and "Paid By" / "Pays For" badges show
-- the relationship even when only one of the two accounts is shared into a
-- given space. (Visibility of the *accounts* themselves is still controlled
-- by account_shares; cross_space=true only opts into showing the relationship.)
--
-- The RLS policy stays owner-only because every link is still owner-owned.
-- Co-members read links indirectly via the visible side of the relationship.

alter table public.payment_links
  add column if not exists cross_space boolean not null default false;
