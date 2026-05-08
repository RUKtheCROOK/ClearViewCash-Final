"use client";

import { Si } from "./settingsGlyphs";

interface PlanCardProps {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  current?: boolean;
  upsell?: boolean;
  outline?: boolean;
  cta?: string;
  save?: string;
  disabled?: boolean;
  onPress?: () => void;
}

export function PlanCard({ name, price, cadence, features, current, upsell, outline, cta, save, disabled, onPress }: PlanCardProps) {
  return (
    <div
      style={{
        flexShrink: 0,
        width: 240,
        padding: 14,
        borderRadius: 14,
        background: current ? "var(--brand-tint)" : upsell ? "var(--accent-tint)" : "var(--bg-surface)",
        border: `${current || upsell ? 1.5 : 1}px solid ${current ? "var(--brand)" : upsell ? "var(--accent)" : "var(--line-soft)"}`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        position: "relative",
        fontFamily: "var(--font-ui)",
      }}
    >
      {current ? (
        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            padding: "2px 7px",
            borderRadius: 999,
            background: "var(--brand)",
            color: "var(--brand-on)",
            fontFamily: "var(--font-num)",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.06em",
          }}
        >
          CURRENT
        </span>
      ) : null}
      {save && !current ? (
        <span
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            padding: "2px 7px",
            borderRadius: 999,
            background: "var(--accent)",
            color: "white",
            fontFamily: "var(--font-num)",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.06em",
          }}
        >
          {save.toUpperCase()}
        </span>
      ) : null}
      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>{name}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
        <span
          style={{
            fontFamily: "var(--font-num)",
            fontSize: 24,
            fontWeight: 600,
            color: "var(--ink-1)",
            letterSpacing: "-0.02em",
          }}
        >
          {price}
        </span>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{cadence}</span>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
        {features.map((f, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              fontSize: 11.5,
              color: "var(--ink-2)",
              lineHeight: 1.45,
            }}
          >
            <span style={{ marginTop: 3, flexShrink: 0 }}>
              {Si.check(current ? "var(--brand)" : "var(--ink-3)")}
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      {!current ? (
        <button
          type="button"
          onClick={onPress}
          disabled={disabled}
          style={{
            marginTop: 4,
            height: 38,
            borderRadius: 10,
            cursor: disabled ? "not-allowed" : "pointer",
            background: outline ? "transparent" : upsell ? "var(--accent)" : "var(--brand)",
            border: outline ? "1px solid var(--line-firm)" : 0,
            color: outline ? "var(--ink-1)" : "white",
            fontFamily: "var(--font-ui)",
            fontSize: 12.5,
            fontWeight: 500,
            opacity: disabled ? 0.55 : 1,
          }}
        >
          {cta || "Switch"}
        </button>
      ) : null}
    </div>
  );
}
