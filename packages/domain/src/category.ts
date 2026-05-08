// User-managed categories (the new system).
//
// Replaces the legacy freeform-text + 9-hardcoded-kind setup. Every consumer
// (transactions, splits, budgets, bills, income) now references a row in
// `public.categories` via `category_id`. This module owns:
//
//   * shared types: Category, CategoryKind, CategoryIconKey
//   * the curated icon and color presets surfaced in the picker
//   * resolvers: categoryFor / categoryForRender for id → row lookup
//   * tintForColor: hex → {bg, fg, swatch} chip tints (snaps to the curated
//     hue palette so any user-picked color renders consistently)
//   * legacyKindForCategory: adapter for code paths still consuming the old
//     TxCategoryKind enum during the migration
//
// The legacy modules (transaction-category.ts, bill-categories.ts) stay in
// place during the transition but should be considered deprecated.

import type { TxCategoryKind } from "./transaction-category";

// ─── Kind ─────────────────────────────────────────────────────────────────

export const CATEGORY_KIND_VALUES = ["expense", "income", "transfer"] as const;
export type CategoryKind = (typeof CATEGORY_KIND_VALUES)[number];

export function isCategoryKind(v: string | null | undefined): v is CategoryKind {
  return !!v && (CATEGORY_KIND_VALUES as readonly string[]).includes(v);
}

// ─── Icons ────────────────────────────────────────────────────────────────

/**
 * Curated icon keys the category picker offers. Every key here is provided
 * by both `apps/web/lib/icons.tsx` (web) and `@cvc/ui`'s `I` map (mobile),
 * so the picker renders identically across platforms.
 */
export const CATEGORY_ICON_KEYS = [
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
  "fork",
  "shirt",
  "paw",
  "book",
  "heart",
  "car",
  "doc",
  "income",
  "transfer",
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_KEYS)[number];

export function isCategoryIconKey(v: string | null | undefined): v is CategoryIconKey {
  return !!v && (CATEGORY_ICON_KEYS as readonly string[]).includes(v);
}

// ─── Category record ──────────────────────────────────────────────────────

export interface Category {
  id: string;
  space_id: string;
  name: string;
  icon: CategoryIconKey;
  color: string;
  kind: CategoryKind;
  sort_order: number;
  archived_at: string | null;
  is_system: boolean;
  seed_key: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Sentinel id for grouping `category_id IS NULL` rows in client-side rollups
 * (e.g. computeSpentByCategoryId, spendingByCategoryId). Never persisted.
 */
export const UNCATEGORIZED_BUCKET_ID = "__uncategorized__";

/**
 * A render-only stand-in for transactions whose `category_id` is null or
 * resolves to a row outside the active view's category map. Has no `id`,
 * so callers cannot accidentally persist it as a real category.
 */
export interface UncategorizedDescriptor {
  name: string;
  icon: CategoryIconKey;
  color: string;
  kind: CategoryKind;
}

export const UNCATEGORIZED_DESCRIPTOR: UncategorizedDescriptor = {
  name: "Uncategorized",
  icon: "doc",
  color: "#7b79ae",
  kind: "expense",
};

/**
 * Resolve a category by id. Returns null when the id is null/missing.
 * Use `categoryForRender` if you want the Uncategorized fallback in render
 * paths.
 */
export function categoryFor(
  id: string | null | undefined,
  byId: ReadonlyMap<string, Category>,
): Category | null {
  if (!id) return null;
  return byId.get(id) ?? null;
}

/**
 * Like `categoryFor` but always returns something renderable. Falls back to
 * `UNCATEGORIZED_DESCRIPTOR` when the id is null or not in the map.
 */
export function categoryForRender(
  id: string | null | undefined,
  byId: ReadonlyMap<string, Category>,
): Category | UncategorizedDescriptor {
  return categoryFor(id, byId) ?? UNCATEGORIZED_DESCRIPTOR;
}

/**
 * Build a quick lookup map from a list of categories.
 */
export function indexCategories(categories: ReadonlyArray<Category>): {
  byId: Map<string, Category>;
  bySeedKey: Map<string, Category>;
} {
  const byId = new Map<string, Category>();
  const bySeedKey = new Map<string, Category>();
  for (const c of categories) {
    byId.set(c.id, c);
    if (c.seed_key) bySeedKey.set(c.seed_key, c);
  }
  return { byId, bySeedKey };
}

// ─── Seed pack (mirrors the SQL seed_categories_for_space migration) ──────

export interface CategorySeed {
  name: string;
  icon: CategoryIconKey;
  color: string;
  kind: CategoryKind;
  sort_order: number;
  is_system: boolean;
  seed_key: string | null;
}

export const CATEGORY_SEED_PACK: ReadonlyArray<CategorySeed> = [
  { name: "Income",             icon: "income",   color: "#3c8f8f", kind: "income",   sort_order: 10,  is_system: true, seed_key: "INCOME" },
  { name: "Transfer",           icon: "transfer", color: "#428ba1", kind: "transfer", sort_order: 20,  is_system: true, seed_key: "TRANSFER" },
  { name: "Groceries",          icon: "cart",     color: "#618d62", kind: "expense",  sort_order: 30,  is_system: true, seed_key: null },
  { name: "Food & Dining",      icon: "fork",     color: "#ab6e64", kind: "expense",  sort_order: 40,  is_system: true, seed_key: "FOOD_AND_DRINK" },
  { name: "Transportation",     icon: "car",      color: "#5187ab", kind: "expense",  sort_order: 50,  is_system: true, seed_key: "TRANSPORTATION" },
  { name: "Bills & Utilities",  icon: "bolt",     color: "#574c1f", kind: "expense",  sort_order: 60,  is_system: true, seed_key: "RENT_AND_UTILITIES" },
  { name: "Shopping",           icon: "shirt",    color: "#7b79ae", kind: "expense",  sort_order: 70,  is_system: true, seed_key: "GENERAL_MERCHANDISE" },
  { name: "Health",             icon: "heart",    color: "#6f3a3d", kind: "expense",  sort_order: 80,  is_system: true, seed_key: "MEDICAL" },
  { name: "Subscriptions",      icon: "spark",    color: "#96719e", kind: "expense",  sort_order: 90,  is_system: true, seed_key: null },
  { name: "Entertainment",      icon: "film",     color: "#4a3868", kind: "expense",  sort_order: 100, is_system: true, seed_key: "ENTERTAINMENT" },
  { name: "Travel",             icon: "plane",    color: "#428ba1", kind: "expense",  sort_order: 110, is_system: true, seed_key: "TRAVEL" },
  { name: "Home",               icon: "home",     color: "#5a432a", kind: "expense",  sort_order: 120, is_system: true, seed_key: "HOME_IMPROVEMENT" },
  { name: "Personal Care",      icon: "spark",    color: "#612e44", kind: "expense",  sort_order: 130, is_system: true, seed_key: "PERSONAL_CARE" },
  { name: "Services",           icon: "doc",      color: "#3c4767", kind: "expense",  sort_order: 140, is_system: true, seed_key: "GENERAL_SERVICES" },
  { name: "Debt Payments",      icon: "card",     color: "#a96c7a", kind: "expense",  sort_order: 150, is_system: true, seed_key: "LOAN_PAYMENTS" },
  { name: "Fees",               icon: "doc",      color: "#6f3a3d", kind: "expense",  sort_order: 160, is_system: true, seed_key: "BANK_FEES" },
  { name: "Taxes & Government", icon: "doc",      color: "#3a4566", kind: "expense",  sort_order: 170, is_system: true, seed_key: "GOVERNMENT_AND_NON_PROFIT" },
];

/**
 * Curated color palette for the picker swatch grid. These are the disc fills
 * used by the seed pack; every value snaps cleanly to a tint table entry.
 */
export const CATEGORY_COLOR_PRESETS: readonly string[] = [
  "#3c8f8f",
  "#428ba1",
  "#618d62",
  "#ab6e64",
  "#5187ab",
  "#574c1f",
  "#7b79ae",
  "#6f3a3d",
  "#96719e",
  "#4a3868",
  "#5a432a",
  "#612e44",
  "#3c4767",
  "#a96c7a",
  "#3a4566",
];

// ─── Tint helpers ─────────────────────────────────────────────────────────
//
// The light/dark hue tables below are ported from the legacy
// apps/mobile/components/budgets/categoryHueColors.ts. Keeping them here
// (instead of in @cvc/ui or app code) means domain rollups can produce a
// renderable tint without importing the UI package.

export type CategoryTintMode = "light" | "dark";

export interface CategoryTint {
  bg: string;
  fg: string;
  swatch: string;
}

const LIGHT_BG: Record<number, string> = {
  0: "#f5dcd9",
  30: "#f3e5d4",
  75: "#ecead0",
  80: "#ebebd2",
  145: "#d3ecda",
  195: "#d2ecec",
  220: "#dde0ef",
  240: "#dee0ef",
  270: "#e7dff3",
  305: "#efddee",
  320: "#f1dce7",
};

const LIGHT_FG: Record<number, string> = {
  0: "#6f3a3d",
  30: "#5a432a",
  75: "#574c1f",
  80: "#52511f",
  145: "#27563b",
  195: "#1f4f50",
  220: "#3c4767",
  240: "#3a4566",
  270: "#4a3868",
  305: "#5a3358",
  320: "#612e44",
};

const DARK_BG: Record<number, string> = {
  0: "#382021",
  30: "#322618",
  75: "#2f2a14",
  80: "#2e2a14",
  145: "#152b1e",
  195: "#152b2c",
  220: "#1c2336",
  240: "#1d2336",
  270: "#251a37",
  305: "#321939",
  320: "#371927",
};

const DARK_FG: Record<number, string> = {
  0: "#dab9b9",
  30: "#d3c19f",
  75: "#ccc191",
  80: "#c8c592",
  145: "#9bcfae",
  195: "#9ed1d2",
  220: "#aebcd9",
  240: "#abbad7",
  270: "#bdaadb",
  305: "#d2a5d5",
  320: "#dca4bc",
};

const FALLBACK = {
  light: { bg: "#e3e6ea", fg: "#37424c" },
  dark: { bg: "#1d242a", fg: "#aab5c0" },
};

function nearestHue(target: number, table: Record<number, string>): number {
  const keys = Object.keys(table).map(Number);
  let best = keys[0] ?? 220;
  let bestDist = 360;
  for (const k of keys) {
    const d = Math.min(Math.abs(k - target), 360 - Math.abs(k - target));
    if (d < bestDist) {
      bestDist = d;
      best = k;
    }
  }
  return best;
}

const HEX3_RE = /^#([0-9a-f]{3})$/i;
const HEX6_RE = /^#([0-9a-f]{6})$/i;

function expandHex(hex: string): string {
  const trimmed = hex.trim();
  const m = trimmed.match(HEX3_RE);
  if (!m) return trimmed;
  const c = m[1] as string;
  return "#" + c[0]! + c[0]! + c[1]! + c[1]! + c[2]! + c[2]!;
}

/**
 * Compute hue (0..359) from a hex color via the standard RGB→HSL conversion.
 * Returns 0 for grayscale colors (no chroma).
 */
export function hueFromHex(hex: string | null | undefined): number {
  if (!hex) return 0;
  const norm = expandHex(hex);
  if (!HEX6_RE.test(norm)) return 0;
  const r = parseInt(norm.slice(1, 3), 16) / 255;
  const g = parseInt(norm.slice(3, 5), 16) / 255;
  const b = parseInt(norm.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  return ((h % 360) + 360) % 360;
}

/**
 * Resolve disc tints (chip background, foreground, swatch) for any stored hex
 * color. The hex's hue is computed and snapped to the closest curated tint
 * table entry, so user-picked colors render with the same aesthetic as the
 * seed pack without a free-form OKLCH conversion at render time.
 */
export function tintForColor(hex: string, mode: CategoryTintMode): CategoryTint {
  const hue = hueFromHex(hex);
  const bgTable = mode === "dark" ? DARK_BG : LIGHT_BG;
  const fgTable = mode === "dark" ? DARK_FG : LIGHT_FG;
  const fb = FALLBACK[mode];
  const h = nearestHue(hue, bgTable);
  return {
    bg: bgTable[h] ?? fb.bg,
    fg: fgTable[h] ?? fb.fg,
    swatch: hex,
  };
}

// ─── Legacy adapter ───────────────────────────────────────────────────────

/**
 * Map a Category back to one of the 9 legacy `TxCategoryKind` values. Used by
 * the few code paths that haven't been migrated to consume `Category` directly
 * (CategoryChip in @cvc/ui, some rollup helpers). Inferred from kind first,
 * then icon.
 */
export function legacyKindForCategory(
  c: Pick<Category, "icon" | "kind"> | UncategorizedDescriptor | null | undefined,
): TxCategoryKind {
  if (!c) return "transfer";
  if (c.kind === "income") return "income";
  if (c.kind === "transfer") return "transfer";
  switch (c.icon) {
    case "cart":
      return "groceries";
    case "fork":
    case "coffee":
      return "dining";
    case "car":
      return "transport";
    case "bolt":
      return "utilities";
    case "shirt":
      return "shopping";
    case "heart":
      return "health";
    case "spark":
      return "subs";
    default:
      return "transfer";
  }
}
