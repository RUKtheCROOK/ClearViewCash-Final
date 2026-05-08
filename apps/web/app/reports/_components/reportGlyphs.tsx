"use client";

import type { ReactElement } from "react";

export type ReportKind =
  | "cash_flow"
  | "category"
  | "net_worth"
  | "income"
  | "activity";

interface IconProps {
  size?: number;
  color?: string;
}

const stroke = (size = 18) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function CashflowIcon({ size = 22, color }: IconProps) {
  return (
    <svg {...stroke(size)} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M3 17l5-5 4 3 5-7 4 4" />
      <path d="M3 21h18" />
    </svg>
  );
}

export function PieIcon({ size = 22, color }: IconProps) {
  return (
    <svg {...stroke(size)} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M12 3v9h9a9 9 0 11-9-9z" />
      <path d="M14 3a8 8 0 017 7h-7z" />
    </svg>
  );
}

export function TrendIcon({ size = 22, color }: IconProps) {
  return (
    <svg {...stroke(size)} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M3 12c4 0 4-6 8-6s4 6 8 6 4-3 4-3" />
      <path d="M3 18h18" />
    </svg>
  );
}

export function IncomeIcon({ size = 22, color }: IconProps) {
  return (
    <svg {...stroke(size)} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M3 7l4 4 5-3 4 4 5-5" />
      <path d="M19 7v4M19 7h-4" />
    </svg>
  );
}

export function BarsIcon({ size = 22, color }: IconProps) {
  return (
    <svg {...stroke(size)} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M5 20V10M10 20V4M15 20v-7M20 20v-13" />
    </svg>
  );
}

export function PdfIcon({ size = 22, color }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      style={color ? { color } : undefined}
      aria-hidden="true"
    >
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 14h1.5a1.5 1.5 0 010 3H9zM13 14h2M13 17h1.5M17 14h2" />
    </svg>
  );
}

export function CsvIcon({ size = 22, color }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinejoin="round"
      style={color ? { color } : undefined}
      aria-hidden="true"
    >
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M8 13h2M8 16h2M12 13h2M12 16h2M16 13h2M16 16h2" />
    </svg>
  );
}

export function ShareIcon({ size = 16, color }: IconProps) {
  return (
    <svg {...stroke(size)} strokeWidth={2} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M12 3v12M7 8l5-5 5 5M5 15v4a2 2 0 002 2h10a2 2 0 002-2v-4" />
    </svg>
  );
}

export function DownloadIcon({ size = 16, color }: IconProps) {
  return (
    <svg {...stroke(size)} strokeWidth={2} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />
    </svg>
  );
}

export function BackIcon({ size = 18, color }: IconProps) {
  return (
    <svg {...stroke(size)} strokeWidth={2} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function MoreIcon({ size = 18, color }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={color ? { color } : undefined}
      aria-hidden="true"
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export function SearchIcon({ size = 16, color }: IconProps) {
  return (
    <svg {...stroke(size)} strokeWidth={2} style={color ? { color } : undefined} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function CloseIcon({ size = 20, color }: IconProps) {
  return (
    <svg {...stroke(size)} strokeWidth={2} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ChevDownIcon({ size = 12, color }: IconProps) {
  return (
    <svg {...stroke(size)} strokeWidth={2} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ChevRightIcon({ size = 14, color }: IconProps) {
  return (
    <svg {...stroke(size)} strokeWidth={2} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function StarIcon({ size = 14, filled = false, color }: IconProps & { filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      strokeLinecap={filled ? undefined : "round"}
      style={color ? { color } : undefined}
      aria-hidden="true"
    >
      <path d="M12 3l3 6 6.5 1-4.7 4.6 1.1 6.4L12 18l-5.9 3 1.1-6.4L2.5 10 9 9z" />
    </svg>
  );
}

export function ArrowUpIcon({ size = 11, color }: IconProps) {
  return (
    <svg {...stroke(size)} strokeWidth={2.4} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function ArrowDownIcon({ size = 11, color }: IconProps) {
  return (
    <svg {...stroke(size)} strokeWidth={2.4} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}

export function CheckIcon({ size = 14, color }: IconProps) {
  return (
    <svg {...stroke(size)} strokeWidth={2.4} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}

export function PlusIcon({ size = 14, color }: IconProps) {
  return (
    <svg {...stroke(size)} strokeWidth={2.2} style={color ? { color } : undefined} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

interface ReportMeta {
  kind: ReportKind;
  title: string;
  sub: string;
  hue: number;
  /** "Trend" / "Breakdown" / "Summary" — shown as the eyebrow above the card title. */
  category: "Trend" | "Breakdown" | "Summary";
  starred: boolean;
  /** Default URL slug — used in routing. */
  slug: string;
  /** Whether we have backing domain logic for this report. False = "Coming soon". */
  available: boolean;
}

export const REPORTS: ReportMeta[] = [
  {
    kind: "cash_flow",
    title: "Cash Flow",
    sub: "Income vs expenses over time",
    hue: 195,
    category: "Trend",
    starred: true,
    slug: "cash-flow",
    available: true,
  },
  {
    kind: "category",
    title: "Spending by Category",
    sub: "Where the money went, with drill-down",
    hue: 30,
    category: "Breakdown",
    starred: true,
    slug: "category",
    available: true,
  },
  {
    kind: "net_worth",
    title: "Net Worth Over Time",
    sub: "Assets minus liabilities, monthly",
    hue: 145,
    category: "Trend",
    starred: true,
    slug: "net-worth",
    available: true,
  },
  {
    kind: "income",
    title: "Income Sources",
    sub: "Mix of paychecks, freelance, dividends",
    hue: 220,
    category: "Breakdown",
    starred: false,
    slug: "income",
    available: false,
  },
  {
    kind: "activity",
    title: "Account Activity",
    sub: "Per-account credits, debits, balance change",
    hue: 305,
    category: "Summary",
    starred: false,
    slug: "activity",
    available: false,
  },
];

const SLUG_TO_KIND: Record<string, ReportKind> = REPORTS.reduce(
  (acc, r) => {
    acc[r.slug] = r.kind;
    return acc;
  },
  {} as Record<string, ReportKind>,
);

export function reportFromSlug(slug: string): ReportMeta | null {
  const kind = SLUG_TO_KIND[slug];
  if (!kind) return null;
  return REPORTS.find((r) => r.kind === kind) ?? null;
}

export function glyphFor(kind: ReportKind, size = 22, color?: string): ReactElement {
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

interface ReportIconProps {
  kind: ReportKind;
  hue: number;
  size?: number;
}

export function ReportIcon({ kind, hue, size = 36 }: ReportIconProps) {
  const wash = `oklch(94% 0.024 ${hue})`;
  const fg = `oklch(38% 0.060 ${hue})`;
  const washDark = `oklch(28% 0.040 ${hue})`;
  const fgDark = `oklch(80% 0.075 ${hue})`;
  return (
    <span
      className="cvc-report-icon"
      style={{
        ["--report-bg" as string]: wash,
        ["--report-fg" as string]: fg,
        ["--report-bg-dark" as string]: washDark,
        ["--report-fg-dark" as string]: fgDark,
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: wash,
        color: fg,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      {glyphFor(kind, Math.round(size * 0.6))}
    </span>
  );
}
