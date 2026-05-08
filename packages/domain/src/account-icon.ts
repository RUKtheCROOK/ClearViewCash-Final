import type { AccountKind } from "./account-kind";

/**
 * Curated icon keys the user can pick from in account settings.
 * Every key here exists in both `@cvc/ui`'s `I` map (mobile) and
 * `apps/web/lib/icons.tsx` (web) so the picker renders identically.
 */
export const ACCOUNT_ICON_KEYS = [
  "bank",
  "vault",
  "card",
  "spark",
  "gem",
  "star",
  "brief",
  "coffee",
  "plane",
  "home",
  "fam",
  "film",
  "cart",
  "bolt",
  "summary",
  "receipt",
  "bill",
] as const;

export type AccountIconKey = (typeof ACCOUNT_ICON_KEYS)[number];

export function isAccountIconKey(value: string | null | undefined): value is AccountIconKey {
  if (!value) return false;
  return (ACCOUNT_ICON_KEYS as readonly string[]).includes(value);
}

/**
 * Default icon key derived from account type/subtype. Used when an account has
 * no `icon` override saved.
 */
export function defaultAccountIcon(kind: AccountKind): AccountIconKey {
  switch (kind) {
    case "credit":
    case "loan":
      return "card";
    case "savings":
      return "vault";
    case "invest":
      return "spark";
    default:
      return "bank";
  }
}

/**
 * Resolve the icon key to render for an account, preferring a saved override
 * and falling back to the kind-derived default.
 */
export function resolveAccountIcon(input: {
  icon?: string | null;
  type: string | null | undefined;
  subtype?: string | null;
}, kindResolver: (a: { type: string | null | undefined; subtype?: string | null }) => AccountKind): AccountIconKey {
  if (isAccountIconKey(input.icon ?? null)) return input.icon as AccountIconKey;
  return defaultAccountIcon(kindResolver({ type: input.type, subtype: input.subtype ?? null }));
}
