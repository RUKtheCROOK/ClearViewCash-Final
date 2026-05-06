"use client";

export type ProgressState = "normal" | "near" | "over";

export function classifyState(spent: number, limit: number): ProgressState {
  if (limit <= 0) return "normal";
  if (spent > limit) return "over";
  if (spent / limit >= 0.85) return "near";
  return "normal";
}

interface Props {
  spent: number;
  limit: number;
  height?: number;
}

export function ProgressBar({ spent, limit, height = 6 }: Props) {
  const state = classifyState(spent, limit);
  const isOver = state === "over";
  const isNear = state === "near";
  const pct = limit > 0 ? Math.min(120, (spent / limit) * 100) : 0;
  const visualPct = isOver ? Math.min(100, (limit / spent) * 100) : pct;

  const fill = isOver ? "var(--warn)" : isNear ? "var(--accent)" : "var(--brand)";
  const fillOpacity = isOver ? 0.85 : isNear ? 0.85 : 0.78;

  return (
    <div
      style={{
        position: "relative",
        height,
        borderRadius: 999,
        background: "var(--bg-tinted)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${visualPct}%`,
          background: fill,
          opacity: fillOpacity,
        }}
      />
      {isOver ? (
        <div
          style={{
            position: "absolute",
            left: `${visualPct}%`,
            top: 0,
            bottom: 0,
            right: 0,
            background: "var(--warn-tint)",
            opacity: 0.9,
          }}
        />
      ) : null}
    </div>
  );
}
