// Mirror of packages/domain/src/categorize.ts. Keep in sync.
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
