// ClearView Cash design tokens — sRGB hex equivalents of the OKLch values
// from the design's tokens.css. See scripts/oklch-to-hex.mjs for the
// conversion math. The // oklch(...) comments preserve the source values.

export type ThemeMode = "light" | "dark";

export interface Palette {
  // Surfaces
  canvas: string;
  surface: string;
  sunken: string;
  tinted: string;
  // Lines
  line: string;
  lineFirm: string;
  // Ink
  ink1: string;
  ink2: string;
  ink3: string;
  ink4: string;
  // Brand
  brand: string;
  brandHover: string;
  brandTint: string;
  brandOn: string;
  // Accent
  accent: string;
  accentTint: string;
  // Semantic
  pos: string;
  posTint: string;
  neg: string;
  negTint: string;
  warn: string;
  warnTint: string;
  warnLine: string;
  over: string;
  overTint: string;
  info: string;
  infoTint: string;
  // Projected (forecast — intentionally neutral, not green)
  projected: string;
  projectedTint: string;
  // Skeleton
  skeleton: string;
  skeletonHi: string;
  // Profile (avatar circle tinted for the Settings hub identity row)
  profileTint: string;
  profileInk: string;
}

export const lightPalette: Palette = {
  canvas: "#fbfaf6",       // oklch(98.5% 0.005 90)
  surface: "#ffffff",      // oklch(100% 0 0)
  sunken: "#f3f2ed",       // oklch(96% 0.006 90)
  tinted: "#edebe5",       // oklch(94% 0.008 90)
  line: "#e6e4e0",         // oklch(92% 0.006 90)
  lineFirm: "#d3d1cb",     // oklch(86% 0.008 90)
  ink1: "#0e181b",         // oklch(20% 0.015 220)
  ink2: "#464f52",         // oklch(42% 0.012 220)
  ink3: "#747c7e",         // oklch(58% 0.010 220)
  ink4: "#9fa6a8",         // oklch(72% 0.008 220)
  brand: "#1c4544",        // oklch(36% 0.045 195)
  brandHover: "#0d3737",   // oklch(31% 0.045 195)
  brandTint: "#e0f3f3",    // oklch(95% 0.020 195)
  brandOn: "#faf8f5",      // oklch(98% 0.005 90)
  accent: "#d49838",       // oklch(72% 0.130 75)
  accentTint: "#fbecd9",   // oklch(95% 0.030 75)
  pos: "#2c6c47",          // oklch(48% 0.090 155)
  posTint: "#e0f5e6",      // oklch(95% 0.030 155)
  neg: "#a03f3c",          // oklch(50% 0.130 25)
  negTint: "#ffe7e4",      // oklch(95% 0.030 25)
  warn: "#be7100",         // oklch(62% 0.140 65)
  warnTint: "#fdebda",     // oklch(95% 0.030 65)
  warnLine: "#ebd3bd",     // oklch(88% 0.040 65)
  over: "#b95628",         // oklch(54% 0.110 35)
  overTint: "#ffe9dd",     // oklch(95% 0.025 35)
  info: "#2b6991",         // oklch(50% 0.090 240)
  infoTint: "#e0f1fe",     // oklch(95% 0.025 240)
  projected: "#747c7e",    // oklch(58% 0.010 220)
  projectedTint: "#e7ecee",// oklch(94% 0.006 220)
  skeleton: "#edebe7",     // oklch(94% 0.006 90)
  skeletonHi: "#f3f2ed",   // oklch(96% 0.006 90)
  profileTint: "#f3c0b7",  // oklch(85% 0.060 30)
  profileInk: "#47211b",   // oklch(30% 0.060 30)
};

export const darkPalette: Palette = {
  canvas: "#090e12",       // oklch(16% 0.012 240)
  surface: "#10171c",      // oklch(20% 0.014 240)
  sunken: "#050a0e",       // oklch(14% 0.012 240)
  tinted: "#182026",       // oklch(24% 0.016 240)
  line: "#1e252a",         // oklch(26% 0.014 240)
  lineFirm: "#2c343a",     // oklch(32% 0.016 240)
  ink1: "#eff2f5",         // oklch(96% 0.005 240)
  ink2: "#a8afb4",         // oklch(75% 0.010 240)
  ink3: "#7a8187",         // oklch(60% 0.012 240)
  ink4: "#52595e",         // oklch(46% 0.012 240)
  brand: "#68b4b3",        // oklch(72% 0.075 195)
  brandHover: "#7bc7c6",   // oklch(78% 0.075 195)
  brandTint: "#0b2f2f",    // oklch(28% 0.040 195)
  brandOn: "#0d1216",      // oklch(18% 0.012 240)
  accent: "#e4ac59",       // oklch(78% 0.120 75)
  accentTint: "#3c2a0e",   // oklch(30% 0.050 75)
  pos: "#68b986",          // oklch(72% 0.110 155)
  posTint: "#152f1f",      // oklch(28% 0.045 155)
  neg: "#e97871",          // oklch(70% 0.140 25)
  negTint: "#442321",      // oklch(30% 0.050 25)
  warn: "#f0a556",         // oklch(78% 0.130 65)
  warnTint: "#3f2810",     // oklch(30% 0.050 65)
  warnLine: "#653d10",     // oklch(40% 0.080 65)
  over: "#e89469",         // oklch(72% 0.110 35)
  overTint: "#3a2014",     // oklch(30% 0.050 35)
  info: "#6eacd7",         // oklch(72% 0.090 240)
  infoTint: "#152b3b",     // oklch(28% 0.040 240)
  projected: "#7a8187",    // oklch(60% 0.012 240)
  projectedTint: "#1a2024",// oklch(24% 0.012 240)
  skeleton: "#1a2024",     // oklch(24% 0.012 240)
  skeletonHi: "#242a2e",   // oklch(28% 0.012 240)
  profileTint: "#4d2620",  // oklch(32% 0.060 30)
  profileInk: "#f3c0b7",   // oklch(85% 0.060 30)
};

export function paletteFor(mode: ThemeMode): Palette {
  return mode === "dark" ? darkPalette : lightPalette;
}

// ─── Space tinting ────────────────────────────────────────────────────────

export interface SpaceTint {
  wash: string;
  pillBg: string;
  pillFg: string;
  edge: string;
  swatch: string;
}

export const SPACE_HUES = {
  personal: 195,
  household: 30,
  business: 270,
  family: 145,
  travel: 220,
} as const;

export type SpaceKey = keyof typeof SPACE_HUES;

// Pre-computed for the 5 known space hues. For arbitrary hues, use
// `spaceTintFromHue` (slower; runs the OKLch→sRGB math at runtime).
export const SPACE_TINTS: Record<ThemeMode, Record<SpaceKey, SpaceTint>> = {
  light: {
    personal:  { wash: "#e3f6f6", pillBg: "#cbecec", pillFg: "#004444", edge: "#9dc7c7", swatch: "#3c8f8f" },
    household: { wash: "#ffedea", pillBg: "#fbddd7", pillFg: "#562e27", edge: "#d9b4ad", swatch: "#ab6e64" },
    business:  { wash: "#ecf2ff", pillBg: "#dbe4fd", pillFg: "#2e395a", edge: "#b2bddc", swatch: "#6d7eb1" },
    family:    { wash: "#eaf6ea", pillBg: "#d7ebd7", pillFg: "#254326", edge: "#acc6ac", swatch: "#618d62" },
    travel:    { wash: "#e4f5fb", pillBg: "#ccebf5", pillFg: "#084150", edge: "#9ec5d2", swatch: "#428ba1" },
  },
  dark: {
    personal:  { wash: "#0c2424", pillBg: "#023536", pillFg: "#8ddfde", edge: "#155252", swatch: "#3c8f8f" },
    household: { wash: "#2c1a17", pillBg: "#44241f", pillFg: "#febbaf", edge: "#643b34", swatch: "#ab6e64" },
    business:  { wash: "#1a1f2e", pillBg: "#242c47", pillFg: "#b9ccff", edge: "#3b4668", swatch: "#6d7eb1" },
    family:    { wash: "#162316", pillBg: "#1d341e", pillFg: "#aedcae", edge: "#325033", swatch: "#618d62" },
    travel:    { wash: "#0d2329", pillBg: "#07333f", pillFg: "#91dbf2", edge: "#1a4f5e", swatch: "#428ba1" },
  },
};

export function spaceTint(key: SpaceKey, mode: ThemeMode = "light"): SpaceTint {
  return SPACE_TINTS[mode][key];
}

// Map hex tint value (the legacy `space.tint` schema field) to our keyed
// space hues. Anything unknown falls back to "personal". Centralized so
// header/dashboard code never has to hard-code ad-hoc mappings.
const HEX_TO_SPACE_KEY: Record<string, SpaceKey> = {
  "#0EA5E9": "personal",  // legacy primary
  "#0ea5e9": "personal",
  "#1c4544": "personal",
  "#d97706": "household",
  "#7c3aed": "business",
  "#16a34a": "family",
  "#0284c7": "travel",
};

export function spaceKeyFromTint(tint: string | null | undefined): SpaceKey {
  if (!tint) return "personal";
  return HEX_TO_SPACE_KEY[tint.toLowerCase()] ?? HEX_TO_SPACE_KEY[tint] ?? "personal";
}

// ─── Category tinting ─────────────────────────────────────────────────────
// 9 hue families used by the Activity / Recent-activity row icons. Same shape
// as SpaceTint but precomputed for the design's category hues.

export const CATEGORY_HUES = {
  groceries: 145,
  dining: 30,
  transport: 240,
  utilities: 75,
  income: 195,
  shopping: 285,
  health: 5,
  subs: 320,
  transfer: 220,
} as const;

export type CategoryKind = keyof typeof CATEGORY_HUES;

export const CATEGORY_TINTS: Record<ThemeMode, Record<CategoryKind, SpaceTint>> = {
  light: {
    groceries: { wash: "#eaf6ea", pillBg: "#d7ebd7", pillFg: "#254326", edge: "#acc6ac", swatch: "#618d62" },
    dining:    { wash: "#ffedea", pillBg: "#fbddd7", pillFg: "#562e27", edge: "#d9b4ad", swatch: "#ab6e64" },
    transport: { wash: "#e6f4fe", pillBg: "#d1e8fa", pillFg: "#193e57", edge: "#a4c2d8", swatch: "#5187ab" },
    utilities: { wash: "#faf0e3", pillBg: "#f3e2cb", pillFg: "#4d3612", edge: "#cfba9e", swatch: "#9c7947" },
    income:    { wash: "#e3f6f6", pillBg: "#cbecec", pillFg: "#004444", edge: "#9dc7c7", swatch: "#3c8f8f" },
    shopping:  { wash: "#f0f0ff", pillBg: "#e1e2fc", pillFg: "#373659", edge: "#babada", swatch: "#7b79ae" },
    health:    { wash: "#ffedf0", pillBg: "#fadbe1", pillFg: "#542c36", edge: "#d8b2ba", swatch: "#a96c7a" },
    subs:      { wash: "#f8eefa", pillBg: "#efdef3", pillFg: "#48304e", edge: "#cbb5d0", swatch: "#96719e" },
    transfer:  { wash: "#e4f5fb", pillBg: "#ccebf5", pillFg: "#084150", edge: "#9ec5d2", swatch: "#428ba1" },
  },
  dark: {
    groceries: { wash: "#162316", pillBg: "#1d341e", pillFg: "#aedcae", edge: "#325033", swatch: "#618d62" },
    dining:    { wash: "#2c1a17", pillBg: "#44241f", pillFg: "#febbaf", edge: "#643b34", swatch: "#ab6e64" },
    transport: { wash: "#11212c", pillBg: "#133144", pillFg: "#9ed5fd", edge: "#274c65", swatch: "#5187ab" },
    utilities: { wash: "#281d0e", pillBg: "#3c2a0e", pillFg: "#edc793", edge: "#5b4320", swatch: "#9c7947" },
    income:    { wash: "#0c2424", pillBg: "#023536", pillFg: "#8ddfde", edge: "#155252", swatch: "#3c8f8f" },
    shopping:  { wash: "#1e1d2d", pillBg: "#2b2a46", pillFg: "#c8c7ff", edge: "#444367", swatch: "#7b79ae" },
    health:    { wash: "#2b191d", pillBg: "#43232a", pillFg: "#fcb8c7", edge: "#633a43", swatch: "#a96c7a" },
    subs:      { wash: "#261b28", pillBg: "#39253d", pillFg: "#e6bdef", edge: "#563d5c", swatch: "#96719e" },
    transfer:  { wash: "#0d2329", pillBg: "#07333f", pillFg: "#91dbf2", edge: "#1a4f5e", swatch: "#428ba1" },
  },
};

export function categoryTint(kind: CategoryKind, mode: ThemeMode = "light"): SpaceTint {
  return CATEGORY_TINTS[mode][kind];
}

// ─── Icon disc tint (settings, etc.) ─────────────────────────────────────
// Resolve a hue (0..360) to the wash + foreground used by 32px tinted icon
// discs in the Settings UI. Mirrors the OKLch math from the design source
// (Settings.jsx Row component): wash = 94% L 0.024 C / fg = 38% L 0.060 C
// in light mode; in dark mode, wash darkens and fg lifts for contrast.

export interface IconDiscTint {
  wash: string;
  fg: string;
}

export function iconDiscTint(hue: number, mode: ThemeMode = "light"): IconDiscTint {
  if (mode === "dark") {
    return {
      wash: `oklch(28% 0.045 ${hue})`,
      fg: `oklch(82% 0.090 ${hue})`,
    };
  }
  return {
    wash: `oklch(94% 0.024 ${hue})`,
    fg: `oklch(38% 0.060 ${hue})`,
  };
}

// ─── Spacing (4pt grid) ───────────────────────────────────────────────────

export const space = {
  // New scale (s-1..s-9 from tokens.css)
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 20,
  s6: 24,
  s7: 32,
  s8: 40,
  s9: 56,
  // Legacy aliases (kept so existing screens compile)
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// ─── Radius ───────────────────────────────────────────────────────────────

export const radius = {
  // New scale (r-1..r-pill)
  r1: 4,
  r2: 8,
  r3: 12,
  r4: 16,
  r5: 20,
  r6: 28,
  pill: 999,
  // Legacy aliases
  sm: 6,
  md: 10,
  lg: 16,
} as const;

// ─── Type scale ───────────────────────────────────────────────────────────

export const fontSize = {
  // New scale
  cap: 11,
  micro: 12,
  small: 13,
  body: 15,
  lead: 17,
  h3: 20,
  h2: 28,
  h1: 34,
  display: 44,
  // Legacy aliases
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 30,
} as const;

// ─── Fonts ────────────────────────────────────────────────────────────────
// Web uses next/font (resolved via CSS variables in globals.css), so these
// constants are React-Native facing only. They default to system fonts;
// when @expo-google-fonts/geist + @expo-google-fonts/jetbrains-mono are
// installed and loaded via useFonts(), swap these to the Geist_* keys.

export const fonts = {
  ui: undefined as string | undefined,           // → "Geist_400Regular"
  uiMedium: undefined as string | undefined,     // → "Geist_500Medium"
  uiSemibold: undefined as string | undefined,   // → "Geist_600SemiBold"
  num: "Menlo",                                  // → "JetBrainsMono_400Regular"
  numMedium: "Menlo",                            // → "JetBrainsMono_500Medium"
} as const;

// ─── Legacy `colors` export ──────────────────────────────────────────────
// Existing screens reference `colors.bg`, `colors.primary`, etc. We keep this
// export pointing at the light palette so they keep rendering while we
// redesign each page. Once a page has been migrated to `useTheme()` it should
// stop importing `colors`.

export const colors = {
  bg: lightPalette.canvas,
  surface: lightPalette.surface,
  border: lightPalette.line,
  text: lightPalette.ink1,
  textMuted: lightPalette.ink3,
  primary: lightPalette.brand,
  positive: lightPalette.pos,
  negative: lightPalette.neg,
  warning: lightPalette.warn,
} as const;
