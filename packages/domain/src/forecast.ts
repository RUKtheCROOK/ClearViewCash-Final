import { addDays, addMonths, addWeeks, addYears, formatISO, isSameDay, parseISO } from "date-fns";
import type { Bill, IncomeEvent, IsoDate, MoneyCents, PaymentLink, Uuid } from "@cvc/types";
import type { AccountBalance } from "./payment-links";
import { allocatePaymentLinks } from "./payment-links";

export interface ForecastInput {
  startDate: IsoDate;
  horizonDays: number;
  fundingBalances: AccountBalance[];
  cardBalances: AccountBalance[];
  bills: Bill[];
  incomeEvents: IncomeEvent[];
  paymentLinks: PaymentLink[];
  lowBalanceThreshold?: MoneyCents;
}

export interface ForecastDay {
  date: IsoDate;
  fundingBalances: Record<Uuid, MoneyCents>;
  effectiveAvailable: MoneyCents;
  cashIn: MoneyCents;
  cashOut: MoneyCents;
  belowThreshold: boolean;
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

  // Card balances are static for V1 forecast. A future iteration could
  // accrue projected new charges from average daily spend per card.
  const cardBalances = input.cardBalances;

  const days: ForecastDay[] = [];
  const lowBalanceDays: IsoDate[] = [];

  for (let i = 0; i < horizon; i++) {
    const day = addDays(start, i);
    const dayIso = formatISO(day, { representation: "date" });

    let cashIn = 0;
    let cashOut = 0;

    for (const inc of input.incomeEvents) {
      if (occursOn(inc.cadence, parseISO(inc.next_due_at), day)) {
        cashIn += inc.amount;
      }
    }
    for (const bill of input.bills) {
      if (occursOn(bill.cadence, parseISO(bill.next_due_at), day)) {
        cashOut += bill.amount;
      }
    }

    // Distribute net day-flow proportionally to funding accounts so the
    // forecast is per-account, not just aggregate. For V1 we attribute
    // bill outflows to the bill's `linked_account_id` if set, otherwise
    // to the largest funding account; income to the largest funding.
    applyToFunding(balances, input.bills, input.incomeEvents, day);

    const allocations = allocatePaymentLinks(input.paymentLinks, [
      ...Object.entries(balances).map(([id, bal]) => ({ account_id: id, current_balance: bal })),
      ...cardBalances,
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
      cashIn,
      cashOut,
      belowThreshold,
    });
  }

  return { days, lowBalanceDays };
}

function occursOn(cadence: Bill["cadence"], anchor: Date, day: Date): boolean {
  if (cadence === "custom") return isSameDay(anchor, day);
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
    if (!occursOn(inc.cadence, parseISO(inc.next_due_at), day)) continue;
    const target = inc.linked_account_id && inc.linked_account_id in balances ? inc.linked_account_id : largestId;
    balances[target] = (balances[target] ?? 0) + inc.amount;
  }
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
