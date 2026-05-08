import { View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { Palette } from "@cvc/ui";

export type ReportKind = "cash_flow" | "category" | "net_worth" | "income" | "activity";

interface IconProps {
  size?: number;
  color: string;
}

export function CashflowIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 17l5-5 4 3 5-7 4 4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 21h18" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PieIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3v9h9a9 9 0 11-9-9z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14 3a8 8 0 017 7h-7z" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function TrendIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 12c4 0 4-6 8-6s4 6 8 6 4-3 4-3" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M3 18h18" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IncomeIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 7l4 4 5-3 4 4 5-5" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M19 7v4M19 7h-4" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BarsIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 20V10M10 20V4M15 20v-7M20 20v-13" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PdfIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3h8l4 4v14H6z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M14 3v4h4" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M9 14h1.5a1.5 1.5 0 010 3H9zM13 14h2M13 17h1.5M17 14h2" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

export function CsvIcon({ size = 22, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 3h8l4 4v14H6z" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M14 3v4h4" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d="M8 13h2M8 16h2M12 13h2M12 16h2M16 13h2M16 16h2" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </Svg>
  );
}

export function ShareIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3v12M7 8l5-5 5 5M5 15v4a2 2 0 002 2h10a2 2 0 002-2v-4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function DownloadIcon({ size = 16, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 4v12M7 11l5 5 5-5M5 20h14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BackIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6l-6 6 6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function MoreIcon({ size = 18, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={5} cy={12} r={1.6} fill={color} />
      <Circle cx={12} cy={12} r={1.6} fill={color} />
      <Circle cx={19} cy={12} r={1.6} fill={color} />
    </Svg>
  );
}

export function CloseIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevDownIcon({ size = 12, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevRightIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function StarIcon({ size = 14, color, filled }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"}>
      <Path
        d="M12 3l3 6 6.5 1-4.7 4.6 1.1 6.4L12 18l-5.9 3 1.1-6.4L2.5 10 9 9z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        strokeLinecap={filled ? undefined : "round"}
      />
    </Svg>
  );
}

export function ArrowUpIcon({ size = 11, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 19V5M5 12l7-7 7 7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ArrowDownIcon({ size = 11, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M19 12l-7 7-7-7" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function PlusIcon({ size = 14, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export interface ReportMeta {
  kind: ReportKind;
  title: string;
  sub: string;
  hue: number;
  category: "Trend" | "Breakdown" | "Summary";
  starred: boolean;
  slug: string;
  available: boolean;
}

export const REPORTS: ReportMeta[] = [
  { kind: "cash_flow", title: "Cash Flow", sub: "Income vs expenses over time", hue: 195, category: "Trend", starred: true, slug: "cash-flow", available: true },
  { kind: "category", title: "Spending by Category", sub: "Where the money went, with drill-down", hue: 30, category: "Breakdown", starred: true, slug: "category", available: true },
  { kind: "net_worth", title: "Net Worth Over Time", sub: "Assets minus liabilities, monthly", hue: 145, category: "Trend", starred: true, slug: "net-worth", available: true },
  { kind: "income", title: "Income Sources", sub: "Mix of paychecks, freelance, dividends", hue: 220, category: "Breakdown", starred: false, slug: "income", available: false },
  { kind: "activity", title: "Account Activity", sub: "Per-account credits, debits, balance change", hue: 305, category: "Summary", starred: false, slug: "activity", available: false },
];

const SLUG_TO_META: Record<string, ReportMeta> = REPORTS.reduce(
  (acc, r) => {
    acc[r.slug] = r;
    return acc;
  },
  {} as Record<string, ReportMeta>,
);

export function reportFromSlug(slug: string): ReportMeta | null {
  return SLUG_TO_META[slug] ?? null;
}

export function glyphFor(kind: ReportKind, color: string, size = 22) {
  switch (kind) {
    case "cash_flow":
      return <CashflowIcon size={size} color={color} />;
    case "category":
      return <PieIcon size={size} color={color} />;
    case "net_worth":
      return <TrendIcon size={size} color={color} />;
    case "income":
      return <IncomeIcon size={size} color={color} />;
    case "activity":
      return <BarsIcon size={size} color={color} />;
  }
}

export function reportIconColors(hue: number, mode: "light" | "dark"): { bg: string; fg: string } {
  // We approximate the design's OKLch hue-tinted backgrounds with HSL since RN
  // has no OKLch support. The result is visually close at the hues we use.
  if (mode === "dark") {
    return { bg: `hsl(${hue} 35% 22%)`, fg: `hsl(${hue} 50% 78%)` };
  }
  return { bg: `hsl(${hue} 50% 90%)`, fg: `hsl(${hue} 35% 36%)` };
}

interface ReportIconProps {
  kind: ReportKind;
  hue: number;
  size?: number;
  mode: "light" | "dark";
}

export function ReportIcon({ kind, hue, size = 36, mode }: ReportIconProps) {
  const { bg, fg } = reportIconColors(hue, mode);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {glyphFor(kind, fg, Math.round(size * 0.6))}
    </View>
  );
}

// Kept exported so consumers can render a category-tinted dot/swatch.
export function categorySwatchColor(hue: number, mode: "light" | "dark"): string {
  if (mode === "dark") return `hsl(${hue} 60% 65%)`;
  return `hsl(${hue} 55% 50%)`;
}

// Re-export Palette to avoid double imports in callers.
export type { Palette };
