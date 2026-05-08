"use client";

import type { CSSProperties, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { iconDiscTint } from "./theme-helpers";
import { Si, type GlyphKey } from "./settingsGlyphs";

// Web atoms mirror the design source (Settings.jsx). They use CSS variables
// from globals.css for theming so light/dark mode work out of the box.

const FONT_UI = "var(--font-ui)";
const FONT_NUM = "var(--font-num)";

// ─── IconDisc ────────────────────────────────────────────────────────────

interface IconDiscProps {
  hue?: number;
  glyph: GlyphKey;
  size?: number;
  /** Light/dark mode flag — used only by the `iconDiscTint` helper */
  mode?: "light" | "dark";
  glyphSize?: number;
}

export function IconDisc({ hue, glyph, size = 32, mode = "light", glyphSize }: IconDiscProps) {
  const tint = hue != null ? iconDiscTint(hue, mode) : null;
  const bg = tint ? tint.wash : "transparent";
  const fg = tint ? tint.fg : "var(--ink-2)";
  const radius = Math.round(size * 0.25);
  const Glyph = Si[glyph];
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: bg,
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      {Glyph(fg, glyphSize ?? Math.round(size * 0.56))}
    </span>
  );
}

// ─── Toggle ──────────────────────────────────────────────────────────────

interface ToggleProps {
  on: boolean;
  accent?: string;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ on, accent, onChange, disabled }: ToggleProps) {
  const bg = on ? (accent ?? "var(--brand)") : "var(--bg-tinted)";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onChange) onChange(!on);
      }}
      disabled={disabled}
      aria-pressed={on}
      style={{
        width: 40,
        height: 24,
        borderRadius: 999,
        background: bg,
        border: 0,
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0,
        transition: "background 0.2s ease",
        opacity: disabled ? 0.55 : 1,
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 20,
          height: 20,
          borderRadius: 999,
          background: "white",
          boxShadow: "0 1px 2px rgba(0,0,0,0.18)",
          transition: "left 0.2s ease",
        }}
      />
    </button>
  );
}

// ─── SectionLabel ────────────────────────────────────────────────────────

interface SectionLabelProps {
  children: ReactNode;
  sub?: ReactNode;
}

export function SectionLabel({ children, sub }: SectionLabelProps) {
  return (
    <div style={{ padding: "18px 18px 8px" }}>
      <div
        style={{
          fontFamily: FONT_NUM,
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.10em",
          fontWeight: 600,
          textTransform: "uppercase",
        }}
      >
        {children}
      </div>
      {sub ? (
        <div style={{ marginTop: 4, fontFamily: FONT_UI, fontSize: 11.5, color: "var(--ink-3)" }}>{sub}</div>
      ) : null}
    </div>
  );
}

// ─── Group ───────────────────────────────────────────────────────────────

interface GroupProps {
  children: ReactNode;
  topAccent?: string;
  style?: CSSProperties;
}

export function Group({ children, topAccent, style }: GroupProps) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        borderTop: topAccent ? `3px solid ${topAccent}` : "1px solid var(--line-soft)",
        borderBottom: "1px solid var(--line-soft)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────

interface RowProps {
  glyph?: GlyphKey;
  hue?: number;
  title: ReactNode;
  sub?: ReactNode;
  value?: ReactNode;
  right?: ReactNode;
  danger?: boolean;
  last?: boolean;
  href?: string;
  onPress?: () => void;
  mode?: "light" | "dark";
}

export function Row({ glyph, hue, title, sub, value, right, danger, last, href, onPress, mode = "light" }: RowProps) {
  const router = useRouter();
  const handle = () => {
    if (onPress) onPress();
    else if (href) router.push(href);
  };
  const interactive = !!(onPress || href);
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      onClick={interactive ? handle : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handle();
              }
            }
          : undefined
      }
      style={{
        padding: "12px 18px",
        display: "grid",
        gridTemplateColumns: glyph ? "auto 1fr auto" : "1fr auto",
        gap: 12,
        alignItems: "center",
        borderBottom: last ? "none" : "1px solid var(--line-soft)",
        cursor: interactive ? "pointer" : "default",
        background: "transparent",
        transition: "background 0.1s ease",
      }}
      onMouseEnter={(e) => {
        if (interactive) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-sunken)";
      }}
      onMouseLeave={(e) => {
        if (interactive) (e.currentTarget as HTMLDivElement).style.background = "transparent";
      }}
    >
      {glyph ? <IconDisc glyph={glyph} hue={hue} mode={mode} /> : null}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontFamily: FONT_UI,
            fontSize: 14,
            fontWeight: 500,
            color: danger ? "var(--neg)" : "var(--ink-1)",
            lineHeight: 1.3,
          }}
        >
          {title}
        </div>
        {sub ? (
          <div style={{ fontFamily: FONT_UI, fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.45 }}>
            {sub}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {value != null ? <span style={{ fontFamily: FONT_UI, fontSize: 12.5, color: "var(--ink-3)" }}>{value}</span> : null}
        {right === undefined ? Si.chevR(danger ? "var(--neg)" : "var(--ink-3)") : right}
      </div>
    </div>
  );
}

// ─── ToggleRow ───────────────────────────────────────────────────────────

interface ToggleRowProps {
  glyph?: GlyphKey;
  hue?: number;
  title: ReactNode;
  sub?: ReactNode;
  on: boolean;
  onChange?: (next: boolean) => void;
  accent?: string;
  last?: boolean;
  disabled?: boolean;
  mode?: "light" | "dark";
}

export function ToggleRow({ glyph, hue, title, sub, on, onChange, accent, last, disabled, mode = "light" }: ToggleRowProps) {
  return (
    <div
      style={{
        padding: "14px 18px",
        display: "grid",
        gridTemplateColumns: glyph ? "auto 1fr auto" : "1fr auto",
        gap: 12,
        alignItems: "flex-start",
        borderBottom: last ? "none" : "1px solid var(--line-soft)",
      }}
    >
      {glyph ? <IconDisc glyph={glyph} hue={hue} mode={mode} /> : null}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: FONT_UI, fontSize: 14, fontWeight: 500, color: "var(--ink-1)", lineHeight: 1.3 }}>
          {title}
        </div>
        {sub ? (
          <div style={{ fontFamily: FONT_UI, fontSize: 11.5, color: "var(--ink-3)", marginTop: 3, lineHeight: 1.5 }}>
            {sub}
          </div>
        ) : null}
      </div>
      <Toggle on={on} accent={accent} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ─── PageHeader ──────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  backHref?: string;
  onBack?: () => void;
}

export function PageHeader({ title, sub, right, backHref, onBack }: PageHeaderProps) {
  const router = useRouter();
  const handle = () => {
    if (onBack) onBack();
    else if (backHref) router.push(backHref);
    else router.back();
  };
  return (
    <div
      style={{
        padding: "20px 16px 8px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <button
        type="button"
        onClick={handle}
        aria-label="Back"
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: "var(--bg-tinted)",
          border: 0,
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
        }}
      >
        {Si.back("var(--ink-2)")}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1
          style={{
            margin: 0,
            fontFamily: FONT_UI,
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "var(--ink-1)",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {sub ? (
          <div style={{ fontFamily: FONT_UI, fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>
        ) : null}
      </div>
      {right}
    </div>
  );
}

// ─── Channel pill ────────────────────────────────────────────────────────

interface ChannelProps {
  on: boolean;
  label: string;
  onToggle?: () => void;
  disabled?: boolean;
}

export function Channel({ on, label, onToggle, disabled }: ChannelProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        cursor: disabled ? "not-allowed" : "pointer",
        background: on ? "var(--brand)" : "var(--bg-tinted)",
        color: on ? "var(--brand-on)" : "var(--ink-2)",
        border: 0,
        fontFamily: FONT_UI,
        fontSize: 12,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: on ? "var(--brand-on)" : "var(--ink-3)",
        }}
      />
      {label}
    </button>
  );
}

// ─── Pro / role chip ─────────────────────────────────────────────────────

export function ProChip({ children, tone = "brand" }: { children: ReactNode; tone?: "brand" | "muted" | "accent" | "pos" }) {
  const map = {
    brand: { bg: "var(--brand-tint)", fg: "var(--brand)" },
    muted: { bg: "var(--bg-tinted)", fg: "var(--ink-2)" },
    accent: { bg: "var(--accent-tint)", fg: "var(--accent)" },
    pos: { bg: "var(--pos-tint)", fg: "var(--pos)" },
  } as const;
  const t = map[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 7px",
        borderRadius: 999,
        background: t.bg,
        color: t.fg,
        fontFamily: FONT_NUM,
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: "0.06em",
      }}
    >
      {children}
    </span>
  );
}
