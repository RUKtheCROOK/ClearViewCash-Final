// Mirror of packages/domain/src/recurring.ts. Keep in sync.
// Edge Functions cannot import outside supabase/functions/.

import { differenceInDays, parseISO } from "npm:date-fns@^4.1.0";

export interface RecurringTxn {
  id: string;
  posted_at: string;
  amount: number;
  merchant_name: string | null;
  pending: boolean;
}

export interface RecurringGroup {
  id: string;
  merchant_name: string;
  cadence: "monthly" | "weekly" | "biweekly" | "yearly" | "custom";
  median_amount: number;
  transaction_ids: string[];
  last_seen: string;
  is_inbound: boolean;
}

const CADENCE_TARGETS: Array<[RecurringGroup["cadence"], number, number]> = [
  ["weekly", 7, 2],
  ["biweekly", 14, 3],
  ["monthly", 30, 5],
  ["yearly", 365, 14],
];

export function detectRecurring(transactions: RecurringTxn[]): RecurringGroup[] {
  const groups = new Map<string, RecurringTxn[]>();
  for (const t of transactions) {
    if (!t.merchant_name || t.pending) continue;
    const key = normalizeMerchant(t.merchant_name) + "|" + Math.sign(t.amount);
    const arr = groups.get(key) ?? [];
    arr.push(t);
    groups.set(key, arr);
  }
  const result: RecurringGroup[] = [];
  for (const [key, txns] of groups) {
    if (txns.length < 3) continue;
    const sorted = [...txns].sort((a, b) => a.posted_at.localeCompare(b.posted_at));
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(differenceInDays(parseISO(sorted[i]!.posted_at), parseISO(sorted[i - 1]!.posted_at)));
    }
    const cadence = inferCadence(gaps);
    if (!cadence) continue;
    const amounts = sorted.map((t) => Math.abs(t.amount)).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)] ?? 0;
    const stable = amounts.every((a) => Math.abs(a - median) <= median * 0.15);
    if (!stable) continue;
    const merchant = sorted[0]?.merchant_name ?? key;
    const isInbound = (sorted[0]?.amount ?? 0) > 0;
    result.push({
      id: `rec_${key}`,
      merchant_name: merchant,
      cadence,
      median_amount: median,
      transaction_ids: sorted.map((t) => t.id),
      last_seen: sorted[sorted.length - 1]!.posted_at,
      is_inbound: isInbound,
    });
  }
  return result;
}

export function normalizeMerchant(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+\d{2,}$/g, "")
    .replace(/#\w+/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function inferCadence(gaps: number[]): RecurringGroup["cadence"] | null {
  if (gaps.length === 0) return null;
  const median = [...gaps].sort((a, b) => a - b)[Math.floor(gaps.length / 2)] ?? 0;
  for (const [cadence, target, tolerance] of CADENCE_TARGETS) {
    if (Math.abs(median - target) <= tolerance) {
      const allInRange = gaps.every((g) => Math.abs(g - target) <= tolerance * 1.5);
      if (allInRange) return cadence;
    }
  }
  return null;
}
