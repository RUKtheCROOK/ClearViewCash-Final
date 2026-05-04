import { addDays, addMonths, addWeeks, addYears, formatISO, isSameDay, parseISO } from "date-fns";
import type { Bill, Cadence, IncomeEvent, IsoDate, MoneyCents, PaymentLink, Uuid } from "@cvc/types";
import type { AccountBalance } from "./payment-links";
import { allocatePaymentLinks } from "./payment-links";

export interface CardSpendRate {
  card_account_id: Uuid;
  daily_spend_cents: MoneyCents;
}

export interface ForecastInput {
  startDate: IsoDate;
  horizonDays: number;
  fundingBalances: AccountBalance[];
  cardBalances: AccountBalance[];
  bills: Bill[];
  incomeEvents: IncomeEvent[];
  paymentLinks: PaymentLink[];
  lowBalanceThreshold?: MoneyCents;
  /**
   * Optional projected daily spend per credit card. When provided, each card's
   * balance accrues by `daily_spend_cents` per day in the forecast horizon,
   * which feeds back into the payment-link reservation each day. Omit (or pass
   * a zero rate) to keep card balances static.
   */
  cardDailySpend?: CardSpendRate[];
}

export type AppliedItemKind = "bill" | "income" | "estimated_card_spend";
export type AppliedItemSource = "scheduled" | "estimated";

/**
 * One concrete thing that happens to the user's money on a given day. Bills
 * and income are "scheduled" (the user knows them); card-spend accruals are
 * "estimated" (projected from the last 30 days of activity).
 *
 * `amount` is signed: positive = inflow, negative = outflow.
 */
export interface AppliedDayItem {
  kind: AppliedItemKind;
  source: AppliedItemSource;
  name: string;
  amount: MoneyCents;
  accountId: Uuid | null;
  refId: Uuid | null;
  cadence?: Cadence;
  note?: string;
}

export interface ForecastDay {
  date: IsoDate;
  fundingBalances: Record<Uuid, MoneyCents>;
  effectiveAvailable: MoneyCents;
  /**
   * Effective available at the start of the day, before this day's bills,
   * income, and card-spend accruals are applied. For day 0 this is the initial
   * effective available; for day N>0 this equals day N-1's effectiveAvailable.
   */
  openEffectiveAvailable: MoneyCents;
  cashIn: MoneyCents;
  cashOut: MoneyCents;
  belowThreshold: boolean;
  /**
   * Itemized list of every bill, income, and estimated card-spend accrual
   * that contributes to this day. Used by the day-detail UI.
   */
  appliedItems: AppliedDayItem[];
}

export interface ForecastResult {
  days: ForecastDay[];
  lowBalanceDays: IsoDate[];
}

const MAX_HORIZON = 365;

export function forecast(input: ForecastInput): ForecastResult {
  const horizon = Math.min(Math.max(input.horizonDays, 1), MAX_HORIZON);
  const start = parseISO(input.startDate);
  const threshold = input.lowBalanceThreshold ?? 0;

  const balances: Record<Uuid, MoneyCents> = {};
  for (const b of input.fundingBalances) balances[b.account_id] = b.current_balance;

  const cardBalanceById: Record<Uuid, MoneyCents> = {};
  const cardNameById: Record<Uuid, string> = {};
  for (const c of input.cardBalances) {
    cardBalanceById[c.account_id] = c.current_balance;
    if (c.name) cardNameById[c.account_id] = c.name;
  }

  const dailySpendById: Record<Uuid, MoneyCents> = {};
  for (const r of input.cardDailySpend ?? []) dailySpendById[r.card_account_id] = r.daily_spend_cents;

  // Initial effective available, before any day's flows are applied. This
  // becomes day 0's "open" balance; later days carry the previous close.
  const initialAllocations = allocatePaymentLinks(input.paymentLinks, [
    ...Object.entries(balances).map(([id, bal]) => ({ account_id: id, current_balance: bal })),
    ...Object.entries(cardBalanceById).map(([id, bal]) => ({ account_id: id, current_balance: bal })),
  ]);
  const initialReserved: Record<Uuid, MoneyCents> = {};
  for (const a of initialAllocations) {
    initialReserved[a.funding_account_id] = (initialReserved[a.funding_account_id] ?? 0) + a.reserved_cents;
  }
  let initialEffective = 0;
  for (const id of Object.keys(balances)) {
    initialEffective += (balances[id] ?? 0) - (initialReserved[id] ?? 0);
  }

  const days: ForecastDay[] = [];
  const lowBalanceDays: IsoDate[] = [];
  let prevEffective = initialEffective;

  for (let i = 0; i < horizon; i++) {
    const day = addDays(start, i);
    const dayIso = formatISO(day, { representation: "date" });
    const openEffectiveAvailable = prevEffective;

    let cashIn = 0;
    let cashOut = 0;
    const appliedItems: AppliedDayItem[] = [];

    for (const inc of input.incomeEvents) {
      if (incomeEventConsumed(inc)) continue;
      if (occursOn(inc.cadence, parseISO(inc.next_due_at), day)) {
        cashIn += inc.amount;
        appliedItems.push({
          kind: "income",
          source: "scheduled",
          name: inc.name,
          amount: inc.amount,
          accountId: inc.linked_account_id,
          refId: inc.id,
          cadence: inc.cadence,
        });
      }
    }
    for (const bill of input.bills) {
      if (occursOn(bill.cadence, parseISO(bill.next_due_at), day)) {
        cashOut += bill.amount;
        appliedItems.push({
          kind: "bill",
          source: "scheduled",
          name: bill.name,
          amount: -bill.amount,
          accountId: bill.linked_account_id,
          refId: bill.id,
          cadence: bill.cadence,
        });
      }
    }

    // Distribute net day-flow proportionally to funding accounts so the
    // forecast is per-account, not just aggregate. For V1 we attribute
    // bill outflows to the bill's `linked_account_id` if set, otherwise
    // to the largest funding account; income to the largest funding.
    applyToFunding(balances, input.bills, input.incomeEvents, day);

    // Accrue projected card spend day-by-day. Skip the start day (i=0) so the
    // current balance is the baseline; charges accrue from day 1 onward.
    if (i > 0) {
      for (const id of Object.keys(cardBalanceById)) {
        const rate = dailySpendById[id] ?? 0;
        if (rate > 0) {
          cardBalanceById[id] = (cardBalanceById[id] ?? 0) + rate;
          appliedItems.push({
            kind: "estimated_card_spend",
            source: "estimated",
            name: cardNameById[id] ? `${cardNameById[id]} avg daily spend` : "Card avg daily spend",
            amount: -rate,
            accountId: id,
            refId: id,
            note: "Projected from average of last 30 days",
          });
        }
      }
    }

    const allocations = allocatePaymentLinks(input.paymentLinks, [
      ...Object.entries(balances).map(([id, bal]) => ({ account_id: id, current_balance: bal })),
      ...Object.entries(cardBalanceById).map(([id, bal]) => ({ account_id: id, current_balance: bal })),
    ]);
    const reservedByFunding: Record<Uuid, MoneyCents> = {};
    for (const a of allocations) {
      reservedByFunding[a.funding_account_id] = (reservedByFunding[a.funding_account_id] ?? 0) + a.reserved_cents;
    }

    let effective = 0;
    for (const id of Object.keys(balances)) {
      effective += (balances[id] ?? 0) - (reservedByFunding[id] ?? 0);
    }

    const belowThreshold = effective < threshold;
    if (belowThreshold) lowBalanceDays.push(dayIso);

    days.push({
      date: dayIso,
      fundingBalances: { ...balances },
      effectiveAvailable: effective,
      openEffectiveAvailable,
      cashIn,
      cashOut,
      belowThreshold,
      appliedItems,
    });

    prevEffective = effective;
  }

  return { days, lowBalanceDays };
}

function occursOn(cadence: Bill["cadence"], anchor: Date, day: Date): boolean {
  if (cadence === "custom" || cadence === "once") return isSameDay(anchor, day);
  if (cadence === "weekly") {
    let d = anchor;
    while (d < day) d = addWeeks(d, 1);
    return isSameDay(d, day);
  }
  if (cadence === "biweekly") {
    let d = anchor;
    while (d < day) d = addWeeks(d, 2);
    return isSameDay(d, day);
  }
  if (cadence === "monthly") {
    let d = anchor;
    while (d < day) d = addMonths(d, 1);
    return isSameDay(d, day);
  }
  if (cadence === "yearly") {
    let d = anchor;
    while (d < day) d = addYears(d, 1);
    return isSameDay(d, day);
  }
  return false;
}

/**
 * A "once" income that's been received is already in the funding balance, so
 * the forecast must not also project it as a future inflow. Recurring income
 * advances next_due_at on receipt, so received_at on those rows refers to a
 * past cycle and doesn't gate future occurrences.
 */
function incomeEventConsumed(inc: IncomeEvent): boolean {
  return inc.cadence === "once" && inc.received_at !== null;
}

function applyToFunding(
  balances: Record<Uuid, MoneyCents>,
  bills: Bill[],
  income: IncomeEvent[],
  day: Date,
): void {
  const fundingIds = Object.keys(balances);
  if (fundingIds.length === 0) return;

  const largestId = fundingIds.reduce((a, b) => ((balances[a] ?? 0) >= (balances[b] ?? 0) ? a : b));

  for (const bill of bills) {
    if (!occursOn(bill.cadence, parseISO(bill.next_due_at), day)) continue;
    const target = bill.linked_account_id && bill.linked_account_id in balances ? bill.linked_account_id : largestId;
    balances[target] = (balances[target] ?? 0) - bill.amount;
  }
  for (const inc of income) {
    if (incomeEventConsumed(inc)) continue;
    if (!occursOn(inc.cadence, parseISO(inc.next_due_at), day)) continue;
    const target = inc.linked_account_id && inc.linked_account_id in balances ? inc.linked_account_id : largestId;
    balances[target] = (balances[target] ?? 0) + inc.amount;
  }
}

export interface CardSpendTxn {
  account_id: Uuid;
  amount: MoneyCents;
  posted_at: string;
}

/**
 * Compute average daily spend per credit card from a window of past
 * transactions. Used to project card balance growth in the forecast.
 *
 * Sign convention: we sum the absolute amount of any transaction landing on a
 * card account, regardless of sign. Plaid normalizes credit-card charges as
 * positive amounts, but we don't want a stray refund (negative) to push the
 * estimate below zero, so we use absolute values.
 *
 * Returns 0 for cards with no recent activity (no charge accrual).
 */
export function computeCardDailySpend(
  transactions: CardSpendTxn[],
  cardAccountIds: Uuid[],
  windowDays: number = 30,
): CardSpendRate[] {
  const safeWindow = Math.max(windowDays, 1);
  const totals = new Map<Uuid, MoneyCents>();
  for (const id of cardAccountIds) totals.set(id, 0);
  for (const t of transactions) {
    if (!totals.has(t.account_id)) continue;
    totals.set(t.account_id, (totals.get(t.account_id) ?? 0) + Math.abs(t.amount));
  }
  return cardAccountIds.map((id) => ({
    card_account_id: id,
    daily_spend_cents: Math.round((totals.get(id) ?? 0) / safeWindow),
  }));
}

export interface CoverageBillWarning {
  billId: Uuid;
  billName: string;
  date: IsoDate;
  amount: MoneyCents;
  effectiveAfter: MoneyCents;
  shortfall: MoneyCents;
}

export interface CoverageReport {
  insolvencyDate: IsoDate | null;
  daysUntilInsolvency: number | null;
  worstShortfall: MoneyCents;
  worstShortfallDate: IsoDate | null;
  uncoveredBills: CoverageBillWarning[];
  status: "green" | "yellow" | "red";
}

/**
 * Walk a forecast result and return a coverage assessment: when (if ever) the
 * combined effective balance drops below the threshold, which specific bills
 * land on shortfall days, and an overall status.
 *
 *  - red    = at least one bill in horizon is not covered (shortfall on its due date)
 *  - yellow = effective balance dips below threshold on some day, but no specific
 *             bill is the trigger (e.g., card reservations alone push it under)
 *  - green  = covered through the entire horizon
 */
export function computeCoverageWarnings(
  result: ForecastResult,
  bills: Bill[],
  threshold: MoneyCents = 0,
): CoverageReport {
  let insolvencyDate: IsoDate | null = null;
  let worstShortfall: MoneyCents = 0;
  let worstShortfallDate: IsoDate | null = null;
  const uncoveredBills: CoverageBillWarning[] = [];

  for (const day of result.days) {
    const dayDate = parseISO(day.date);
    if (day.effectiveAvailable < threshold && insolvencyDate === null) {
      insolvencyDate = day.date;
    }
    if (day.effectiveAvailable < worstShortfall) {
      worstShortfall = day.effectiveAvailable;
      worstShortfallDate = day.date;
    }
    if (day.effectiveAvailable < threshold && day.cashOut > 0) {
      for (const bill of bills) {
        if (!occursOn(bill.cadence, parseISO(bill.next_due_at), dayDate)) continue;
        uncoveredBills.push({
          billId: bill.id,
          billName: bill.name,
          date: day.date,
          amount: bill.amount,
          effectiveAfter: day.effectiveAvailable,
          shortfall: threshold - day.effectiveAvailable,
        });
      }
    }
  }

  const start = result.days[0] ? parseISO(result.days[0].date) : null;
  const daysUntilInsolvency =
    insolvencyDate && start
      ? Math.round((parseISO(insolvencyDate).getTime() - start.getTime()) / 86_400_000)
      : null;

  const status: CoverageReport["status"] =
    uncoveredBills.length > 0 ? "red" : insolvencyDate ? "yellow" : "green";

  return {
    insolvencyDate,
    daysUntilInsolvency,
    worstShortfall,
    worstShortfallDate,
    uncoveredBills,
    status,
  };
}

export type ForecastGranularity = "daily" | "weekly" | "monthly";

export interface ForecastBucket {
  label: string;
  startDate: IsoDate;
  endDate: IsoDate;
  /** Effective available at the close of the bucket's last day. */
  effectiveAvailable: MoneyCents;
  /** Effective available at the open of the bucket's first day. */
  openEffectiveAvailable: MoneyCents;
  cashIn: MoneyCents;
  cashOut: MoneyCents;
  belowThreshold: boolean;
  /**
   * All items that occurred within the bucket. For daily granularity this
   * mirrors the day's items; for weekly/monthly this is the concatenation
   * across every day in the bucket. Each item carries its own date via the
   * ForecastDay it came from — but for V1 the UI prefixes each row with the
   * bucket label, which is sufficient.
   */
  appliedItems: AppliedDayItem[];
  /** Per-day breakdown for buckets that span multiple days. */
  days: ForecastDay[];
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Group daily forecast output into weekly or monthly buckets.
 *
 * Cash flow sums; effective available takes the bucket's last day (balance is a
 * snapshot, not a flow). Weeks are ISO weeks anchored to Monday. Months use
 * calendar boundaries.
 */
export function aggregateForecast(days: ForecastDay[], granularity: ForecastGranularity): ForecastBucket[] {
  if (granularity === "daily") {
    return days.map((d) => ({
      label: d.date,
      startDate: d.date,
      endDate: d.date,
      effectiveAvailable: d.effectiveAvailable,
      openEffectiveAvailable: d.openEffectiveAvailable,
      cashIn: d.cashIn,
      cashOut: d.cashOut,
      belowThreshold: d.belowThreshold,
      appliedItems: d.appliedItems,
      days: [d],
    }));
  }

  const buckets = new Map<string, ForecastDay[]>();
  const order: string[] = [];
  for (const d of days) {
    const key = bucketKey(d.date, granularity);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(d);
  }

  return order.map((key) => {
    const group = buckets.get(key)!;
    const first = group[0]!;
    const last = group[group.length - 1]!;
    return {
      label: bucketLabel(first.date, granularity),
      startDate: first.date,
      endDate: last.date,
      effectiveAvailable: last.effectiveAvailable,
      openEffectiveAvailable: first.openEffectiveAvailable,
      cashIn: group.reduce((s, d) => s + d.cashIn, 0),
      cashOut: group.reduce((s, d) => s + d.cashOut, 0),
      belowThreshold: group.some((d) => d.belowThreshold),
      appliedItems: group.flatMap((d) => d.appliedItems),
      days: group,
    };
  });
}

function bucketKey(iso: IsoDate, granularity: "weekly" | "monthly"): string {
  const date = parseISO(iso);
  if (granularity === "monthly") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  // ISO week, Monday-anchored.
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = addDays(date, offset);
  return formatISO(monday, { representation: "date" });
}

function bucketLabel(firstDayInBucket: IsoDate, granularity: "weekly" | "monthly"): string {
  const date = parseISO(firstDayInBucket);
  if (granularity === "monthly") {
    return `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }
  const day = date.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = addDays(date, offset);
  return `Week of ${formatISO(monday, { representation: "date" })}`;
}

export interface WhatIfMutation {
  addBill?: Bill;
  addIncome?: IncomeEvent;
  shiftBillDate?: { id: Uuid; newDate: IsoDate };
  removeBillId?: Uuid;
}

export function applyWhatIf(input: ForecastInput, mutations: WhatIfMutation[]): ForecastInput {
  let bills = [...input.bills];
  let incomeEvents = [...input.incomeEvents];
  for (const m of mutations) {
    if (m.addBill) bills.push(m.addBill);
    if (m.addIncome) incomeEvents.push(m.addIncome);
    if (m.shiftBillDate) {
      bills = bills.map((b) => (b.id === m.shiftBillDate!.id ? { ...b, next_due_at: m.shiftBillDate!.newDate } : b));
    }
    if (m.removeBillId) {
      bills = bills.filter((b) => b.id !== m.removeBillId);
    }
  }
  return { ...input, bills, incomeEvents };
}
