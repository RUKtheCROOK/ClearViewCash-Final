// Mirror of packages/domain/src/forecast.ts. Keep in sync.
import { addDays, addMonths, addWeeks, addYears, formatISO, isSameDay, parseISO } from "npm:date-fns@^4.1.0";
import type { AccountBalance, PaymentLink } from "./payment-links.ts";
import { allocatePaymentLinks } from "./payment-links.ts";

type Cadence = "monthly" | "weekly" | "biweekly" | "yearly" | "custom" | "once";

export interface CashEvent {
  amount: number;
  cadence: Cadence;
  next_due_at: string;
  linked_account_id: string | null;
  received_at?: string | null;
}

export interface CardSpendRate {
  card_account_id: string;
  daily_spend_cents: number;
}

export interface ForecastInput {
  startDate: string;
  horizonDays: number;
  fundingBalances: AccountBalance[];
  cardBalances: AccountBalance[];
  bills: CashEvent[];
  incomeEvents: CashEvent[];
  paymentLinks: PaymentLink[];
  lowBalanceThreshold?: number;
  cardDailySpend?: CardSpendRate[];
}

export interface ForecastDay {
  date: string;
  fundingBalances: Record<string, number>;
  effectiveAvailable: number;
  cashIn: number;
  cashOut: number;
  belowThreshold: boolean;
}

export interface ForecastResult {
  days: ForecastDay[];
  lowBalanceDays: string[];
}

const MAX_HORIZON = 365;

export function forecast(input: ForecastInput): ForecastResult {
  const horizon = Math.min(Math.max(input.horizonDays, 1), MAX_HORIZON);
  const start = parseISO(input.startDate);
  const threshold = input.lowBalanceThreshold ?? 0;

  const balances: Record<string, number> = {};
  for (const b of input.fundingBalances) balances[b.account_id] = b.current_balance;

  const cardBalanceById: Record<string, number> = {};
  for (const c of input.cardBalances) cardBalanceById[c.account_id] = c.current_balance;
  const dailySpendById: Record<string, number> = {};
  for (const r of input.cardDailySpend ?? []) dailySpendById[r.card_account_id] = r.daily_spend_cents;

  const days: ForecastDay[] = [];
  const lowBalanceDays: string[] = [];

  for (let i = 0; i < horizon; i++) {
    const day = addDays(start, i);
    const dayIso = formatISO(day, { representation: "date" });
    let cashIn = 0, cashOut = 0;
    for (const inc of input.incomeEvents) {
      if (incomeEventConsumed(inc)) continue;
      if (occursOn(inc.cadence, parseISO(inc.next_due_at), day)) cashIn += inc.amount;
    }
    for (const bill of input.bills) if (occursOn(bill.cadence, parseISO(bill.next_due_at), day)) cashOut += bill.amount;

    applyToFunding(balances, input.bills, input.incomeEvents, day);

    if (i > 0) {
      for (const id of Object.keys(cardBalanceById)) {
        const rate = dailySpendById[id] ?? 0;
        if (rate > 0) cardBalanceById[id] = (cardBalanceById[id] ?? 0) + rate;
      }
    }

    const allocations = allocatePaymentLinks(input.paymentLinks, [
      ...Object.entries(balances).map(([id, bal]) => ({ account_id: id, current_balance: bal })),
      ...Object.entries(cardBalanceById).map(([id, bal]) => ({ account_id: id, current_balance: bal })),
    ]);
    const reservedByFunding: Record<string, number> = {};
    for (const a of allocations) reservedByFunding[a.funding_account_id] = (reservedByFunding[a.funding_account_id] ?? 0) + a.reserved_cents;

    let effective = 0;
    for (const id of Object.keys(balances)) effective += (balances[id] ?? 0) - (reservedByFunding[id] ?? 0);

    const belowThreshold = effective < threshold;
    if (belowThreshold) lowBalanceDays.push(dayIso);

    days.push({ date: dayIso, fundingBalances: { ...balances }, effectiveAvailable: effective, cashIn, cashOut, belowThreshold });
  }
  return { days, lowBalanceDays };
}

function occursOn(cadence: Cadence, anchor: Date, day: Date): boolean {
  if (cadence === "custom" || cadence === "once") return isSameDay(anchor, day);
  if (cadence === "weekly") { let d = anchor; while (d < day) d = addWeeks(d, 1); return isSameDay(d, day); }
  if (cadence === "biweekly") { let d = anchor; while (d < day) d = addWeeks(d, 2); return isSameDay(d, day); }
  if (cadence === "monthly") { let d = anchor; while (d < day) d = addMonths(d, 1); return isSameDay(d, day); }
  if (cadence === "yearly") { let d = anchor; while (d < day) d = addYears(d, 1); return isSameDay(d, day); }
  return false;
}

function incomeEventConsumed(inc: CashEvent): boolean {
  return inc.cadence === "once" && inc.received_at != null;
}

function applyToFunding(balances: Record<string, number>, bills: CashEvent[], income: CashEvent[], day: Date): void {
  const ids = Object.keys(balances);
  if (ids.length === 0) return;
  const largest = ids.reduce((a, b) => ((balances[a] ?? 0) >= (balances[b] ?? 0) ? a : b));
  for (const bill of bills) {
    if (!occursOn(bill.cadence, parseISO(bill.next_due_at), day)) continue;
    const tgt = bill.linked_account_id && bill.linked_account_id in balances ? bill.linked_account_id : largest;
    balances[tgt] = (balances[tgt] ?? 0) - bill.amount;
  }
  for (const inc of income) {
    if (incomeEventConsumed(inc)) continue;
    if (!occursOn(inc.cadence, parseISO(inc.next_due_at), day)) continue;
    const tgt = inc.linked_account_id && inc.linked_account_id in balances ? inc.linked_account_id : largest;
    balances[tgt] = (balances[tgt] ?? 0) + inc.amount;
  }
}
