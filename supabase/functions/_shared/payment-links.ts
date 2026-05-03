// Mirror of packages/domain/src/payment-links.ts. Keep in sync.
export interface AccountBalance {
  account_id: string;
  current_balance: number;
}
export interface PaymentLinkCard {
  payment_link_id: string;
  card_account_id: string;
  split_pct: number;
}
export interface PaymentLink {
  id: string;
  owner_user_id: string;
  funding_account_id: string;
  name: string;
  cards: PaymentLinkCard[];
}
export interface PaymentLinkAllocation {
  funding_account_id: string;
  card_account_id: string;
  reserved_cents: number;
}

export function allocatePaymentLinks(links: PaymentLink[], balances: AccountBalance[]): PaymentLinkAllocation[] {
  const balanceByAccount = new Map(balances.map((b) => [b.account_id, b.current_balance]));
  const edgesByCard = new Map<string, Array<{ funding: string; pct: number }>>();
  for (const link of links) {
    for (const card of link.cards) {
      const arr = edgesByCard.get(card.card_account_id) ?? [];
      arr.push({ funding: link.funding_account_id, pct: card.split_pct });
      edgesByCard.set(card.card_account_id, arr);
    }
  }
  const out: PaymentLinkAllocation[] = [];
  for (const [cardId, edges] of edgesByCard) {
    const cardBalance = balanceByAccount.get(cardId) ?? 0;
    if (cardBalance <= 0 || edges.length === 0) continue;
    const totalPct = edges.reduce((s, e) => s + e.pct, 0);
    if (totalPct <= 0) continue;
    let allocated = 0;
    edges.forEach((edge, idx) => {
      const isLast = idx === edges.length - 1;
      const share = isLast ? cardBalance - allocated : Math.round((cardBalance * edge.pct) / totalPct);
      allocated += share;
      out.push({ funding_account_id: edge.funding, card_account_id: cardId, reserved_cents: share });
    });
  }
  return out;
}
