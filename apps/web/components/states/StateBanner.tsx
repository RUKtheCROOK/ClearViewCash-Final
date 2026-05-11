"use client";

import type { ReactNode } from "react";
import { ACCENT_VARS, type ActionProp, type BannerTone } from "./states.types";

interface Props {
  tone: BannerTone;
  eyebrow?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  leftBar?: boolean;
  icon?: ReactNode;
  iconChar?: string;
  rightAction?: ActionProp;
}

const ICON_DEFAULT: Record<BannerTone, string> = {
  neg: "!",
  warn: "!",
  info: "i",
};

export function StateBanner({ tone, eyebrow, title, body, leftBar, icon, iconChar, rightAction }: Props) {
  const acc = ACCENT_VARS[tone];
  const iconSize = leftBar ? 28 : 24;
  const iconFontSize = leftBar ? 15 : 13;
  return (
    <div
      style={{
        padding: leftBar ? 16 : "12px 14px",
        borderRadius: leftBar ? 16 : 12,
        background: acc.tint,
        border: `1px solid ${acc.soft}`,
        borderLeft: leftBar ? `3px solid ${acc.fg}` : undefined,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: rightAction ? "auto 1fr auto" : "auto 1fr",
          gap: 10,
          alignItems: leftBar ? "flex-start" : "flex-start",
        }}
      >
        <span
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: 999,
            background: acc.fg,
            color: "white",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--font-ui)",
            fontSize: iconFontSize,
            fontWeight: 600,
            marginTop: leftBar ? 0 : 1,
          }}
        >
          {icon ?? iconChar ?? ICON_DEFAULT[tone]}
        </span>
        <div>
          {eyebrow ? (
            <div
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 10,
                color: acc.fg,
                letterSpacing: "0.10em",
                fontWeight: 700,
                marginBottom: leftBar ? 8 : 0,
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: leftBar ? 16 : 13,
              fontWeight: 500,
              color: "var(--ink-1)",
              lineHeight: leftBar ? 1.3 : 1.4,
            }}
          >
            {title}
          </div>
          {body ? (
            <div
              style={{
                marginTop: leftBar ? 6 : 2,
                fontFamily: "var(--font-ui)",
                fontSize: leftBar ? 13 : 11.5,
                color: "var(--ink-2)",
                lineHeight: 1.5,
              }}
            >
              {body}
            </div>
          ) : null}
        </div>
        {rightAction ? (
          <button
            type="button"
            onClick={rightAction.onPress}
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              background: acc.fg,
              color: "white",
              border: 0,
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              fontWeight: 500,
              alignSelf: "center",
            }}
          >
            {rightAction.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
