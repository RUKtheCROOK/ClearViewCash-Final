"use client";

import type { ReactNode } from "react";
import { useTheme } from "../../lib/theme-provider";
import type { SpaceMeta } from "./states.types";

interface Props {
  title: ReactNode;
  sub?: ReactNode;
  space?: SpaceMeta;
  right?: ReactNode;
}

export function StateHeader({ title, sub, space, right }: Props) {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  return (
    <div style={{ padding: "14px 16px 8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {space ? (
          <span
            className="space"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 10px 5px 8px",
              borderRadius: 999,
              background: isDark
                ? `oklch(28% 0.045 ${space.hue})`
                : `oklch(94% 0.024 ${space.hue})`,
              color: isDark
                ? `oklch(82% 0.080 ${space.hue})`
                : `oklch(38% 0.060 ${space.hue})`,
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 500,
              ["--space-h" as string]: space.hue,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 999, background: `oklch(60% 0.105 ${space.hue})` }} />
            {space.name}
          </span>
        ) : null}
        <div style={{ marginLeft: "auto" }}>{right}</div>
      </div>
      <h1
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-ui)",
          fontSize: 26,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--ink-1)",
        }}
      >
        {title}
      </h1>
      {sub ? (
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>{sub}</div>
      ) : null}
    </div>
  );
}
