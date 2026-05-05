// Stroke-based category glyphs (mobile via react-native-svg). One per
// design "kind" — used by CategoryChip in transaction rows, the detail
// sheet hero, and the category filter chips.

import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { CategoryKind } from "./theme";

interface GlyphProps {
  color: string;
  size?: number;
  strokeWidth?: number;
}

type GlyphFn = (p: GlyphProps) => JSX.Element;

const groceries: GlyphFn = ({ color, size = 16, strokeWidth = 1.6 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 6h2l2 11h10l2-8H7" />
    <Circle cx="9" cy="20" r="1" />
    <Circle cx="17" cy="20" r="1" />
  </Svg>
);

const dining: GlyphFn = ({ color, size = 16, strokeWidth = 1.6 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M7 3v18M5 3v6a2 2 0 004 0V3M17 3c-2 1-3 4-3 7s1 4 3 4v7" />
  </Svg>
);

const transport: GlyphFn = ({ color, size = 16, strokeWidth = 1.6 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="6" width="18" height="11" rx="2" />
    <Circle cx="8" cy="18" r="1.5" />
    <Circle cx="16" cy="18" r="1.5" />
    <Path d="M3 12h18" />
  </Svg>
);

const utilities: GlyphFn = ({ color, size = 16, strokeWidth = 1.6 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" />
  </Svg>
);

const income: GlyphFn = ({ color, size = 16, strokeWidth = 1.6 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 4v15M5 12l7 7 7-7" />
  </Svg>
);

const shopping: GlyphFn = ({ color, size = 16, strokeWidth = 1.6 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M5 8h14l-1 12H6L5 8z" />
    <Path d="M9 8V6a3 3 0 016 0v2" />
  </Svg>
);

const health: GlyphFn = ({ color, size = 16, strokeWidth = 1.6 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M12 4v16M4 12h16" />
  </Svg>
);

const subs: GlyphFn = ({ color, size = 16, strokeWidth = 1.6 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="8" />
    <Path d="M12 8v5l3 2" />
  </Svg>
);

const transfer: GlyphFn = ({ color, size = 16, strokeWidth = 1.6 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    <Path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4" />
  </Svg>
);

export const CATEGORY_GLYPHS: Record<CategoryKind, GlyphFn> = {
  groceries,
  dining,
  transport,
  utilities,
  income,
  shopping,
  health,
  subs,
  transfer,
};

export function CategoryGlyph({
  kind,
  color,
  size,
  strokeWidth,
}: {
  kind: CategoryKind;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const Glyph = CATEGORY_GLYPHS[kind];
  return <Glyph color={color} size={size} strokeWidth={strokeWidth} />;
}
