// Map app-facing transaction category strings to the design's 9 hue-tinted
// "kind" buckets. Categories the app surfaces today come from PLAID_PFC_TO_CVC
// (Income, Transfer, Food & Dining, Shopping, Bills & Utilities, …) plus
// ad-hoc user-entered strings. We collapse them to:
//   groceries / dining / transport / utilities / income / shopping /
//   health / subs / transfer
// "transfer" is the visual fallback for anything we can't classify.

export type TxCategoryKind =
  | "groceries"
  | "dining"
  | "transport"
  | "utilities"
  | "income"
  | "shopping"
  | "health"
  | "subs"
  | "transfer";

export interface TxCategoryDescriptor {
  kind: TxCategoryKind;
  label: string;
  hue: number;
}

const KIND_HUE: Record<TxCategoryKind, number> = {
  groceries: 145,
  dining: 30,
  transport: 240,
  utilities: 75,
  income: 195,
  shopping: 285,
  health: 5,
  subs: 320,
  transfer: 220,
};

const KIND_LABEL: Record<TxCategoryKind, string> = {
  groceries: "Groceries",
  dining: "Dining",
  transport: "Transport",
  utilities: "Utilities",
  income: "Income",
  shopping: "Shopping",
  health: "Health",
  subs: "Subscriptions",
  transfer: "Transfer",
};

// Lowercase substring → kind. Order matters (more-specific first).
const SUBSTR_RULES: Array<[string, TxCategoryKind]> = [
  ["groceries", "groceries"],
  ["grocery", "groceries"],
  ["supermarket", "groceries"],

  ["food", "dining"],
  ["dining", "dining"],
  ["restaurant", "dining"],
  ["coffee", "dining"],
  ["cafe", "dining"],
  ["bar", "dining"],

  ["subscription", "subs"],
  ["subscriptions", "subs"],
  ["streaming", "subs"],
  ["membership", "subs"],

  ["transport", "transport"],
  ["transit", "transport"],
  ["uber", "transport"],
  ["lyft", "transport"],
  ["gas", "transport"],
  ["fuel", "transport"],
  ["parking", "transport"],

  ["utilit", "utilities"],
  ["bills", "utilities"],
  ["electric", "utilities"],
  ["water", "utilities"],
  ["internet", "utilities"],
  ["phone", "utilities"],

  ["income", "income"],
  ["payroll", "income"],
  ["paycheck", "income"],
  ["salary", "income"],
  ["deposit", "income"],

  ["shopping", "shopping"],
  ["merchandise", "shopping"],
  ["retail", "shopping"],
  ["clothing", "shopping"],

  ["health", "health"],
  ["medical", "health"],
  ["pharmacy", "health"],
  ["doctor", "health"],
  ["dental", "health"],

  ["transfer", "transfer"],
  ["debt", "transfer"],
  ["fee", "transfer"],
];

/**
 * Resolve a kind for an arbitrary category string + amount sign.
 * Positive amounts default to "income" when no other rule matches.
 */
export function resolveTxCategory(
  category: string | null | undefined,
  amountCents?: number,
): TxCategoryDescriptor {
  const str = (category ?? "").toLowerCase().trim();

  if (str.length > 0) {
    for (const [needle, kind] of SUBSTR_RULES) {
      if (str.includes(needle)) {
        return { kind, label: prettyLabel(category) ?? KIND_LABEL[kind], hue: KIND_HUE[kind] };
      }
    }
  }

  if (typeof amountCents === "number" && amountCents > 0) {
    return { kind: "income", label: prettyLabel(category) ?? "Income", hue: KIND_HUE.income };
  }

  return {
    kind: "transfer",
    label: prettyLabel(category) ?? "Other",
    hue: KIND_HUE.transfer,
  };
}

export function categoryKindLabel(kind: TxCategoryKind): string {
  return KIND_LABEL[kind];
}

export function categoryKindHue(kind: TxCategoryKind): number {
  return KIND_HUE[kind];
}

function prettyLabel(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  if (!t) return null;
  return t;
}

export const TX_CATEGORY_KINDS: TxCategoryKind[] = [
  "groceries",
  "dining",
  "transport",
  "utilities",
  "income",
  "shopping",
  "health",
  "subs",
  "transfer",
];
