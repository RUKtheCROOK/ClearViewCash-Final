import type { Category } from "./category";

/**
 * Map Plaid Personal Finance Category (PFC) primary IDs to ClearViewCash
 * seed_key handles. Plaid PFC has 16 primaries; we map 1:1 to seed_key
 * (which the migration uses to materialize the corresponding seeded category
 * row). Both TRANSFER_IN and TRANSFER_OUT collapse onto the single TRANSFER
 * seed.
 *
 * Reference: https://plaid.com/docs/api/products/transactions/#personal-finance-category-taxonomy
 */
export const PLAID_PFC_TO_SEED_KEY: Record<string, string> = {
  INCOME: "INCOME",
  TRANSFER_IN: "TRANSFER",
  TRANSFER_OUT: "TRANSFER",
  LOAN_PAYMENTS: "LOAN_PAYMENTS",
  BANK_FEES: "BANK_FEES",
  ENTERTAINMENT: "ENTERTAINMENT",
  FOOD_AND_DRINK: "FOOD_AND_DRINK",
  GENERAL_MERCHANDISE: "GENERAL_MERCHANDISE",
  HOME_IMPROVEMENT: "HOME_IMPROVEMENT",
  MEDICAL: "MEDICAL",
  PERSONAL_CARE: "PERSONAL_CARE",
  GENERAL_SERVICES: "GENERAL_SERVICES",
  GOVERNMENT_AND_NON_PROFIT: "GOVERNMENT_AND_NON_PROFIT",
  TRANSPORTATION: "TRANSPORTATION",
  TRAVEL: "TRAVEL",
  RENT_AND_UTILITIES: "RENT_AND_UTILITIES",
};

/**
 * Legacy display-name map. Kept for backward compatibility with code paths
 * that still consume the text-named categories. New consumers should resolve
 * Plaid → category_id via `resolveCategoryIdFromPlaid` instead.
 *
 * @deprecated Use PLAID_PFC_TO_SEED_KEY + resolveCategoryIdFromPlaid.
 */
export const PLAID_PFC_TO_CVC: Record<string, string> = {
  INCOME: "Income",
  TRANSFER_IN: "Transfer",
  TRANSFER_OUT: "Transfer",
  LOAN_PAYMENTS: "Debt Payments",
  BANK_FEES: "Fees",
  ENTERTAINMENT: "Entertainment",
  FOOD_AND_DRINK: "Food & Dining",
  GENERAL_MERCHANDISE: "Shopping",
  HOME_IMPROVEMENT: "Home",
  MEDICAL: "Health",
  PERSONAL_CARE: "Personal Care",
  GENERAL_SERVICES: "Services",
  GOVERNMENT_AND_NON_PROFIT: "Taxes & Government",
  TRANSPORTATION: "Transportation",
  TRAVEL: "Travel",
  RENT_AND_UTILITIES: "Bills & Utilities",
};

export const CVC_CATEGORIES = Array.from(new Set(Object.values(PLAID_PFC_TO_CVC))).sort();

/** @deprecated Use resolveCategoryIdFromPlaid. */
export function categorizeFromPlaid(pfcPrimary: string | null | undefined): string {
  if (!pfcPrimary) return "Uncategorized";
  return PLAID_PFC_TO_CVC[pfcPrimary] ?? "Uncategorized";
}

/**
 * Resolve a Plaid PFC primary to a `{ categoryId, categoryName }` pair using
 * a seed-key map fetched from a space's categories. Returns `{null,null}`
 * when the PFC value isn't in the seed map (caller should leave both fields
 * null on the transaction; the row renders as Uncategorized).
 */
export function resolveCategoryIdFromPlaid(
  pfcPrimary: string | null | undefined,
  bySeedKey: ReadonlyMap<string, Category>,
): { categoryId: string | null; categoryName: string | null } {
  if (!pfcPrimary) return { categoryId: null, categoryName: null };
  const seed = PLAID_PFC_TO_SEED_KEY[pfcPrimary];
  if (!seed) return { categoryId: null, categoryName: null };
  const cat = bySeedKey.get(seed);
  if (!cat) return { categoryId: null, categoryName: null };
  return { categoryId: cat.id, categoryName: cat.name };
}
