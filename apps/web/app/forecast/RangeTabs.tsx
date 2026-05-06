"use client";

export type RangeKey = "7d" | "30d" | "90d" | "1y";

export const RANGE_MAP: Record<RangeKey, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 365,
};

export const RANGE_LABELS: Record<RangeKey, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
  "1y": "1 year",
};

const OPTIONS: Array<{ key: RangeKey; label: string }> = [
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "1y", label: "1Y" },
];

export function RangeTabs({
  value,
  onChange,
}: {
  value: RangeKey;
  onChange: (key: RangeKey) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--bg-tinted)",
        padding: 3,
        borderRadius: 9,
        gap: 2,
      }}
    >
      {OPTIONS.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            style={{
              flex: 1,
              height: 30,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: active ? "var(--bg-surface)" : "transparent",
              color: active ? "var(--ink-1)" : "var(--ink-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 500,
              borderRadius: 7,
              border: "none",
              cursor: "pointer",
              boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
