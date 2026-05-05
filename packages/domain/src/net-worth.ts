import type { MoneyCents } from "@cvc/types";

export interface NetWorthSnapshot {
  assetsCents: MoneyCents;
  liabilitiesCents: MoneyCents;
  netCents: MoneyCents;
  liabilityRatio: number;
}

interface NetWorthAccount {
  type: string;
  current_balance: MoneyCents | null;
}

const ASSET_TYPES = new Set(["depository", "investment"]);
const LIABILITY_TYPES = new Set(["credit", "loan"]);

/**
 * Snapshot of net worth derived from current account balances.
 *
 * - Assets: sum of depository + investment balances (positives only — a
 *   negative depository balance would be an overdraft and is treated as 0
 *   so it doesn't double-count against itself elsewhere).
 * - Liabilities: absolute value of credit + loan balances. Plaid stores credit
 *   balances as positive cents (= amount owed); a negative credit balance is
 *   credit-on-file and reduces liability.
 * - liabilityRatio: liabilities / assets, clamped to [0, 1] for display.
 */
export function computeNetWorthSnapshot(
  accounts: NetWorthAccount[],
): NetWorthSnapshot {
  let assetsCents = 0;
  let liabilitiesCents = 0;
  for (const a of accounts) {
    const bal = a.current_balance ?? 0;
    if (ASSET_TYPES.has(a.type)) {
      assetsCents += Math.max(0, bal);
    } else if (LIABILITY_TYPES.has(a.type)) {
      liabilitiesCents += Math.max(0, bal);
    }
  }
  const netCents = assetsCents - liabilitiesCents;
  const liabilityRatio = assetsCents > 0
    ? Math.min(1, liabilitiesCents / assetsCents)
    : liabilitiesCents > 0
      ? 1
      : 0;
  return { assetsCents, liabilitiesCents, netCents, liabilityRatio };
}
