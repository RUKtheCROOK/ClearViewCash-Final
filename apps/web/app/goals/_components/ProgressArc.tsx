"use client";

interface Props {
  /** 0..1 fraction. */
  fraction: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
}

export function ProgressArc({
  fraction,
  size = 92,
  thickness = 6,
  color = "var(--brand)",
  trackColor = "var(--bg-tinted)",
}: Props) {
  const r = (size - thickness * 2) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));
  const dash = clamped * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={thickness} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray={`${dash} ${c}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

interface BarProps {
  fraction: number;
  height?: number;
  color?: string;
}

/** Shared linear progress bar used in goal cards. */
export function GoalProgressBar({ fraction, height = 8, color = "var(--brand)" }: BarProps) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <div
      style={{
        height,
        borderRadius: 999,
        background: "var(--bg-tinted)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: `${pct}%`,
          background: color,
          opacity: 0.85,
        }}
      />
    </div>
  );
}
