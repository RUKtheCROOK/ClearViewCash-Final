// Shared type used by the Activity screen + its child components. Mirrors
// the row shape returned by `getTransactionsForView` plus the fields the
// row renderer needs.

export interface ActivityTxn {
  id: string;
  merchant_name: string | null;
  display_name: string | null;
  amount: number;
  posted_at: string;
  category: string | null;
  category_id?: string | null;
  pending: boolean;
  is_recurring: boolean;
  account_id: string;
  owner_user_id: string;
  note: string | null;
}

export type Status = "all" | "pending" | "completed";

export type DateRangeKey = "7d" | "30d" | "month" | "all";

export interface AmountRange {
  min: number | null; // dollars
  max: number | null;
}

export interface AccountOpt {
  id: string;
  name: string;
}

export interface MemberOpt {
  user_id: string;
  display_name: string | null;
  invited_email: string | null;
}
