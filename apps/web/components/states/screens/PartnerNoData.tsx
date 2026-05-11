"use client";

import { useTheme } from "../../../lib/theme-provider";
import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";

interface Suggestion {
  title: string;
  body: string;
}

interface Props {
  spaceName?: string;
  spaceHue?: number;
  partnerName?: string;
  partnerJoinedRelative?: string;
  selfInitials?: string;
  partnerInitials?: string;
  selfHue?: number;
  suggestions?: Suggestion[];
  onPickShares?: () => void;
  onNudge?: () => void;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { title: "A shared checking account", body: "Track joint balance + transactions" },
  { title: "Rent or mortgage as a household bill", body: "You both see the due date and status" },
  { title: "A grocery budget", body: "You both contribute · transactions auto-flow" },
];

export function PartnerNoData({
  spaceName = "Household",
  spaceHue = 30,
  partnerName = "Riley",
  partnerJoinedRelative = "yesterday",
  selfInitials = "JM",
  partnerInitials = "RP",
  selfHue = 195,
  suggestions = DEFAULT_SUGGESTIONS,
  onPickShares,
  onNudge,
}: Props) {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  return (
    <StateScreen spaceHue={spaceHue}>
      <StateHeader
        title={spaceName}
        sub={`${partnerName} joined ${partnerJoinedRelative} · hasn't shared yet`}
        space={{ name: spaceName, hue: spaceHue }}
      />

      <div style={{ padding: "4px 16px 0" }}>
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            <span
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: isDark ? `oklch(30% 0.055 ${spaceHue})` : `oklch(85% 0.060 ${spaceHue})`,
                color: isDark ? `oklch(82% 0.080 ${spaceHue})` : `oklch(30% 0.060 ${spaceHue})`,
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-ui)",
                fontSize: 17,
                fontWeight: 500,
                border: "3px solid var(--bg-surface)",
                zIndex: 2,
              }}
            >
              {selfInitials}
            </span>
            <span
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: isDark ? `oklch(30% 0.055 ${selfHue})` : `oklch(85% 0.060 ${selfHue})`,
                color: isDark ? `oklch(82% 0.080 ${selfHue})` : `oklch(30% 0.060 ${selfHue})`,
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-ui)",
                fontSize: 17,
                fontWeight: 500,
                border: "3px solid var(--bg-surface)",
                marginLeft: -12,
                zIndex: 1,
              }}
            >
              {partnerInitials}
            </span>
          </div>
          <StateMono
            style={{
              marginTop: 14,
              fontSize: 10,
              color: isDark ? `oklch(78% 0.110 ${spaceHue})` : `oklch(46% 0.090 ${spaceHue})`,
              letterSpacing: "0.10em",
              fontWeight: 700,
            }}
          >
            SPACE READY · WAITING ON SHARES
          </StateMono>
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 17,
              fontWeight: 500,
              color: "var(--ink-1)",
              textWrap: "balance",
              maxWidth: 280,
              lineHeight: 1.3,
            }}
          >
            {partnerName}&apos;s in. Now decide what to share.
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-3)",
              lineHeight: 1.55,
              maxWidth: 290,
            }}
          >
            By default nothing is shared. You each choose which accounts, bills, and budgets belong to{" "}
            <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{spaceName}</span>. The rest stays personal.
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
          COMMON FIRST SHARES
        </StateMono>
        <div
          style={{
            marginTop: 8,
            padding: "4px 0",
            borderRadius: 12,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
          }}
        >
          {suggestions.map((s, i, arr) => (
            <div
              key={s.title}
              style={{
                padding: "12px 14px",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 10,
                alignItems: "center",
                borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--line-faint)",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: isDark ? `oklch(30% 0.050 ${spaceHue})` : `oklch(94% 0.024 ${spaceHue})`,
                  color: isDark ? `oklch(82% 0.090 ${spaceHue})` : `oklch(40% 0.080 ${spaceHue})`,
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {i + 1}
              </span>
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>
                  {s.title}
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
                  {s.body}
                </div>
              </div>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ink-3)"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <button
          type="button"
          onClick={onPickShares}
          style={{
            width: "100%",
            height: 46,
            borderRadius: 12,
            cursor: "pointer",
            background: `oklch(60% 0.105 ${spaceHue})`,
            color: "white",
            border: 0,
            fontFamily: "var(--font-ui)",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          Pick what to share
        </button>
        <button
          type="button"
          onClick={onNudge}
          style={{
            marginTop: 8,
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
          Nudge {partnerName} to share too
        </button>
      </div>
    </StateScreen>
  );
}
