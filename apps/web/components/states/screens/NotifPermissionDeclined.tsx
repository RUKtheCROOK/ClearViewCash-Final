"use client";

import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";
import { IlloBell } from "../illustrations";

interface Channel {
  title: string;
  body: string;
}

interface Props {
  onOpenSettings?: () => void;
  channels?: Channel[];
  askAgainNote?: string;
}

const DEFAULT_CHANNELS: Channel[] = [
  { title: "Bill reminders", body: "3 days before due, plus day-of" },
  { title: "Low balance", body: "When checking drops below $250" },
  { title: "Large transactions", body: "Over $200 personal · $500 shared" },
];

export function NotifPermissionDeclined({ onOpenSettings, channels = DEFAULT_CHANNELS, askAgainNote }: Props) {
  return (
    <StateScreen>
      <StateHeader title="Notifications" sub="Push is off in your browser / OS settings" />

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
          <IlloBell accent="var(--warn)" />
          <StateMono
            style={{
              marginTop: 12,
              fontSize: 10,
              color: "var(--warn)",
              letterSpacing: "0.10em",
              fontWeight: 700,
            }}
          >
            PUSH PERMISSION · OFF
          </StateMono>
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 18,
              fontWeight: 500,
              color: "var(--ink-1)",
              textWrap: "balance",
              maxWidth: 280,
              lineHeight: 1.3,
            }}
          >
            You&apos;ll miss bill due dates and low-balance alerts
          </div>
          <div
            style={{
              marginTop: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              color: "var(--ink-3)",
              lineHeight: 1.5,
              maxWidth: 280,
            }}
          >
            We can still email or text you. Push is the fastest — usually a few seconds before you&apos;d otherwise notice.
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            style={{
              marginTop: 18,
              width: "100%",
              height: 46,
              borderRadius: 12,
              border: 0,
              cursor: "pointer",
              background: "var(--brand)",
              color: "var(--brand-on)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Open notification settings
          </button>
        </div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
          WE&apos;RE STILL WATCHING — VIA EMAIL
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
          {channels.map((c, i, arr) => (
            <div
              key={c.title}
              style={{
                padding: "10px 14px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 8,
                alignItems: "center",
                borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--line-faint)",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-1)", fontWeight: 500 }}>
                  {c.title}
                </div>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
                  {c.body}
                </div>
              </div>
              <span
                style={{
                  padding: "3px 7px",
                  borderRadius: 999,
                  background: "var(--bg-tinted)",
                  color: "var(--ink-2)",
                  fontFamily: "var(--font-num)",
                  fontSize: 9,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                }}
              >
                EMAIL
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--bg-tinted)",
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            color: "var(--ink-2)",
            lineHeight: 1.5,
          }}
        >
          {askAgainNote ?? (
            <>
              We&apos;ll ask again in <StateMono style={{ color: "var(--ink-1)", fontWeight: 500 }}>30 days</StateMono>, not
              before. No nags.
            </>
          )}
        </div>
      </div>
    </StateScreen>
  );
}
