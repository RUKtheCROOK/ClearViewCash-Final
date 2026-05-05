"use client";

interface Props {
  initial: string;
  bg: string;
  fg: string;
  size?: number;
}

export function Avatar({ initial, bg, fg, size = 14 }: Props) {
  return (
    <span
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: 999,
        background: bg,
        color: fg,
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: Math.round(size * 0.62),
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {(initial.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}
