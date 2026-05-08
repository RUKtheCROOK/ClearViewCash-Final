import type { JSX } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

type GlyphFn = (color: string, size?: number) => JSX.Element;

export const Si = {
  back: (color, sz = 18) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  chevR: (color, sz = 14) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  chevD: (color, sz = 12) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  check: (color, sz = 14) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l4 4 10-10" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  copy: (color, sz = 14) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Rect x={8} y={8} width={12} height={12} rx={2} stroke={color} strokeWidth={1.8} />
      <Path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  user: (color, sz = 18) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
      <Path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  spaces: (color, sz = 18) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={9} r={5} stroke={color} strokeWidth={1.8} />
      <Circle cx={16} cy={15} r={4} stroke={color} strokeWidth={1.8} />
    </Svg>
  ),
  bell: (color, sz = 18) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M6 16V11a6 6 0 0112 0v5l1.5 2h-15z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10 20a2 2 0 004 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  shield: (color, sz = 18) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l8 3v5c0 5-4 9-8 10-4-1-8-5-8-10V6l8-3z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  star: (color, sz = 18) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l3 6 6.5 1-4.7 4.6 1.1 6.4L12 18l-5.9 3 1.1-6.4L2.5 10 9 9z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  plug: (color, sz = 18) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M9 4v6M15 4v6M7 10h10v3a5 5 0 01-10 0z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 18v3" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  lock: (color, sz = 18) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={11} width={16} height={10} rx={2} stroke={color} strokeWidth={1.8} />
      <Path d="M8 11V7a4 4 0 018 0v4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  help: (color, sz = 18) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path d="M9 9.5a3 3 0 016 0c0 2-3 2.5-3 4.5M12 17.5h.01" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  info: (color, sz = 18) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
      <Path d="M12 8h.01M11 12h1v5h1" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  card: (color, sz = 18) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={6} width={18} height={13} rx={2} stroke={color} strokeWidth={1.8} />
      <Path d="M3 11h18" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  edit: (color, sz = 14) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M14 4l6 6L8 22H2v-6L14 4z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  warn: (color, sz = 14) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3l10 18H2L12 3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 10v5M12 18h.01" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  trash: (color, sz = 16) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M6 6l1 14a2 2 0 002 2h6a2 2 0 002-2l1-14" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  signOut: (color, sz = 16) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  plus: (color, sz = 14) => (
    <Svg width={sz} height={sz} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
} as const satisfies Record<string, GlyphFn>;

export type GlyphKey = keyof typeof Si;
