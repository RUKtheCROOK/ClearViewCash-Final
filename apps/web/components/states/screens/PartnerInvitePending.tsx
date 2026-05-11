"use client";

import { useTheme } from "../../../lib/theme-provider";
import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";
import { IlloHandshake } from "../illustrations";

interface ChecklistItem {
  title: string;
  body: string;
  cta: string;
  onPress?: () => void;
}

interface Props {
  spaceName?: string;
  spaceHue?: number;
  inviteeName?: string;
  inviteeEmail?: string;
  invitedOn?: string;
  inviteLink?: string;
  expiryLabel?: string;
  checklist?: ChecklistItem[];
  onResend?: () => void;
  onCancel?: () => void;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  {
    title: "Add the shared accounts",
    body: "You can pick which accounts go in the Household space. Riley sees them once they join.",
    cta: "Add accounts",
  },
  {
    title: "Set up household bills",
    body: "Rent, utilities, streaming. Bills carry over when Riley accepts.",
    cta: "Add bills",
  },
  {
    title: "Draft a household budget",
    body: "Use your 3-month averages or build from scratch.",
    cta: "Draft budget",
  },
];

export function PartnerInvitePending({
  spaceName = "Household",
  spaceHue = 30,
  inviteeName = "Riley",
  inviteeEmail = "riley@park.dev",
  invitedOn = "May 7",
  inviteLink = "cvc.app/j/h82-mxlk-3vp",
  expiryLabel = "INVITE LINK · EXPIRES IN 2 DAYS",
  checklist = DEFAULT_CHECKLIST,
  onResend,
  onCancel,
}: Props) {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  return (
    <StateScreen spaceHue={spaceHue}>
      <StateHeader title={spaceName} sub="Waiting on 1 invite" space={{ name: spaceName, hue: spaceHue }} />

      <div style={{ padding: "8px 16px 0" }}>
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
          <IlloHandshake accent={`oklch(60% 0.105 ${spaceHue})`} />
          <StateMono
            style={{
              marginTop: 12,
              fontSize: 10,
              color: isDark ? `oklch(78% 0.110 ${spaceHue})` : `oklch(46% 0.090 ${spaceHue})`,
              letterSpacing: "0.10em",
              fontWeight: 700,
            }}
          >
            INVITE SENT · WAITING
          </StateMono>
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 17,
              fontWeight: 500,
              color: "var(--ink-1)",
              lineHeight: 1.3,
              textWrap: "balance",
            }}
          >
            {inviteeName} hasn&apos;t joined yet
          </div>
          <div
            style={{
              marginTop: 6,
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-3)",
              lineHeight: 1.5,
              maxWidth: 280,
            }}
          >
            We sent an invite to <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>{inviteeEmail}</span> on{" "}
            <StateMono style={{ color: "var(--ink-2)" }}>{invitedOn}</StateMono>. They&apos;ll need to install the app and
            accept.
          </div>

          <div
            style={{
              marginTop: 16,
              width: "100%",
              padding: 12,
              borderRadius: 12,
              background: "var(--bg-sunken)",
              border: "1px solid var(--line-faint)",
            }}
          >
            <StateMono style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
              {expiryLabel}
            </StateMono>
            <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <StateMono
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--line-soft)",
                  fontSize: 11,
                  color: "var(--ink-2)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {inviteLink}
              </StateMono>
              <button
                type="button"
                onClick={onResend}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "var(--brand)",
                  color: "var(--brand-on)",
                  border: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Resend
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
          WHILE YOU WAIT
        </StateMono>
        <div
          style={{
            marginTop: 8,
            padding: "4px 0",
            borderRadius: 14,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
          }}
        >
          {checklist.map((item, i, arr) => (
            <div
              key={item.title}
              style={{
                padding: "12px 14px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                alignItems: "center",
                borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--line-faint)",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--ink-1)",
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 11,
                    color: "var(--ink-3)",
                    marginTop: 2,
                    lineHeight: 1.5,
                  }}
                >
                  {item.body}
                </div>
              </div>
              <button
                type="button"
                onClick={item.onPress}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "var(--bg-tinted)",
                  color: "var(--ink-2)",
                  border: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                  fontWeight: 500,
                }}
              >
                {item.cta}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            width: "100%",
            height: 42,
            borderRadius: 10,
            cursor: "pointer",
            background: "transparent",
            border: "1px solid var(--line-firm)",
            color: "var(--neg)",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Cancel invite
        </button>
      </div>
    </StateScreen>
  );
}
