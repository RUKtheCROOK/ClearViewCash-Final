// Web-side category tint table. Same hex values as @cvc/ui's CATEGORY_TINTS,
// duplicated here so we don't pull react-native-svg into the Next.js bundle.

export type CategoryKind =
  | "groceries"
  | "dining"
  | "transport"
  | "utilities"
  | "income"
  | "shopping"
  | "health"
  | "subs"
  | "transfer";

export type ThemeMode = "light" | "dark";

export interface CategoryTint {
  wash: string;
  pillBg: string;
  pillFg: string;
  edge: string;
  swatch: string;
}

export const CATEGORY_TINTS: Record<ThemeMode, Record<CategoryKind, CategoryTint>> = {
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

export function categoryTint(kind: CategoryKind, mode: ThemeMode = "light"): CategoryTint {
  return CATEGORY_TINTS[mode][kind];
}

export const CATEGORY_KINDS: CategoryKind[] = [
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
