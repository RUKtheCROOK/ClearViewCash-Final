"use client";

interface Cell {
  label: string;
  value: string;
  muted?: boolean;
}

interface Props {
  cells: Cell[];
}

export function MoMCompare({ cells }: Props) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
        display: "grid",
        gridTemplateColumns: `repeat(${cells.length}, 1fr)`,
        gap: 10,
      }}
    >
      {cells.map((c) => (
        <div key={c.label}>
          <div
            style={{
              fontFamily: "var(--font-num)",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.08em",
              fontWeight: 600,
            }}
          >
            {c.label}
          </div>
          <div
            style={{
              marginTop: 4,
              fontFamily: "var(--font-num)",
              fontSize: 15,
              fontWeight: 600,
              color: c.muted ? "var(--ink-2)" : "var(--ink-1)",
              letterSpacing: "-0.01em",
            }}
          >
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
