"use client";

interface Props {
  label: string;
  count: number;
  noun?: string;
  hue?: string;
}

export function GroupLabel({ label, count, noun = "category", hue }: Props) {
  const plural = count === 1 ? noun : noun.endsWith("y") ? noun.slice(0, -1) + "ies" : noun + "s";
  return (
    <div style={{ padding: "18px 18px 8px", display: "flex", alignItems: "center", gap: 8 }}>
      {hue ? (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: hue,
          }}
        />
      ) : null}
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11.5,
          fontWeight: 600,
          color: "var(--ink-2)",
          textTransform: "uppercase",
          letterSpacing: "0.07em",
        }}
      >
        {label}
      </span>
      <span style={{ marginLeft: "auto", fontFamily: "var(--font-num)", fontSize: 11, color: "var(--ink-3)" }}>
        {count} {plural}
      </span>
    </div>
  );
}
