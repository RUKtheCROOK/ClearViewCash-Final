"use client";

import type { CategoryKind } from "../../lib/categoryTheme";

interface Props {
  kind: CategoryKind;
  color: string;
  size?: number;
  strokeWidth?: number;
}

const PATHS: Record<CategoryKind, (props: { color: string; strokeWidth: number }) => JSX.Element> = {
  groceries: ({ color, strokeWidth }) => (
    <>
      <path d="M4 6h2l2 11h10l2-8H7" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="20" r="1" stroke={color} strokeWidth={strokeWidth} fill="none" />
      <circle cx="17" cy="20" r="1" stroke={color} strokeWidth={strokeWidth} fill="none" />
    </>
  ),
  dining: ({ color, strokeWidth }) => (
    <path d="M7 3v18M5 3v6a2 2 0 004 0V3M17 3c-2 1-3 4-3 7s1 4 3 4v7" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  transport: ({ color, strokeWidth }) => (
    <>
      <rect x="3" y="6" width="18" height="11" rx="2" stroke={color} strokeWidth={strokeWidth} fill="none" />
      <circle cx="8" cy="18" r="1.5" stroke={color} strokeWidth={strokeWidth} fill="none" />
      <circle cx="16" cy="18" r="1.5" stroke={color} strokeWidth={strokeWidth} fill="none" />
      <path d="M3 12h18" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
    </>
  ),
  utilities: ({ color, strokeWidth }) => (
    <path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  income: ({ color, strokeWidth }) => (
    <path d="M12 4v15M5 12l7 7 7-7" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
  shopping: ({ color, strokeWidth }) => (
    <>
      <path d="M5 8h14l-1 12H6L5 8z" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 016 0v2" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  health: ({ color, strokeWidth }) => (
    <path d="M12 4v16M4 12h16" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
  ),
  subs: ({ color, strokeWidth }) => (
    <>
      <circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} fill="none" />
      <path d="M12 8v5l3 2" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  transfer: ({ color, strokeWidth }) => (
    <path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4" stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ),
};

export function CategoryGlyph({ kind, color, size = 16, strokeWidth = 1.6 }: Props) {
  const Render = PATHS[kind];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <Render color={color} strokeWidth={strokeWidth} />
    </svg>
  );
}
