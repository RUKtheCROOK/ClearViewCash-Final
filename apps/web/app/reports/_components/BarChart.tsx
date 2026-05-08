"use client";

interface Bucket {
  label: string;
  cashIn: number;
  cashOut: number;
  net?: number;
}

interface Props {
  data: Bucket[];
}

export function BarChart({ data }: Props) {
  if (data.length === 0) {
    return <EmptyChart label="No transactions in this range" />;
  }
  const max = Math.max(1, ...data.map((d) => Math.max(d.cashIn, d.cashOut)));
  const W = 320;
  const H = 180;
  const padTop = 12;
  const padBottom = 22;
  const inner = H - padTop - padBottom;
  const groupW = W / data.length;
  const barWidth = Math.max(4, Math.min((groupW - 8) / 2, 14));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
        {/* baseline */}
        <line
          x1={0}
          x2={W}
          y1={H - padBottom}
          y2={H - padBottom}
          stroke="var(--line-soft)"
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const cx = i * groupW + groupW / 2;
          const inH = (d.cashIn / max) * inner;
          const outH = (d.cashOut / max) * inner;
          return (
            <g key={d.label}>
              <rect
                x={cx - barWidth - 1}
                y={H - padBottom - inH}
                width={barWidth}
                height={inH}
                fill="var(--pos)"
                opacity={0.9}
                rx={2}
              />
              <rect
                x={cx + 1}
                y={H - padBottom - outH}
                width={barWidth}
                height={outH}
                fill="var(--ink-2)"
                opacity={0.6}
                rx={2}
              />
              <text
                x={cx}
                y={H - 6}
                fontSize={9}
                textAnchor="middle"
                fill="var(--ink-3)"
                fontFamily="var(--font-num)"
                style={{ letterSpacing: "0.02em" }}
              >
                {shortLabel(d.label)}
              </text>
            </g>
          );
        })}
      </svg>
      <div
        style={{
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          color: "var(--ink-3)",
        }}
      >
        <LegendDot color="var(--pos)" label="Cash in" />
        <LegendDot color="var(--ink-2)" label="Cash out" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, opacity: 0.85 }} />
      {label}
    </span>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div
      style={{
        height: 180,
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        color: "var(--ink-3)",
      }}
    >
      {label}
    </div>
  );
}

function shortLabel(iso: string): string {
  // Date bucket strings come in as YYYY-MM-DD or YYYY-MM. Show the trailing
  // segment so the axis stays readable on narrow widths.
  if (/^\d{4}-\d{2}$/.test(iso)) return iso.slice(5);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso.slice(8);
  return iso;
}
