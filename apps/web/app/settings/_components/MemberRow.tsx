"use client";

import { Si } from "./settingsGlyphs";

interface MemberRowProps {
  initials: string;
  name: string;
  sub: string;
  hue: number;
  isYou?: boolean;
  role?: "owner" | "editor" | "viewer";
  onChangeRole?: () => void;
}

export function MemberRow({ initials, name, sub, hue, isYou, role = "editor", onChangeRole }: MemberRowProps) {
  return (
    <div style={{ padding: "10px 0", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center" }}>
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: `oklch(85% 0.060 ${hue})`,
          color: `oklch(30% 0.060 ${hue})`,
          display: "grid",
          placeItems: "center",
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        {initials}
      </span>
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)" }}>{name}</div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{sub}</div>
      </div>
      {isYou ? (
        <span
          style={{
            fontFamily: "var(--font-num)",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.06em",
            fontWeight: 600,
          }}
        >
          YOU
        </span>
      ) : (
        <button
          type="button"
          onClick={onChangeRole}
          style={{
            padding: "5px 10px",
            borderRadius: 999,
            background: "var(--bg-tinted)",
            color: "var(--ink-2)",
            border: 0,
            cursor: onChangeRole ? "pointer" : "default",
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            fontWeight: 500,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            textTransform: "capitalize",
          }}
        >
          {role}
          {Si.chevD("var(--ink-3)")}
        </button>
      )}
    </div>
  );
}
