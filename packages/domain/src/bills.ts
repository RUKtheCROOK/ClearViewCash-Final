import { differenceInDays, parseISO } from "date-fns";

export type BillCycleStatus = "overdue" | "due_soon" | "upcoming";

export interface BillStatusOptions {
  dueSoonDays?: number;
}

export function computeBillStatus(
  nextDueAtIso: string,
  todayIso: string,
  opts: BillStatusOptions = {},
): BillCycleStatus {
  const dueSoonDays = opts.dueSoonDays ?? 7;
  const diff = differenceInDays(parseISO(nextDueAtIso), parseISO(todayIso));
  if (diff < 0) return "overdue";
  if (diff <= dueSoonDays) return "due_soon";
  return "upcoming";
}

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export type BillBucket = "overdue" | "this_week" | "later" | "paid";

export interface BillForBucket {
  next_due_at: string;
  amount: number;
  autopay: boolean;
  latest_payment: { paid_at: string } | null;
}

export interface BucketCounts {
  count: number;
  totalCents: number;
  autopayCount: number;
}

export interface UpcomingSummary {
  next7: BucketCounts;
  next30: BucketCounts;
}

const MS_PER_DAY = 86_400_000;

function daysBetween(aIso: string, bIso: string): number {
  return differenceInDays(parseISO(aIso), parseISO(bIso));
}

/**
 * Bucket a bill into one of four UI groups. "paid" wins when a recent payment
 * exists within the past 30 days regardless of next_due_at — the design's
 * "Paid recently" section is a celebration of completed cycles, not an
 * orthogonal status. Otherwise: overdue if past due, this_week if within 7
 * days, later if beyond.
 */
export function bucketForBill(
  bill: BillForBucket,
  todayIsoStr: string,
  opts: { recentPaidWindowDays?: number; thisWeekDays?: number } = {},
): BillBucket {
  const recentWindow = opts.recentPaidWindowDays ?? 14;
  const weekWindow = opts.thisWeekDays ?? 7;
  if (bill.latest_payment?.paid_at) {
    const sincePaid = daysBetween(todayIsoStr, bill.latest_payment.paid_at);
    if (sincePaid >= 0 && sincePaid <= recentWindow) return "paid";
  }
  const diff = daysBetween(bill.next_due_at, todayIsoStr);
  if (diff < 0) return "overdue";
  if (diff <= weekWindow) return "this_week";
  return "later";
}

export function groupBillsByBucket<T extends BillForBucket>(
  bills: T[],
  todayIsoStr: string,
): Record<BillBucket, T[]> {
  const out: Record<BillBucket, T[]> = {
    overdue: [],
    this_week: [],
    later: [],
    paid: [],
  };
  for (const b of bills) out[bucketForBill(b, todayIsoStr)].push(b);
  return out;
}

/**
 * Forward-looking totals for the upcoming-strip. Bills in "paid" bucket are
 * excluded so the user sees what's still owed.
 */
export function summariseUpcoming<T extends BillForBucket>(
  bills: T[],
  todayIsoStr: string,
): UpcomingSummary {
  const empty = (): BucketCounts => ({ count: 0, totalCents: 0, autopayCount: 0 });
  const next7 = empty();
  const next30 = empty();
  for (const b of bills) {
    const bucket = bucketForBill(b, todayIsoStr);
    if (bucket === "paid") continue;
    const diff = daysBetween(b.next_due_at, todayIsoStr);
    // Overdue counts toward the 7-day strip — it's the most urgent thing the user owes.
    if (diff <= 7) {
      next7.count += 1;
      next7.totalCents += b.amount;
      if (b.autopay) next7.autopayCount += 1;
    }
    if (diff <= 30) {
      next30.count += 1;
      next30.totalCents += b.amount;
      if (b.autopay) next30.autopayCount += 1;
    }
  }
  return { next7, next30 };
}

export function daysLate(nextDueAtIso: string, todayIsoStr: string): number {
  return Math.max(0, daysBetween(todayIsoStr, nextDueAtIso));
}

export function daysUntilDue(nextDueAtIso: string, todayIsoStr: string): number {
  return daysBetween(nextDueAtIso, todayIsoStr);
}

/**
 * Format a row's date label per the design — "Wed, May 7" for upcoming,
 * "Due May 1" for overdue, "Paid Apr 28" for paid bills.
 */
export function formatBillDateLabel(
  bill: BillForBucket,
  todayIsoStr: string,
): string {
  const bucket = bucketForBill(bill, todayIsoStr);
  if (bucket === "paid" && bill.latest_payment?.paid_at) {
    return `Paid ${formatShortDate(bill.latest_payment.paid_at)}`;
  }
  if (bucket === "overdue") {
    return `Due ${formatShortDate(bill.next_due_at)}`;
  }
  // This week / later — include weekday for proximity bills, plain date otherwise
  const diff = daysBetween(bill.next_due_at, todayIsoStr);
  if (diff <= 7) return formatWeekdayDate(bill.next_due_at);
  return formatShortDate(bill.next_due_at);
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatShortDate(iso: string): string {
  const d = parseISO(iso);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function formatWeekdayDate(iso: string): string {
  const d = parseISO(iso);
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function formatLongDate(iso: string): string {
  const d = parseISO(iso);
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${weekdays[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
