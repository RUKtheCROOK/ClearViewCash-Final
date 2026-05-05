import type { PaymentLink } from "@cvc/types";

export interface AccountsSummary {
  accountsCount: number;
  linkedCardCount: number;
  totalCashCents: number;
  creditOwedCents: number;
  investmentsCents: number;
}

export function summarizeAccounts(
  accounts: Array<{ id: string; type: string | null; current_balance: number | null }>,
  links: PaymentLink[],
): AccountsSummary {
  let totalCashCents = 0;
  let creditOwedCents = 0;
  let investmentsCents = 0;
  for (const a of accounts) {
    const bal = a.current_balance ?? 0;
    if (a.type === "depository") totalCashCents += bal;
    else if (a.type === "credit" || a.type === "loan") {
      if (bal > 0) creditOwedCents += bal;
    } else if (a.type === "investment") investmentsCents += bal;
  }
  const linkedCardIds = new Set<string>();
  for (const l of links) for (const c of l.cards) linkedCardIds.add(c.card_account_id);
  return {
    accountsCount: accounts.length,
    linkedCardCount: linkedCardIds.size,
    totalCashCents,
    creditOwedCents,
    investmentsCents,
  };
}
