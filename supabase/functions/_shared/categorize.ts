// Mirror of packages/domain/src/categorize.ts. Keep in sync.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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

export function categorizeFromPlaid(pfcPrimary: string | null | undefined): string {
  if (!pfcPrimary) return "Uncategorized";
  return PLAID_PFC_TO_CVC[pfcPrimary] ?? "Uncategorized";
}

interface CategoryRowLite {
  id: string;
  name: string;
  seed_key: string | null;
}

/**
 * Resolve a Plaid PFC primary value to a category row in the owner's default
 * space. Falls back to `{categoryId: null, categoryName: <legacy CVC label>}`
 * when the seed isn't found — the legacy text column still gets populated so
 * UI surfaces that haven't migrated to id-based reads keep working.
 *
 * Caches per (ownerUserId) within a sync invocation. Pass an empty Map for the
 * first call and reuse it for subsequent rows of the same item.
 */
export async function resolveCategoryIdForPlaid(
  supa: SupabaseClient,
  ownerUserId: string,
  pfcPrimary: string | null | undefined,
  cache: Map<string, Map<string, CategoryRowLite>>,
): Promise<{ categoryId: string | null; categoryName: string }> {
  const fallbackName = categorizeFromPlaid(pfcPrimary);
  if (!pfcPrimary) return { categoryId: null, categoryName: fallbackName };
  const seedKey = PLAID_PFC_TO_SEED_KEY[pfcPrimary];
  if (!seedKey) return { categoryId: null, categoryName: fallbackName };

  let bySeed = cache.get(ownerUserId);
  if (!bySeed) {
    bySeed = new Map();
    const { data: user } = await supa
      .from("users")
      .select("default_space_id")
      .eq("id", ownerUserId)
      .maybeSingle();
    const defaultSpaceId = user?.default_space_id as string | null | undefined;
    if (defaultSpaceId) {
      const { data: rows } = await supa
        .from("categories")
        .select("id, name, seed_key")
        .eq("space_id", defaultSpaceId)
        .is("archived_at", null);
      for (const r of (rows ?? []) as CategoryRowLite[]) {
        if (r.seed_key) bySeed.set(r.seed_key, r);
      }
    }
    cache.set(ownerUserId, bySeed);
  }

  const cat = bySeed.get(seedKey);
  if (!cat) return { categoryId: null, categoryName: fallbackName };
  return { categoryId: cat.id, categoryName: cat.name };
}
