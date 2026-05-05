"use client";

interface Props {
  label: string;
  right?: React.ReactNode;
}

export function SectionLabel({ label, right }: Props) {
  return (
    <div style={{ padding: "14px 18px 8px", display: "flex", alignItems: "baseline", gap: 8 }}>
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--ink-1)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1 }} />
      {right}
    </div>
  );
}
