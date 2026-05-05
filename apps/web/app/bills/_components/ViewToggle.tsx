"use client";

export type BillsViewMode = "list" | "calendar";

export function ViewToggle({ value, onChange }: { value: BillsViewMode; onChange: (v: BillsViewMode) => void }) {
  return (
    <div
      style={{
        display: "inline-flex",
        padding: 3,
        background: "var(--bg-tinted)",
        borderRadius: 999,
        gap: 2,
      }}
    >
      <ToggleBtn label="List" icon={<ListIcon />} active={value === "list"} onClick={() => onChange("list")} />
      <ToggleBtn label="Calendar" icon={<CalIcon />} active={value === "calendar"} onClick={() => onChange("calendar")} />
    </div>
  );
}

function ToggleBtn({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        border: 0,
        cursor: "pointer",
        padding: "7px 14px",
        borderRadius: 999,
        background: active ? "var(--bg-surface)" : "transparent",
        color: active ? "var(--ink-1)" : "var(--ink-2)",
        fontFamily: "var(--font-ui)",
        fontSize: 12.5,
        fontWeight: 500,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
      }}
    >
      <span style={{ color: active ? "var(--ink-1)" : "var(--ink-3)", display: "inline-flex" }}>{icon}</span>
      {label}
    </button>
  );
}

function ListIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

function CalIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}
