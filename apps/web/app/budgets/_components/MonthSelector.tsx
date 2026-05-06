"use client";

import { Num } from "./Num";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  monthIdx: number;
  year: number;
  onPrev?: () => void;
  onNext?: () => void;
}

export function MonthSelector({ monthIdx, year, onPrev, onNext }: Props) {
  const prev = MONTHS_SHORT[(monthIdx + 11) % 12] ?? "";
  const curr = MONTHS_SHORT[monthIdx] ?? "";
  const next = MONTHS_SHORT[(monthIdx + 1) % 12] ?? "";

  return (
    <div style={{ padding: "2px 16px 14px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
          borderRadius: 999,
          padding: 4,
        }}
      >
        <button
          type="button"
          onClick={onPrev}
          disabled={!onPrev}
          aria-label="Previous month"
          style={{
            width: 36,
            height: 32,
            background: "transparent",
            border: 0,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            color: "var(--ink-2)",
            cursor: onPrev ? "pointer" : "default",
          }}
        >
          <Chev dir="left" />
        </button>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-4)", fontWeight: 500 }}>{prev}</span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 600, color: "var(--ink-1)", display: "inline-flex", alignItems: "baseline", gap: 5 }}>
            {curr}
            <Num style={{ color: "var(--ink-3)", fontSize: 11.5, fontWeight: 500 }}>{year}</Num>
          </span>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-4)", fontWeight: 500 }}>{next}</span>
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={!onNext}
          aria-label="Next month"
          style={{
            width: 36,
            height: 32,
            background: "transparent",
            border: 0,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            color: "var(--ink-2)",
            cursor: onNext ? "pointer" : "default",
          }}
        >
          <Chev dir="right" />
        </button>
      </div>
    </div>
  );
}

function Chev({ dir }: { dir: "left" | "right" }) {
  const d = dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6";
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
