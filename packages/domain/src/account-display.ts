export type AccountTypeGroup = "Cash" | "Credit" | "Loans" | "Investments" | "Other";

export const ACCOUNT_TYPE_GROUPS: AccountTypeGroup[] = [
  "Cash",
  "Credit",
  "Loans",
  "Investments",
  "Other",
];

export function accountTypeGroup(type: string | null | undefined): AccountTypeGroup {
  switch (type) {
    case "depository":
      return "Cash";
    case "credit":
      return "Credit";
    case "loan":
      return "Loans";
    case "investment":
      return "Investments";
    default:
      return "Other";
  }
}

export function accountTypeGroupOrder(group: AccountTypeGroup): number {
  return ACCOUNT_TYPE_GROUPS.indexOf(group);
}

export function accountDisplayName(a: { name: string; display_name?: string | null }): string {
  const dn = a.display_name?.trim();
  return dn && dn.length > 0 ? dn : a.name;
}

export type BalanceTone = "positive" | "negative" | "neutral";

/**
 * Map an account's balance to a red/green/neutral tone for display.
 *
 * - depository / investment: follow the sign (positive=green, negative=red).
 * - credit / loan: a positive balance means money owed, so render red. A
 *   negative balance (credit on file / overpayment) renders green.
 * - other / unknown / null balance: neutral.
 */
export function accountBalanceTone(a: {
  type: string;
  current_balance: number | null;
}): BalanceTone {
  const bal = a.current_balance;
  if (bal == null || bal === 0) return "neutral";
  const isDebt = a.type === "credit" || a.type === "loan";
  if (isDebt) return bal > 0 ? "negative" : "positive";
  if (a.type === "depository" || a.type === "investment") {
    return bal > 0 ? "positive" : "negative";
  }
  return "neutral";
}

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidHexColor(s: string | null | undefined): boolean {
  if (!s) return false;
  return HEX_RE.test(s.trim());
}

function expand3(hex: string): string {
  // "#abc" -> "#aabbcc"
  return "#" + hex.slice(1).split("").map((c) => c + c).join("");
}

/**
 * Returns a foreground text color ("#000000" or "#ffffff") with sufficient
 * contrast over the given hex background. When `hex` is null/invalid, returns
 * the default body text color so callers can drop it straight into a style.
 */
export function readableTextOn(hex: string | null | undefined): string {
  if (!isValidHexColor(hex ?? null)) return "#0F172A";
  let h = (hex as string).trim();
  if (h.length === 4) h = expand3(h);
  const r = parseInt(h.slice(1, 3), 16) / 255;
  const g = parseInt(h.slice(3, 5), 16) / 255;
  const b = parseInt(h.slice(5, 7), 16) / 255;
  // Relative luminance per WCAG.
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const L = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return L > 0.5 ? "#000000" : "#ffffff";
}

/**
 * Group accounts by `accountTypeGroup` and return the groups in the canonical
 * order defined by `ACCOUNT_TYPE_GROUPS`. Empty groups are omitted.
 */
export function groupAccountsByType<T extends { type: string }>(
  accounts: T[],
): Array<{ group: AccountTypeGroup; accounts: T[] }> {
  const buckets = new Map<AccountTypeGroup, T[]>();
  for (const a of accounts) {
    const g = accountTypeGroup(a.type);
    const list = buckets.get(g) ?? [];
    list.push(a);
    buckets.set(g, list);
  }
  return ACCOUNT_TYPE_GROUPS.filter((g) => buckets.has(g)).map((g) => ({
    group: g,
    accounts: buckets.get(g) ?? [],
  }));
}
