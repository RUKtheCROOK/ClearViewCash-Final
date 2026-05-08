"use client";

interface Point {
  label: string;
  value: number;
}

interface Props {
  data: Point[];
}

export function AreaChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <div
        style={{
          height: 200,
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-ui)",
          fontSize: 13,
          color: "var(--ink-3)",
        }}
      >
        Add an account to see net-worth history
      </div>
    );
  }
  const W = 320;
  const H = 180;
  const padTop = 14;
  const padBottom = 22;
  const padLeft = 4;
  const padRight = 4;
  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;
  const min = Math.min(...data.map((d) => d.value));
  const max = Math.max(...data.map((d) => d.value));
  const span = Math.max(1, max - min);
  const xAt = (i: number) => padLeft + (i / (data.length - 1)) * innerW;
  const yAt = (v: number) => padTop + innerH - ((v - min) / span) * innerH;
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${xAt(i)},${yAt(d.value)}`).join(" ");
  const area = `${path} L ${xAt(data.length - 1)},${H - padBottom} L ${xAt(0)},${H - padBottom} Z`;

  // axis labels: only show the first, middle, and last bucket to avoid crowd
  const labelAt = (i: number) => {
    if (i === 0) return data[0]!.label;
    if (i === data.length - 1) return data[data.length - 1]!.label;
    if (i === Math.floor(data.length / 2)) return data[i]!.label;
    return null;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H}>
      <line
        x1={0}
        x2={W}
        y1={H - padBottom}
        y2={H - padBottom}
        stroke="var(--line-soft)"
        strokeWidth={1}
      />
      <path d={area} fill="var(--brand)" opacity={0.14} />
      <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" />
      {data.map((d, i) => {
        const lbl = labelAt(i);
        if (!lbl) return null;
        return (
          <text
            key={d.label}
            x={xAt(i)}
            y={H - 6}
            fontSize={9}
            textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
            fill="var(--ink-3)"
            fontFamily="var(--font-num)"
            style={{ letterSpacing: "0.02em" }}
          >
            {shortLabel(lbl)}
          </text>
        );
      })}
    </svg>
  );
}

function shortLabel(iso: string): string {
  if (/^\d{4}-\d{2}$/.test(iso)) return iso.slice(5);
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso.slice(5);
  return iso;
}
