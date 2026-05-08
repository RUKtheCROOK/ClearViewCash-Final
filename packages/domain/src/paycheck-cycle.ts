import { addDays, addMonths, addYears, differenceInDays, format, parseISO } from "date-fns";
import type { Cadence } from "@cvc/types";
import {
  findNextPaycheck,
  type IncomeForRollup,
  type IncomeReceiptForRollup,
} from "./income";

/**
 * Paycheck-to-paycheck cycle math.
 *
 * The cycle is a shifting window anchored to the user's next paycheck:
 *   start = last paycheck received (or estimated by cadence rewind)
 *   end   = next paycheck due
 *
 * All values derive from existing income_events + income_receipts state — no
 * extra schema. The Budgets page uses this window to re-scope spending and to
 * surface "remaining = received − spent" for the current cycle.
 */
export interface PaycheckCycleInfo<T extends IncomeForRollup> {
  /** Anchor source — the paycheck whose next_due_at defines the cycle end. */
  source: T;
  /** Cycle start, ISO yyyy-mm-dd (inclusive). */
  startIso: string;
  /** Cycle end, ISO yyyy-mm-dd (inclusive). Equals source.next_due_at. */
  endIso: string;
  /** Days from today to the next paycheck. May be negative (overdue). */
  daysUntilNext: number;
  /** Cadence of the anchor source — used by the UI for labels. */
  cadence: Cadence;
  /** True when start came from a real receipt; false when estimated. */
  startIsFromReceipt: boolean;
}

/**
 * Inverse of recurring.ts:nextDueFromCadence — used to estimate the previous
 * pay date when no receipt has been logged yet (a freshly-added paycheck has
 * a next_due_at but no history). "once" returns the input unchanged because
 * one-time events have no notion of "previous"; the caller decides what to
 * do in that case.
 */
export function previousDueFromCadence(nextIso: string, cadence: Cadence): string {
  const next = parseISO(nextIso);
  let prev: Date;
  switch (cadence) {
    case "weekly":
      prev = addDays(next, -7);
      break;
    case "biweekly":
      prev = addDays(next, -14);
      break;
    case "yearly":
      prev = addYears(next, -1);
      break;
    case "once":
      prev = next;
      break;
    case "monthly":
    case "custom":
    default:
      prev = addMonths(next, -1);
      break;
  }
  return format(prev, "yyyy-MM-dd");
}

/**
 * Sum of receipts inside [startIso, endIso] across ALL income sources. We
 * intentionally do not filter by source — money is money: a freelance deposit
 * mid-cycle adds to "received this cycle" the same as a paycheck.
 */
export function sumReceiptsInWindow(
  receipts: ReadonlyArray<Pick<IncomeReceiptForRollup, "received_at" | "amount">>,
  startIso: string,
  endIso: string,
): number {
  let total = 0;
  for (const r of receipts) {
    if (r.received_at >= startIso && r.received_at <= endIso) {
      total += r.amount;
    }
  }
  return total;
}

/**
 * Compute the current paycheck cycle window from income state, or null when
 * no eligible paycheck exists (no income, all paused, or only one-time
 * already-received items).
 *
 * Anchor selection mirrors findNextPaycheck — soonest non-paused paycheck,
 * falling back to the soonest non-paused recurring source of any type.
 *
 * Cycle start priority chain:
 *   1. Latest receipt for the anchor source on or before today.
 *   2. The anchor's row-level received_at (set by markIncomeReceived).
 *   3. previousDueFromCadence(next_due_at, cadence) — estimate.
 *   4. For "once" cadence: today − 14 days (sane fallback for one-time).
 */
export function computePaycheckCycle<T extends IncomeForRollup>(
  items: ReadonlyArray<T>,
  receipts: ReadonlyArray<IncomeReceiptForRollup>,
  todayIso: string,
): PaycheckCycleInfo<T> | null {
  const anchor = findNextPaycheck(items.slice(), todayIso);
  if (!anchor) return null;
  const source = anchor.source;
  const endIso = source.next_due_at;

  let startIso: string;
  let startIsFromReceipt = false;

  const matching = receipts
    .filter((r) => r.income_event_id === source.id && r.received_at <= todayIso)
    .sort((a, b) => b.received_at.localeCompare(a.received_at));
  if (matching.length > 0) {
    startIso = matching[0]!.received_at;
    startIsFromReceipt = true;
  } else if (source.received_at && source.received_at <= todayIso) {
    startIso = source.received_at;
    startIsFromReceipt = true;
  } else if (source.cadence === "once") {
    startIso = format(addDays(parseISO(todayIso), -14), "yyyy-MM-dd");
  } else {
    startIso = previousDueFromCadence(endIso, source.cadence);
  }

  const daysUntilNext = differenceInDays(parseISO(endIso), parseISO(todayIso));

  return {
    source,
    startIso,
    endIso,
    daysUntilNext,
    cadence: source.cadence,
    startIsFromReceipt,
  };
}
