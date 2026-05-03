-- Cross-space visibility for payment_links + payment_link_cards.
--
-- Default behavior (set in init.sql line 585+) is owner-only. With cross_space=true
-- on a link, a co-member of a space the user belongs to can SELECT the link if at
-- least one of its two accounts (funding or any card) is shared into that space.
--
-- Recursion note: a naive policy on payment_links that queries payment_link_cards
-- would loop, because the cards' policy would query payment_links right back.
-- We break the cycle the same way init.sql does for spaces — wrap the visibility
-- predicate in a SECURITY DEFINER function. RLS does not re-fire inside SECDEF,
-- so the inner reads of payment_links / payment_link_cards / account_shares run
-- to completion without re-entering these policies.
--
-- Writes (insert/update/delete) keep going through the existing owner-only
-- policies. This migration is SELECT-only.

create or replace function public.payment_link_visible_to_member(p_link_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.payment_links pl
    where pl.id = p_link_id
      and pl.cross_space = true
      and (
        -- viewer can see the funding account via account_shares into a visible space
        exists (
          select 1
          from public.account_shares s
          where s.account_id = pl.funding_account_id
            and public.user_can_see_space(s.space_id)
        )
        -- or viewer can see any of the linked card accounts
        or exists (
          select 1
          from public.payment_link_cards plc
          join public.account_shares s2 on s2.account_id = plc.card_account_id
          where plc.payment_link_id = pl.id
            and public.user_can_see_space(s2.space_id)
        )
      )
  );
$$;

grant execute on function public.payment_link_visible_to_member(uuid) to authenticated;

drop policy if exists payment_links_cross_space_select on public.payment_links;
create policy payment_links_cross_space_select on public.payment_links
  for select to authenticated using (
    public.payment_link_visible_to_member(id)
  );

drop policy if exists payment_link_cards_cross_space_select on public.payment_link_cards;
create policy payment_link_cards_cross_space_select on public.payment_link_cards
  for select to authenticated using (
    public.payment_link_visible_to_member(payment_link_id)
  );
