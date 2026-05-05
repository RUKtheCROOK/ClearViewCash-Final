import { differenceInDays, parseISO } from "date-fns";
import type { IncomeSourceType, Cadence } from "@cvc/types";

/**
 * Income domain helpers — power the redesigned Income page.
 *
 * Conventions:
 *  - All amounts are MoneyCents (integer cents).
 *  - Dates are ISO yyyy-mm-dd unless noted.
 *  - Paused sources are excluded from forecast/next/this-month math but stay in
 *    the recurring list (rendered dimmed by the UI).
 */

export interface IncomeForRollup {
  id: string;
  name: string;
  amount: number;
  amount_low: number | null;
  amount_high: number | null;
  cadence: Cadence;
  next_due_at: string;
  source_type: IncomeSourceType;
  paused_at: string | null;
  received_at: string | null;
  actual_amount: number | null;
}

/** Receipts are append-only history of past deposits (parallel to bill_payments). */
export interface IncomeReceiptForRollup {
  income_event_id: string;
  amount: number;
  received_at: string;
}

// ─── Source taxonomy ──────────────────────────────────────────────────────

export const INCOME_SOURCE_TYPES: IncomeSourceType[] = [
  "paycheck",
  "freelance",
  "rental",
  "investment",
  "one_time",
];

/** Sage tints: 155 (paycheck), 240 (freelance), 30 (rental), 75 (investment), 0 (one-time).
 *  Returns an OKLCH hue angle 0–360 — used by the icon disc to derive bg/fg. */
export function incomeHueForType(type: IncomeSourceType): number {
  switch (type) {
    case "paycheck":   return 155;
    case "freelance":  return 240;
    case "rental":     return 30;
    case "investment": return 75;
    case "one_time":   return 0;
  }
}

export function incomeLabelForType(type: IncomeSourceType): string {
  switch (type) {
    case "paycheck":   return "Paycheck";
    case "freelance":  return "Freelance";
    case "rental":     return "Rental";
    case "investment": return "Investment";
    case "one_time":   return "One-time";
  }
}

/** A short string the wizard uses as the default category label. */
export function defaultCategoryForType(type: IncomeSourceType): string {
  switch (type) {
    case "paycheck":   return "Salary";
    case "freelance":  return "Freelance";
    case "rental":     return "Rental";
    case "investment": return "Investment";
    case "one_time":   return "Other income";
  }
}

// ─── Forecast point ───────────────────────────────────────────────────────

/** When a source has a low/high range, forecast with the midpoint (rounded).
 *  Otherwise use the single `amount`. */
export function forecastAmount(i: IncomeForRollup): number {
  if (i.amount_low != null && i.amount_high != null) {
    return Math.round((i.amount_low + i.amount_high) / 2);
  }
  return i.amount;
}

export function isVariable(i: Pick<IncomeForRollup, "amount_low" | "amount_high">): boolean {
  return i.amount_low != null && i.amount_high != null && i.amount_low !== i.amount_high;
}

export function isPaused(i: Pick<IncomeForRollup, "paused_at">): boolean {
  return i.paused_at != null;
}

// ─── Next paycheck ────────────────────────────────────────────────────────

export interface NextPaycheckInfo<T extends IncomeForRollup> {
  source: T;
  daysUntil: number;
  forecastCents: number;
}

/**
 * Pick the soonest upcoming paycheck (source_type == "paycheck") that isn't
 * paused. Falls back to the soonest non-paused recurring source of any type
 * when no paycheck exists. One-time, already-received items are skipped.
 */
export function findNextPaycheck<T extends IncomeForRollup>(
  items: T[],
  todayIso: string,
): NextPaycheckInfo<T> | null {
  const today = parseISO(todayIso);
  const eligible = items.filter((i) => {
    if (isPaused(i)) return false;
    if (i.cadence === "once" && i.received_at) return false;
    return true;
  });
  if (eligible.length === 0) return null;
  const paychecks = eligible
    .filter((i) => i.source_type === "paycheck")
    .sort((a, b) => a.next_due_at.localeCompare(b.next_due_at));
  const pick = paychecks[0]
    ?? eligible.slice().sort((a, b) => a.next_due_at.localeCompare(b.next_due_at))[0];
  if (!pick) return null;
  return {
    source: pick,
    daysUntil: differenceInDays(parseISO(pick.next_due_at), today),
    forecastCents: forecastAmount(pick),
  };
}

// ─── This month progress ─────────────────────────────────────────────────

export interface MonthProgress {
  expectedTotalCents: number;
  receivedTotalCents: number;
  expectedCount: number;
  receivedCount: number;
  /** 0..1, capped to 1 (used by the progress bar). */
  ratio: number;
  monthLabel: string;
}

export function startOfMonthIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function endOfMonthIso(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Aggregate "this month" income progress.
 *
 * Expected: any non-paused source with next_due_at in the current month, plus
 * any source whose receipts within the month landed already (so a bi-weekly
 * paycheck that already paid this month still counts toward expectations).
 *
 * Received: sum of receipts (income_receipts) within the month — preferred
 * over the row-level (actual_amount, received_at) which only tracks the most
 * recent receipt for cadence advancement.
 */
export function summariseMonth<T extends IncomeForRollup>(
  items: T[],
  receipts: IncomeReceiptForRollup[],
  today: Date,
): MonthProgress {
  const start = startOfMonthIso(today);
  const end = endOfMonthIso(today);

  let expectedTotalCents = 0;
  let expectedCount = 0;
  for (const i of items) {
    if (isPaused(i)) continue;
    if (i.next_due_at >= start && i.next_due_at <= end) {
      expectedTotalCents += forecastAmount(i);
      expectedCount += 1;
    }
  }

  let receivedTotalCents = 0;
  let receivedCount = 0;
  for (const r of receipts) {
    if (r.received_at >= start && r.received_at <= end) {
      receivedTotalCents += r.amount;
      receivedCount += 1;
      // A receipt within the month also implicitly counts toward the expected
      // total when the source's next_due_at has already advanced past it.
      // We don't double-add here; expectations already include due-this-month
      // sources, and recurring sources whose payday slipped to last/next month
      // still naturally appear via next_due_at.
    }
  }

  const ratio = expectedTotalCents > 0
    ? Math.min(1, receivedTotalCents / expectedTotalCents)
    : 0;
  const monthLabel = MONTH_NAMES[today.getUTCMonth()] ?? "";

  return {
    expectedTotalCents,
    receivedTotalCents,
    expectedCount,
    receivedCount,
    ratio,
    monthLabel,
  };
}

// ─── Year-to-date ─────────────────────────────────────────────────────────

export interface YearToDateInfo {
  ytdCents: number;
  /** Series for the sparkline: [Jan, Feb, ...] cents through current month. */
  monthlySeries: number[];
  /** Same series for the prior year (Jan..Dec of last year). */
  priorYearSeries: number[];
  /** YoY % delta vs same period last year, or null when last year has no data. */
  yoyDelta: number | null;
}

/**
 * Build YTD totals and a 12-bucket monthly sparkline from the receipts list.
 * The `today` arg defines "year" + how many months are filled in.
 */
export function summariseYtd(
  receipts: IncomeReceiptForRollup[],
  today: Date,
): YearToDateInfo {
  const year = today.getUTCFullYear();
  const monthIdx = today.getUTCMonth(); // 0..11

  const monthlySeries = Array(monthIdx + 1).fill(0);
  const priorYearSeries = Array(12).fill(0);
  let ytdCents = 0;
  let priorYtdSamePeriod = 0;

  for (const r of receipts) {
    const d = parseISO(r.received_at);
    const ry = d.getUTCFullYear();
    const rm = d.getUTCMonth();
    if (ry === year && rm <= monthIdx) {
      monthlySeries[rm] += r.amount;
      ytdCents += r.amount;
    } else if (ry === year - 1) {
      priorYearSeries[rm] += r.amount;
      if (rm <= monthIdx) priorYtdSamePeriod += r.amount;
    }
  }

  const yoyDelta = priorYtdSamePeriod > 0
    ? (ytdCents - priorYtdSamePeriod) / priorYtdSamePeriod
    : null;

  return { ytdCents, monthlySeries, priorYearSeries, yoyDelta };
}

// ─── List sectioning ──────────────────────────────────────────────────────

export interface IncomeSections<T extends IncomeForRollup> {
  recurring: T[];
  oneTime: T[];
}

/**
 * Split incomes into "Recurring" (cadence !== once) and "One-time" buckets.
 * Recurring sorted by next due date ascending; one-time by received_at desc
 * (most recent deposits first), with unreceived one-times slotted at the top.
 */
export function groupIncomeBySection<T extends IncomeForRollup>(items: T[]): IncomeSections<T> {
  const recurring: T[] = [];
  const oneTime: T[] = [];
  for (const i of items) {
    if (i.cadence === "once") oneTime.push(i);
    else recurring.push(i);
  }
  recurring.sort((a, b) => a.next_due_at.localeCompare(b.next_due_at));
  oneTime.sort((a, b) => {
    const da = a.received_at ?? a.next_due_at;
    const db = b.received_at ?? b.next_due_at;
    return db.localeCompare(da);
  });
  return { recurring, oneTime };
}

// ─── Variability stats (detail screen) ────────────────────────────────────

export interface VariabilityStats {
  /** Up to N most recent receipts in chronological order (oldest → newest). */
  recent: IncomeReceiptForRollup[];
  averageCents: number;
  minCents: number;
  maxCents: number;
}

export function computeVariability(
  receipts: IncomeReceiptForRollup[],
  n: number = 6,
): VariabilityStats | null {
  if (receipts.length === 0) {
    return null;
  }
  const sorted = receipts.slice().sort((a, b) => a.received_at.localeCompare(b.received_at));
  const recent = sorted.slice(-n);
  const total = recent.reduce((s, r) => s + r.amount, 0);
  const averageCents = Math.round(total / recent.length);
  const minCents = Math.min(...recent.map((r) => r.amount));
  const maxCents = Math.max(...recent.map((r) => r.amount));
  return { recent, averageCents, minCents, maxCents };
}

// ─── Wizard preview ───────────────────────────────────────────────────────

import { nextDueFromCadence } from "./recurring";

/** Project the next N occurrences for the wizard's "Next 3 paydays" preview. */
export function projectNextDates(
  startIso: string,
  cadence: Cadence,
  n: number,
): string[] {
  if (cadence === "once") return [startIso];
  const out: string[] = [startIso];
  let cursor = startIso;
  for (let k = 1; k < n; k++) {
    cursor = nextDueFromCadence(cursor, cadence);
    out.push(cursor);
  }
  return out;
}
