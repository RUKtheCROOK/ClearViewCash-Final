"use client";

export type BudgetMode = "monthly" | "paycheck";

interface Props {
  value: BudgetMode;
  onChange: (v: BudgetMode) => void;
}

export function ModeToggle({ value, onChange }: Props) {
  return (
    <div style={{ padding: "2px 16px 8px" }}>
      <div
        role="tablist"
        aria-label="Budget view"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 4,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
          borderRadius: 999,
          padding: 4,
        }}
      >
        <Segment label="Monthly" active={value === "monthly"} onClick={() => onChange("monthly")} />
        <Segment label="By Paycheck" active={value === "paycheck"} onClick={() => onChange("paycheck")} />
      </div>
    </div>
  );
}

function Segment({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      onClick={onClick}
      style={{
        height: 32,
        borderRadius: 999,
        border: 0,
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: "-0.005em",
        background: active ? "var(--brand)" : "transparent",
        color: active ? "var(--brand-on)" : "var(--ink-2)",
        transition: "background 120ms ease",
      }}
    >
      {label}
    </button>
  );
}
