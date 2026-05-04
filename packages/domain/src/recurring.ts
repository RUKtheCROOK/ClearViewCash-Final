import { addDays, addMonths, addYears, differenceInDays, format, parseISO } from "date-fns";
import type { Cadence, MoneyCents, Transaction, Uuid } from "@cvc/types";

export interface RecurringGroup {
  id: string;
  merchant_name: string;
  cadence: Cadence;
  median_amount: MoneyCents;
  transaction_ids: Uuid[];
  last_seen: string;
  is_inbound: boolean;
}

const CADENCE_TARGETS: Array<[Cadence, number, number]> = [
  ["weekly", 7, 2],
  ["biweekly", 14, 3],
  ["monthly", 30, 5],
  ["yearly", 365, 14],
];

/**
 * Detect recurring transaction groups by merchant name + cadence + amount stability.
 * V1 heuristic: at least 3 transactions sharing a normalized merchant key, with
 * inter-transaction day gaps clustering near a known cadence (weekly/biweekly/monthly/yearly)
 * within tolerance, and amount within 15% of the median.
 *
 * NOT a perfect classifier — designed for high precision on common bills/paychecks.
 * Edge cases (variable utility bills, weekend-shifted ACH) will miss; user can
 * mark them manually.
 */
export function detectRecurring(transactions: Transaction[]): RecurringGroup[] {
  const groups = new Map<string, Transaction[]>();
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

/**
 * Project the next occurrence ISO date (YYYY-MM-DD) given the last seen date
 * and a cadence. "custom" falls back to monthly because that's the most common
 * cadence for unclassified recurring patterns.
 */
export function nextDueFromCadence(lastSeenIso: string, cadence: Cadence): string {
  const last = parseISO(lastSeenIso);
  let next: Date;
  switch (cadence) {
    case "weekly":
      next = addDays(last, 7);
      break;
    case "biweekly":
      next = addDays(last, 14);
      break;
    case "yearly":
      next = addYears(last, 1);
      break;
    case "once":
      // One-time events do not recur; callers should not advance the cycle.
      // We return the input date unchanged for safety.
      next = last;
      break;
    case "monthly":
    case "custom":
    default:
      next = addMonths(last, 1);
      break;
  }
  return format(next, "yyyy-MM-dd");
}

function inferCadence(gaps: number[]): Cadence | null {
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
