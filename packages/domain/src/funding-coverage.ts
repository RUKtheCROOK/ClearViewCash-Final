import type { MoneyCents, PaymentLink, Uuid } from "@cvc/types";
import { allocatePaymentLinks } from "./payment-links";
import { accountDisplayName } from "./account-display";

export interface FundingCoverageRow {
  cardAccountId: Uuid;
  cardName: string;
  mask: string | null;
  debtCents: MoneyCents;
  fundingAccountId: Uuid | null;
  fundingAccountName: string | null;
  coverCents: MoneyCents;
  ok: boolean;
}

export interface FundingCoverageReport {
  rows: FundingCoverageRow[];
  totalDebtCents: MoneyCents;
  totalCoverCents: MoneyCents;
  pct: number;
  status: "ok" | "warn" | "short";
  shortByCents: MoneyCents;
}

interface CoverageAccount {
  id: Uuid;
  type: string;
  name: string;
  display_name?: string | null;
  mask: string | null;
  current_balance: MoneyCents | null;
}

/**
 * Per credit-card view of how much each card owes vs. how much its linked
 * funding accounts can actually cover right now. Aggregates allocations from
 * `allocatePaymentLinks`, then caps each card's cover at the funding account's
 * available balance share.
 *
 * Status thresholds: ok = 100% covered, warn = 80–99%, short = below 80%.
 */
export function computeFundingCoverage(args: {
  accounts: CoverageAccount[];
  paymentLinks: PaymentLink[];
}): FundingCoverageReport {
  const { accounts, paymentLinks } = args;
  const cards = accounts.filter((a) => a.type === "credit");
  const balances = accounts.map((a) => ({
    account_id: a.id,
    current_balance: a.current_balance ?? 0,
  }));
  const allocations = allocatePaymentLinks(paymentLinks, balances);

  // Aggregate allocations per card, choosing the largest single funder as
  // the displayed source (rows in the design list one funder per card).
  const allocByCard = new Map<
    Uuid,
    Array<{ funding: Uuid; reserved: MoneyCents }>
  >();
  for (const a of allocations) {
    const arr = allocByCard.get(a.card_account_id) ?? [];
    arr.push({ funding: a.funding_account_id, reserved: a.reserved_cents });
    allocByCard.set(a.card_account_id, arr);
  }

  // Track funder remaining cash so a single account can't "double-cover" across
  // multiple cards. Walks cards in declining-debt order.
  const funderRemaining = new Map<Uuid, MoneyCents>();
  for (const a of accounts) {
    if (a.type === "depository" && a.current_balance != null) {
      funderRemaining.set(a.id, a.current_balance);
    }
  }

  const sortedCards = [...cards].sort(
    (a, b) => (b.current_balance ?? 0) - (a.current_balance ?? 0),
  );

  const rows: FundingCoverageRow[] = sortedCards.map((card) => {
    const debt = card.current_balance ?? 0;
    const allocs = (allocByCard.get(card.id) ?? []).sort(
      (a, b) => b.reserved - a.reserved,
    );
    const primary = allocs[0] ?? null;
    const fundingAccount = primary
      ? accounts.find((a) => a.id === primary.funding) ?? null
      : null;

    let coverFromAllocs = 0;
    for (const alloc of allocs) {
      const remaining = funderRemaining.get(alloc.funding) ?? 0;
      const take = Math.min(remaining, alloc.reserved);
      coverFromAllocs += take;
      funderRemaining.set(alloc.funding, remaining - take);
    }

    return {
      cardAccountId: card.id,
      cardName: accountDisplayName({
        name: card.name,
        display_name: card.display_name ?? null,
      }),
      mask: card.mask,
      debtCents: debt,
      fundingAccountId: fundingAccount?.id ?? null,
      fundingAccountName: fundingAccount
        ? accountDisplayName({
            name: fundingAccount.name,
            display_name: fundingAccount.display_name ?? null,
          })
        : null,
      coverCents: Math.min(coverFromAllocs, debt),
      ok: coverFromAllocs >= debt,
    };
  });

  const totalDebtCents = rows.reduce((s, r) => s + r.debtCents, 0);
  const totalCoverCents = rows.reduce((s, r) => s + r.coverCents, 0);
  const pct = totalDebtCents > 0
    ? Math.min(100, Math.round((totalCoverCents / totalDebtCents) * 100))
    : 100;
  const status: "ok" | "warn" | "short" =
    pct >= 100 ? "ok" : pct >= 80 ? "warn" : "short";
  const shortByCents = Math.max(0, totalDebtCents - totalCoverCents);

  return { rows, totalDebtCents, totalCoverCents, pct, status, shortByCents };
}
