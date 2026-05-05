"use client";

import { I } from "../../lib/icons";

export interface RailChip {
  key: string;
  label: string;
  count?: number;
  active?: boolean;
  hasIcon?: boolean;
  onPress?: () => void;
}

interface Props {
  chips: RailChip[];
}

export function FilterChipRail({ chips }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: "4px 16px 12px",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        background: "var(--bg-canvas)",
      }}
    >
      {chips.map((chip) => (
        <FilterChip key={chip.key} chip={chip} />
      ))}
    </div>
  );
}

function FilterChip({ chip }: { chip: RailChip }) {
  const active = !!chip.active;
  return (
    <button
      type="button"
      onClick={chip.onPress}
      style={{
        flexShrink: 0,
        appearance: "none",
        cursor: "pointer",
        height: 32,
        padding: "0 11px",
        borderRadius: 999,
        background: active ? "var(--ink-1)" : "var(--bg-surface)",
        color: active ? "var(--bg-canvas)" : "var(--ink-2)",
        border: `1px solid ${active ? "var(--ink-1)" : "var(--line-soft)"}`,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-ui)",
        fontSize: 12.5,
        fontWeight: 500,
        lineHeight: 1,
      }}
    >
      {chip.hasIcon ? <I.filter color={active ? "var(--bg-canvas)" : "var(--ink-2)"} size={12} /> : null}
      <span>{chip.label}</span>
      {typeof chip.count === "number" && chip.count > 0 ? (
        <span
          style={{
            fontFamily: "var(--font-num)",
            fontSize: 10,
            background: active ? "rgba(255,255,255,0.18)" : "var(--bg-tinted)",
            color: active ? "var(--bg-canvas)" : "var(--ink-2)",
            padding: "2px 6px",
            borderRadius: 999,
          }}
        >
          {chip.count}
        </span>
      ) : null}
      {!active && chip.hasIcon ? <I.chev color="var(--ink-3)" size={11} /> : null}
    </button>
  );
}
