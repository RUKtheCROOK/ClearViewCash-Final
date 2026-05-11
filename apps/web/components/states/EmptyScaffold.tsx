"use client";

import type { ReactNode } from "react";
import { ACCENT_VARS, type ActionProp, type StateAccent } from "./states.types";

interface Props {
  illo?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  primary?: ActionProp;
  secondary?: ActionProp;
  footnote?: ReactNode;
  accent?: StateAccent;
}

export function EmptyScaffold({ illo, eyebrow, title, body, primary, secondary, footnote, accent = "brand" }: Props) {
  const acc = ACCENT_VARS[accent];
  return (
    <div style={{ padding: "20px 16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          padding: "28px 20px 24px",
          borderRadius: 22,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {illo}
        {eyebrow ? (
          <div
            style={{
              marginTop: 18,
              fontFamily: "var(--font-num)",
              fontSize: 10,
              color: acc.fg,
              letterSpacing: "0.10em",
              fontWeight: 600,
            }}
          >
            {eyebrow}
          </div>
        ) : null}
        <h2
          style={{
            margin: "8px 0 6px",
            fontFamily: "var(--font-ui)",
            fontSize: 19,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: "var(--ink-1)",
            textWrap: "balance",
          }}
        >
          {title}
        </h2>
        {body ? (
          <p
            style={{
              margin: 0,
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--ink-3)",
              lineHeight: 1.5,
              textWrap: "pretty",
              maxWidth: 280,
            }}
          >
            {body}
          </p>
        ) : null}
        {(primary || secondary) && (
          <div style={{ marginTop: 18, width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            {primary ? (
              <button
                type="button"
                onClick={primary.onPress}
                style={{
                  width: "100%",
                  height: 46,
                  borderRadius: 12,
                  border: 0,
                  cursor: "pointer",
                  background: acc.fg,
                  color: acc.on,
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {primary.label}
              </button>
            ) : null}
            {secondary ? (
              <button
                type="button"
                onClick={secondary.onPress}
                style={{
                  width: "100%",
                  height: 42,
                  borderRadius: 12,
                  cursor: "pointer",
                  background: "transparent",
                  border: "1px solid var(--line-firm)",
                  color: "var(--ink-1)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {secondary.label}
              </button>
            ) : null}
          </div>
        )}
      </div>
      {footnote ? (
        <div
          style={{
            textAlign: "center",
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-3)",
            lineHeight: 1.55,
          }}
        >
          {footnote}
        </div>
      ) : null}
    </div>
  );
}
