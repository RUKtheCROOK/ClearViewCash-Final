/**
 * Bill payee branding. The redesigned Bills UI renders each row with an
 * icon disc colored by hue. Most bills don't have an explicit hue/glyph
 * stored — we infer one from the bill name + category so the list looks
 * curated even before the user customises anything.
 *
 * Hue values are 0..359 (HSL/OKLCH-compatible). Glyph keys are stable
 * strings the UI maps to SVG components.
 */

export type BillGlyphKey =
  | "bolt"
  | "home"
  | "wifi"
  | "drop"
  | "fire"
  | "car"
  | "shield"
  | "play"
  | "music"
  | "edu"
  | "phone"
  | "gym"
  | "doc"
  | "card";

export interface BillBranding {
  hue: number;
  glyph: BillGlyphKey;
}

const CATEGORY_BRANDING: Record<string, BillBranding> = {
  "Bills & Utilities": { hue: 75, glyph: "bolt" },
  Home: { hue: 30, glyph: "home" },
  Entertainment: { hue: 0, glyph: "play" },
  "Food & Dining": { hue: 25, glyph: "doc" },
  Transportation: { hue: 5, glyph: "car" },
  Travel: { hue: 220, glyph: "doc" },
  Health: { hue: 195, glyph: "shield" },
  "Personal Care": { hue: 320, glyph: "doc" },
  Services: { hue: 240, glyph: "doc" },
  Shopping: { hue: 285, glyph: "doc" },
  Fees: { hue: 5, glyph: "doc" },
  "Debt Payments": { hue: 5, glyph: "card" },
  "Taxes & Government": { hue: 220, glyph: "doc" },
  Income: { hue: 155, glyph: "doc" },
  Transfer: { hue: 195, glyph: "doc" },
  Uncategorized: { hue: 220, glyph: "doc" },
};

const NAME_HINTS: Array<{ test: RegExp; brand: BillBranding }> = [
  { test: /comcast|xfinity|spectrum|cox\b|fiber|wifi|internet/i, brand: { hue: 240, glyph: "wifi" } },
  { test: /verizon|at&?t|t-?mobile|mint|cricket|wireless|cellular/i, brand: { hue: 285, glyph: "phone" } },
  { test: /pg&?e|electric|gas|utility|edison|duke energy|con ed/i, brand: { hue: 75, glyph: "bolt" } },
  { test: /water|sewer|h2o/i, brand: { hue: 195, glyph: "drop" } },
  { test: /spotify|apple music|tidal|pandora|sirius/i, brand: { hue: 155, glyph: "music" } },
  { test: /netflix|hulu|disney|hbo|max|paramount|peacock|prime video/i, brand: { hue: 0, glyph: "play" } },
  { test: /geico|allstate|state farm|progressive|insurance|farmers/i, brand: { hue: 5, glyph: "shield" } },
  { test: /equinox|gym|fitness|peloton|crossfit|yoga/i, brand: { hue: 155, glyph: "gym" } },
  { test: /coursera|udemy|skillshare|masterclass|chegg|tuition|school/i, brand: { hue: 220, glyph: "edu" } },
  { test: /rent|landlord|property|apartment|mortgage|hoa/i, brand: { hue: 30, glyph: "home" } },
  { test: /heat|propane|firewood/i, brand: { hue: 25, glyph: "fire" } },
  { test: /uber|lyft|car payment|auto loan|toyota|honda|tesla/i, brand: { hue: 5, glyph: "car" } },
  { test: /credit card|chase|amex|capital one|discover|citi/i, brand: { hue: 285, glyph: "card" } },
];

/**
 * Resolve a bill's branding. Stored fields win; otherwise we look at the
 * name (best signal for who the payee is) before falling back to category.
 */
export function resolveBillBranding(bill: {
  name: string;
  category: string | null;
  payee_hue: number | null;
  payee_glyph: string | null;
}): BillBranding {
  if (bill.payee_hue != null && bill.payee_glyph) {
    return { hue: bill.payee_hue, glyph: bill.payee_glyph as BillGlyphKey };
  }
  for (const hint of NAME_HINTS) {
    if (hint.test.test(bill.name)) return hint.brand;
  }
  if (bill.category) {
    const fromCat = CATEGORY_BRANDING[bill.category];
    if (fromCat) return fromCat;
  }
  return { hue: 220, glyph: "doc" };
}

export function brandingForCategory(category: string | null): BillBranding {
  if (!category) return { hue: 220, glyph: "doc" };
  return CATEGORY_BRANDING[category] ?? { hue: 220, glyph: "doc" };
}

/**
 * Popular payees shown in Add Bill step 1. Names are recognisable without
 * being trademark-loud; hue/glyph match the design exactly.
 */
export const POPULAR_PAYEES: Array<{
  name: string;
  category: string;
  branding: BillBranding;
}> = [
  { name: "Comcast Xfinity", category: "Bills & Utilities", branding: { hue: 240, glyph: "wifi" } },
  { name: "PG&E", category: "Bills & Utilities", branding: { hue: 75, glyph: "bolt" } },
  { name: "Verizon", category: "Bills & Utilities", branding: { hue: 285, glyph: "phone" } },
  { name: "Geico", category: "Services", branding: { hue: 5, glyph: "car" } },
  { name: "Spotify", category: "Entertainment", branding: { hue: 155, glyph: "music" } },
  { name: "Netflix", category: "Entertainment", branding: { hue: 0, glyph: "play" } },
  { name: "Equinox", category: "Personal Care", branding: { hue: 155, glyph: "gym" } },
  { name: "Rent", category: "Home", branding: { hue: 30, glyph: "home" } },
];
