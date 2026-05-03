import type { MoneyCents, PaymentLink, Uuid } from "@cvc/types";

export interface AccountBalance {
  account_id: Uuid;
  current_balance: MoneyCents;
}

export interface PaymentLinkAllocation {
  funding_account_id: Uuid;
  card_account_id: Uuid;
  reserved_cents: MoneyCents;
}

/**
 * For each card linked to one or more funding accounts, compute the cents
 * each funding account must reserve to fully cover the card's current balance,
 * proportional to that card's split_pct on each link.
 *
 * Card balances are stored as positive cents (Plaid convention for credit:
 * positive = amount owed). Allocations are signed to be subtracted from
 * funding account balances when computing effective_available.
 *
 * Conservation invariant: sum of allocations for one card equals that card's
 * current balance (rounded to whole cents; remainder cent goes to first funder).
 */
export function allocatePaymentLinks(
  links: PaymentLink[],
  balances: AccountBalance[],
): PaymentLinkAllocation[] {
  const balanceByAccount = new Map(balances.map((b) => [b.account_id, b.current_balance]));

  // Group all (funding -> card, split_pct) edges by card, since one card can be
  // covered by multiple funding accounts via separate links.
  const edgesByCard = new Map<Uuid, Array<{ funding: Uuid; pct: number }>>();
  for (const link of links) {
    for (const card of link.cards) {
      const arr = edgesByCard.get(card.card_account_id) ?? [];
      arr.push({ funding: link.funding_account_id, pct: card.split_pct });
      edgesByCard.set(card.card_account_id, arr);
    }
  }

  const allocations: PaymentLinkAllocation[] = [];
  for (const [cardId, edges] of edgesByCard) {
    const cardBalance = balanceByAccount.get(cardId) ?? 0;
    if (cardBalance <= 0 || edges.length === 0) continue;

    const totalPct = edges.reduce((sum, e) => sum + e.pct, 0);
    if (totalPct <= 0) continue;

    let allocatedSoFar = 0;
    edges.forEach((edge, idx) => {
      const isLast = idx === edges.length - 1;
      const share = isLast
        ? cardBalance - allocatedSoFar
        : Math.round((cardBalance * edge.pct) / totalPct);
      allocatedSoFar += share;
      allocations.push({
        funding_account_id: edge.funding,
        card_account_id: cardId,
        reserved_cents: share,
      });
    });
  }
  return allocations;
}

/**
 * Effective available balance per funding account: current balance minus the
 * sum of all card-balance reservations from payment links pointing at that
 * funding account.
 */
export function effectiveAvailableBalances(
  links: PaymentLink[],
  balances: AccountBalance[],
): Map<Uuid, MoneyCents> {
  const allocations = allocatePaymentLinks(links, balances);
  const reserved = new Map<Uuid, MoneyCents>();
  for (const a of allocations) {
    reserved.set(a.funding_account_id, (reserved.get(a.funding_account_id) ?? 0) + a.reserved_cents);
  }
  const result = new Map<Uuid, MoneyCents>();
  for (const b of balances) {
    result.set(b.account_id, b.current_balance - (reserved.get(b.account_id) ?? 0));
  }
  return result;
}
