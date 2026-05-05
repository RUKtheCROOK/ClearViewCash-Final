"use client";

interface Props {
  eyebrow: string;
  caption?: string;
}

export function SectionHead({ eyebrow, caption }: Props) {
  return (
    <div
      style={{
        padding: "22px 4px 8px",
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 500,
          color: "var(--ink-2)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {eyebrow}
      </div>
      {caption ? (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
          {caption}
        </div>
      ) : null}
    </div>
  );
}
