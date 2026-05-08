import {
  addDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  formatISO,
  isAfter,
  isBefore,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { AccountType, IsoDate, MoneyCents, Uuid } from "@cvc/types";
import { type Category, UNCATEGORIZED_BUCKET_ID } from "./category";

export type Granularity = "day" | "week" | "month";

export interface DateRange {
  from: IsoDate;
  to: IsoDate;
}

export interface ReportTxn {
  posted_at: string;
  amount: MoneyCents;
  category: string | null;
  category_id?: string | null;
}

export interface AccountTxn {
  posted_at: string;
  amount: MoneyCents;
  account_id: Uuid;
}

export interface ReportAccount {
  id: Uuid;
  type: AccountType;
  current_balance: MoneyCents;
}

export interface CategoryRow {
  category: string;
  total: MoneyCents;
}

export interface CategoryIdRow {
  /** id of the resolved category, or UNCATEGORIZED_BUCKET_ID for the null bucket */
  id: string;
  name: string;
  color: string;
  icon: string;
  total: MoneyCents;
}

export interface CashFlowRow {
  bucket: IsoDate;
  cashIn: MoneyCents;
  cashOut: MoneyCents;
  net: MoneyCents;
}

export interface NetWorthRow {
  bucket: IsoDate;
  cashOnHand: MoneyCents;
  debt: MoneyCents;
  netWorth: MoneyCents;
}

const DAY = (d: Date): IsoDate => formatISO(d, { representation: "date" });

function inRange(iso: string, range: DateRange): boolean {
  return iso >= range.from && iso <= range.to;
}

function isDebt(type: AccountType): boolean {
  return type === "credit" || type === "loan";
}

/**
 * Sum of expenses (negative-amount transactions) per category over the range.
 * Sign convention: negative `amount` is money out; positive is income/refund.
 */
export function spendingByCategory(txns: ReportTxn[], range: DateRange): CategoryRow[] {
  const totals: Record<string, number> = {};
  for (const t of txns) {
    if (!inRange(t.posted_at.slice(0, 10), range)) continue;
    if (t.amount >= 0) continue;
    const c = t.category ?? "Uncategorized";
    totals[c] = (totals[c] ?? 0) + Math.abs(t.amount);
  }
  return Object.entries(totals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * ID-keyed sibling of `spendingByCategory`. Buckets outflows by `category_id`
 * and joins each bucket to the supplied category map so each row carries its
 * stable color/icon/name. Buckets with a null id (or an id absent from the
 * map) collapse into a synthetic "Uncategorized" row keyed by
 * UNCATEGORIZED_BUCKET_ID.
 */
export function spendingByCategoryId(
  txns: ReportTxn[],
  range: DateRange,
  byId: ReadonlyMap<string, Category>,
): CategoryIdRow[] {
  const totals = new Map<string, MoneyCents>();
  for (const t of txns) {
    if (!inRange(t.posted_at.slice(0, 10), range)) continue;
    if (t.amount >= 0) continue;
    const key = t.category_id ?? UNCATEGORIZED_BUCKET_ID;
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(t.amount));
  }
  const rows: CategoryIdRow[] = [];
  for (const [id, total] of totals) {
    if (id === UNCATEGORIZED_BUCKET_ID) {
      rows.push({
        id: UNCATEGORIZED_BUCKET_ID,
        name: "Uncategorized",
        color: "#7b79ae",
        icon: "doc",
        total,
      });
      continue;
    }
    const cat = byId.get(id);
    if (cat) {
      rows.push({ id, name: cat.name, color: cat.color, icon: cat.icon, total });
    } else {
      rows.push({
        id: UNCATEGORIZED_BUCKET_ID,
        name: "Uncategorized",
        color: "#7b79ae",
        icon: "doc",
        total: (rows.find((r) => r.id === UNCATEGORIZED_BUCKET_ID)?.total ?? 0) + total,
      });
    }
  }
  return rows.sort((a, b) => b.total - a.total);
}

function bucketKey(d: Date, granularity: Granularity): IsoDate {
  if (granularity === "day") return DAY(d);
  if (granularity === "week") return DAY(startOfWeek(d, { weekStartsOn: 1 }));
  return DAY(startOfMonth(d));
}

function bucketsForRange(range: DateRange, granularity: Granularity): IsoDate[] {
  const start = parseISO(range.from);
  const end = parseISO(range.to);
  if (isAfter(start, end)) return [];
  if (granularity === "day") {
    return eachDayOfInterval({ start, end }).map(DAY);
  }
  if (granularity === "week") {
    return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(DAY);
  }
  return eachMonthOfInterval({ start, end }).map((d) => DAY(startOfMonth(d)));
}

/**
 * Bucketed cash-in / cash-out / net for the range.
 * Empty buckets are emitted with zero values so the series is dense.
 */
export function cashFlowSeries(
  txns: ReportTxn[],
  range: DateRange,
  granularity: Granularity,
): CashFlowRow[] {
  const buckets = bucketsForRange(range, granularity);
  const indexed: Record<IsoDate, CashFlowRow> = {};
  for (const b of buckets) {
    indexed[b] = { bucket: b, cashIn: 0, cashOut: 0, net: 0 };
  }
  for (const t of txns) {
    const day = t.posted_at.slice(0, 10);
    if (!inRange(day, range)) continue;
    const key = bucketKey(parseISO(day), granularity);
    const row = indexed[key];
    if (!row) continue;
    if (t.amount >= 0) row.cashIn += t.amount;
    else row.cashOut += Math.abs(t.amount);
  }
  return buckets.map((b) => {
    const r = indexed[b]!;
    return { ...r, net: r.cashIn - r.cashOut };
  });
}

function bucketEndDate(bucket: IsoDate, granularity: Granularity, rangeEnd: IsoDate): IsoDate {
  const d = parseISO(bucket);
  if (granularity === "day") return bucket;
  const end = granularity === "week" ? endOfWeek(d, { weekStartsOn: 1 }) : endOfMonth(d);
  const endIso = DAY(end);
  return endIso > rangeEnd ? rangeEnd : endIso;
}

/**
 * Reconstruct net worth at the end of each bucket by walking transactions
 * backward from each account's current balance.
 *
 * This is approximate: it assumes the stored `current_balance` reflects all
 * transactions in `txns`. Off-platform transfers, fees, and interest
 * accruals not present in the transaction feed will not be reflected.
 */
export function netWorthSeries(
  accounts: ReportAccount[],
  txns: AccountTxn[],
  range: DateRange,
  granularity: Granularity,
): NetWorthRow[] {
  const buckets = bucketsForRange(range, granularity);
  if (buckets.length === 0) return [];

  const txnsByAccount = new Map<Uuid, AccountTxn[]>();
  for (const t of txns) {
    const list = txnsByAccount.get(t.account_id) ?? [];
    list.push(t);
    txnsByAccount.set(t.account_id, list);
  }

  return buckets.map((bucket) => {
    const asOf = bucketEndDate(bucket, granularity, range.to);
    let cashOnHand = 0;
    let debt = 0;
    for (const acc of accounts) {
      const accTxns = txnsByAccount.get(acc.id) ?? [];
      const bal = balanceAsOf(acc, accTxns, asOf);
      if (isDebt(acc.type)) debt += bal;
      else if (acc.type === "depository") cashOnHand += bal;
    }
    return { bucket, cashOnHand, debt, netWorth: cashOnHand - debt };
  });
}

function balanceAsOf(account: ReportAccount, accTxns: AccountTxn[], asOf: IsoDate): MoneyCents {
  let bal = account.current_balance;
  for (const t of accTxns) {
    const day = t.posted_at.slice(0, 10);
    if (day <= asOf) continue;
    if (isDebt(account.type)) bal += t.amount;
    else bal -= t.amount;
  }
  return bal;
}

export interface RangePreset {
  key: "this_month" | "last_month" | "ytd" | "last_12_months";
  label: string;
}

export const RANGE_PRESETS: RangePreset[] = [
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "ytd", label: "Year to date" },
  { key: "last_12_months", label: "Last 12 months" },
];

export function resolvePreset(key: RangePreset["key"], today: Date = new Date()): DateRange {
  const t = DAY(today);
  if (key === "this_month") {
    return { from: DAY(startOfMonth(today)), to: t };
  }
  if (key === "last_month") {
    const lastMonth = startOfMonth(addDays(startOfMonth(today), -1));
    return { from: DAY(lastMonth), to: DAY(endOfMonth(lastMonth)) };
  }
  if (key === "ytd") {
    return { from: `${today.getFullYear()}-01-01`, to: t };
  }
  const start = new Date(today);
  start.setFullYear(today.getFullYear() - 1);
  start.setDate(today.getDate() + 1);
  return { from: DAY(start), to: t };
}

export function isValidRange(range: DateRange): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(range.from)) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(range.to)) return false;
  return !isBefore(parseISO(range.to), parseISO(range.from));
}
