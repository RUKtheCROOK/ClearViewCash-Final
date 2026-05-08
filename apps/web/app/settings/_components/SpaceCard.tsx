"use client";

import type { ReactNode } from "react";
import { Si } from "./settingsGlyphs";
import { ProChip } from "./SettingsAtoms";

interface SpaceCardProps {
  name: string;
  sub: string;
  hue: number;
  role: "OWNER" | "MEMBER";
  members: number;
  active?: boolean;
  solo?: boolean;
  mode?: "light" | "dark";
  onPress?: () => void;
  right?: ReactNode;
}

export function SpaceCard({ name, sub, hue, role, members, active, solo, mode = "light", onPress, right }: SpaceCardProps) {
  const wash = mode === "dark" ? `oklch(28% 0.045 ${hue})` : `oklch(94% 0.026 ${hue})`;
  const fg = mode === "dark" ? `oklch(82% 0.080 ${hue})` : `oklch(36% 0.062 ${hue})`;
  return (
    <button
      type="button"
      onClick={onPress}
      style={{
        width: "100%",
        padding: 14,
        borderRadius: 14,
        background: "var(--bg-surface)",
        border: `1px solid ${active ? fg : "var(--line-soft)"}`,
        borderLeftWidth: active ? 3 : 1,
        borderLeftColor: fg,
        cursor: onPress ? "pointer" : "default",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        textAlign: "left",
        fontFamily: "var(--font-ui)",
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: wash,
          display: "grid",
          placeItems: "center",
          position: "relative",
        }}
      >
        <span style={{ width: 14, height: 14, borderRadius: 999, background: fg }} />
        {active ? (
          <span
            style={{
              position: "absolute",
              bottom: -3,
              right: -3,
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "var(--bg-surface)",
              border: "2px solid var(--bg-surface)",
            }}
          >
            <span style={{ display: "block", width: 10, height: 10, borderRadius: 999, background: "var(--pos)" }} />
          </span>
        ) : null}
      </span>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14.5, fontWeight: 500, color: "var(--ink-1)" }}>{name}</span>
          {active ? <ProChip tone="pos">ACTIVE</ProChip> : null}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
          <ProChip tone={role === "OWNER" ? "brand" : "muted"}>{role}</ProChip>
          {!solo ? (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--ink-3)" }}>
              <span style={{ display: "inline-flex" }}>
                {Array.from({ length: Math.min(3, members) }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      background: ["oklch(85% 0.060 30)", "oklch(85% 0.060 195)", "oklch(85% 0.060 270)"][i],
                      border: "1.5px solid var(--bg-surface)",
                      marginLeft: i === 0 ? 0 : -4,
                    }}
                  />
                ))}
              </span>
              {members} {members === 1 ? "member" : "members"}
            </span>
          ) : null}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {right}
        {Si.chevR("var(--ink-3)")}
      </div>
    </button>
  );
}
