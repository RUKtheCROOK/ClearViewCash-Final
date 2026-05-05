"use client";

import { hueForCardId, tintForHue } from "@cvc/domain";
import { useTheme } from "../../lib/theme-provider";
import { I } from "../../lib/icons";

export interface LinkChip {
  hueKey: string;
  label: string;
  share?: number | null;
}

interface Props {
  direction: "out" | "in";
  links: LinkChip[];
}

export function LinkStrip({ direction, links }: Props) {
  const { resolved } = useTheme();
  if (links.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        paddingTop: 10,
        marginTop: 10,
        borderTop: "1px dashed var(--line-soft)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink-3)",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginRight: 2,
        }}
      >
        {direction === "out" ? (
          <I.arrowR color="var(--ink-3)" size={11} />
        ) : (
          <I.arrowL color="var(--ink-3)" size={11} />
        )}
        {direction === "out" ? "Pays for" : "Paid by"}
      </span>
      {links.map((l, i) => {
        const tint = tintForHue(hueForCardId(l.hueKey), resolved);
        return (
          <span
            key={`${l.hueKey}-${i}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "3px 8px 3px 6px",
              borderRadius: 999,
              background: tint.pillBg,
              color: tint.pillFg,
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: tint.swatch,
              }}
            />
            {l.label}
            {l.share != null ? (
              <span
                style={{
                  fontFamily: "var(--font-num)",
                  fontSize: 10.5,
                  opacity: 0.85,
                  marginLeft: 2,
                }}
              >
                · {l.share}%
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
