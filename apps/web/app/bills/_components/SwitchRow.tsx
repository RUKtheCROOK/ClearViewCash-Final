"use client";

interface Props {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  last?: boolean;
  disabled?: boolean;
}

/**
 * Toggle row used for autopay + reminder switches. Matches the design's
 * SwitchRow component — 28x28 tinted icon, two-line text, 42x24 toggle.
 */
export function SwitchRow({ icon, title, subtitle, on, onToggle, last, disabled }: Props) {
  return (
    <div
      style={{
        padding: "12px 14px",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 10,
        alignItems: "center",
        borderBottom: last ? "none" : "1px solid var(--line-faint, var(--line-soft))",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: "var(--bg-tinted)",
          display: "grid",
          placeItems: "center",
        }}
      >
        {icon}
      </span>
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)" }}>{title}</div>
        {subtitle ? (
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{subtitle}</div>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={disabled}
        onClick={() => onToggle(!on)}
        style={{
          width: 42,
          height: 24,
          borderRadius: 999,
          background: on ? "var(--brand)" : "var(--bg-tinted)",
          position: "relative",
          border: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          transition: "background 200ms ease",
          padding: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: on ? 20 : 2,
            width: 20,
            height: 20,
            borderRadius: 999,
            background: "var(--bg-surface)",
            transition: "left 200ms ease",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          }}
        />
      </button>
    </div>
  );
}
