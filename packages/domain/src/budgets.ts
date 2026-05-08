import type { MoneyCents } from "@cvc/types";
import { UNCATEGORIZED_BUCKET_ID } from "./category";

export type BudgetPeriod = "monthly" | "weekly" | "paycheck";

export interface BudgetLike {
  category: string;
  category_id?: string | null;
  limit_amount: MoneyCents;
  period: BudgetPeriod;
  rollover: boolean;
}

export interface CategorizedTxn {
  category: string | null;
  category_id?: string | null;
  amount: MoneyCents;
  posted_at: string;
}

export const UNCATEGORIZED = "Uncategorized";

/**
 * Sum outflow magnitudes by category. Inflows (amount >= 0) are ignored —
 * budgets cap spending, not income. Null categories bucket under UNCATEGORIZED
 * so they remain visible to the user.
 */
export function computeSpentByCategory(
  txns: ReadonlyArray<Pick<CategorizedTxn, "category" | "amount">>,
): Record<string, MoneyCents> {
  const totals: Record<string, MoneyCents> = {};
  for (const t of txns) {
    if (t.amount >= 0) continue;
    const cat = t.category ?? UNCATEGORIZED;
    totals[cat] = (totals[cat] ?? 0) + Math.abs(t.amount);
  }
  return totals;
}

/**
 * ID-keyed sibling of `computeSpentByCategory`. Buckets outflows by
 * `category_id`, falling back to `UNCATEGORIZED_BUCKET_ID` when null. Use this
 * when the caller has a `Map<id, Category>` available — name-based bucketing
 * collapses category renames into a single bucket which loses history.
 */
export function computeSpentByCategoryId(
  txns: ReadonlyArray<Pick<CategorizedTxn, "category_id" | "amount">>,
): Record<string, MoneyCents> {
  const totals: Record<string, MoneyCents> = {};
  for (const t of txns) {
    if (t.amount >= 0) continue;
    const key = t.category_id ?? UNCATEGORIZED_BUCKET_ID;
    totals[key] = (totals[key] ?? 0) + Math.abs(t.amount);
  }
  return totals;
}

/**
 * Carry-over from the prior calendar month. Returns the leftover (limit minus
 * prior-month outflow in this category), clamped at zero — overspend does not
 * eat into the new month's cap. Weekly budgets return 0 in v1; weekly rollover
 * is deferred until we have a clearer week-boundary policy.
 *
 * `now` is parameterized so callers in tests can pin time without monkey-
 * patching the global Date.
 */
export function computeRolloverCents(
  budget: BudgetLike,
  txnsLast60d: ReadonlyArray<Pick<CategorizedTxn, "category" | "amount" | "posted_at">>,
  now: Date = new Date(),
): MoneyCents {
  if (!budget.rollover) return 0;
  if (budget.period !== "monthly") return 0;

  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const priorMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const startIso = priorMonthStart.toISOString().slice(0, 10);
  const endIso = thisMonthStart.toISOString().slice(0, 10);

  let priorSpend = 0;
  for (const t of txnsLast60d) {
    if (t.amount >= 0) continue;
    if ((t.category ?? UNCATEGORIZED) !== budget.category) continue;
    if (t.posted_at < startIso || t.posted_at >= endIso) continue;
    priorSpend += Math.abs(t.amount);
  }
  return Math.max(0, budget.limit_amount - priorSpend);
}

export function effectiveLimit(budget: BudgetLike, rolloverCents: MoneyCents): MoneyCents {
  return budget.limit_amount + rolloverCents;
}

export interface BudgetSuggestion {
  category: string;
  suggested_cents: MoneyCents;
  monthly_avg_cents: MoneyCents;
}

/**
 * Suggest budgets from the user's recent spend history.
 *
 * Looks at outflows over the last 90 days, groups by category, ignores null /
 * Uncategorized and any category the user already has a budget for. Returns
 * the top 6 by total spend, with a 15% headroom on the monthly average rounded
 * to the nearest dollar — round numbers feel like budgets, not spreadsheet
 * entries.
 */
export function suggestBudgets(
  txns: ReadonlyArray<Pick<CategorizedTxn, "category" | "amount" | "posted_at">>,
  existingCategories: ReadonlySet<string>,
  now: Date = new Date(),
): BudgetSuggestion[] {
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 90));
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const totals = new Map<string, MoneyCents>();
  for (const t of txns) {
    if (t.amount >= 0) continue;
    if (t.posted_at < cutoffIso) continue;
    if (!t.category) continue;
    if (existingCategories.has(t.category)) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + Math.abs(t.amount));
  }
  const ranked = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, total]) => {
      const monthly_avg_cents = Math.round(total / 3);
      const padded = Math.round(monthly_avg_cents * 1.15);
      const suggested_cents = Math.round(padded / 100) * 100;
      return { category, suggested_cents, monthly_avg_cents };
    });
  return ranked;
}
