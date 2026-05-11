"use client";

import { useTheme } from "../../../lib/theme-provider";
import { StateBanner } from "../StateBanner";
import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";

interface TimelineRow {
  date: string;
  label: string;
  state: "ok" | "wait" | "now";
}

interface Props {
  merchantInitials?: string;
  merchantName?: string;
  merchantHue?: number;
  postedOn?: string;
  cardLabel?: string;
  daysPending?: number;
  amount?: string;
  timeline?: TimelineRow[];
  onMarkResolved?: () => void;
  onContact?: () => void;
}

const DEFAULT_TIMELINE: TimelineRow[] = [
  { date: "May 4", label: "Authorized", state: "ok" },
  { date: "May 5–9", label: "Waiting on merchant settlement", state: "wait" },
  { date: "Today", label: "Still pending — unusual", state: "now" },
];

function dotColor(state: TimelineRow["state"]): string {
  if (state === "ok") return "var(--pos)";
  if (state === "now") return "var(--warn)";
  return "var(--ink-4)";
}

export function PendingStuck({
  merchantInitials = "HG",
  merchantName = "Higher Grounds Café",
  merchantHue = 30,
  postedOn = "May 4",
  cardLabel = "Chase Sapphire ··8392",
  daysPending = 6,
  amount = "$24.50",
  timeline = DEFAULT_TIMELINE,
  onMarkResolved,
  onContact,
}: Props) {
  const { resolved } = useTheme();
  const isDark = resolved === "dark";
  return (
    <StateScreen>
      <StateHeader
        title="Transactions"
        sub="May · 1 pending older than usual"
        space={{ name: "Personal", hue: 195 }}
      />

      <div style={{ padding: "4px 16px 0" }}>
        <StateBanner
          tone="warn"
          iconChar="?"
          title={
            <>
              One transaction has been pending for{" "}
              <StateMono style={{ color: "var(--warn)" }}>{daysPending} days</StateMono>
            </>
          }
          body="Most pending charges clear in 1–3 days. This is unusual but not always a problem — often a tip or final amount is still being calculated. Tap below to see what to do."
        />
      </div>

      <div style={{ padding: "14px 16px 0" }}>
        <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
          STILL PENDING
        </StateMono>
        <div
          style={{
            marginTop: 8,
            padding: 14,
            borderRadius: 14,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
            borderLeft: "3px dotted var(--warn)",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "flex-start" }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: isDark ? `oklch(30% 0.055 ${merchantHue})` : `oklch(85% 0.060 ${merchantHue})`,
                color: isDark ? `oklch(82% 0.080 ${merchantHue})` : `oklch(30% 0.060 ${merchantHue})`,
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {merchantInitials}
            </span>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 14,
                  color: "var(--ink-2)",
                  fontStyle: "italic",
                  fontWeight: 500,
                }}
              >
                {merchantName}
              </div>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                Posted {postedOn} · {cardLabel}
              </div>
              <div
                style={{
                  marginTop: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "var(--warn-tint)",
                  color: "var(--warn)",
                  fontFamily: "var(--font-num)",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: 999, background: "var(--warn)" }} />
                PENDING · {daysPending} DAYS
              </div>
            </div>
            <StateMono style={{ fontSize: 15, color: "var(--ink-2)", fontWeight: 400, fontStyle: "italic" }}>
              {amount}
            </StateMono>
          </div>

          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: "var(--bg-sunken)" }}>
            <StateMono style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
              TIMELINE
            </StateMono>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {timeline.map((t) => (
                <div
                  key={`${t.date}-${t.label}`}
                  style={{ display: "grid", gridTemplateColumns: "52px auto 1fr", gap: 8, alignItems: "center" }}
                >
                  <StateMono style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 500 }}>{t.date}</StateMono>
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: dotColor(t.state) }} />
                  <span
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11.5,
                      color: t.state === "now" ? "var(--warn)" : "var(--ink-2)",
                      fontWeight: t.state === "now" ? 500 : 400,
                    }}
                  >
                    {t.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
            <button
              type="button"
              onClick={onMarkResolved}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 10,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-firm)",
                color: "var(--ink-1)",
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              Mark resolved
            </button>
            <button
              type="button"
              onClick={onContact}
              style={{
                flex: 1,
                height: 40,
                borderRadius: 10,
                background: "var(--brand)",
                color: "var(--brand-on)",
                border: 0,
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              Contact bank
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: 10,
            fontFamily: "var(--font-ui)",
            fontSize: 11,
            color: "var(--ink-3)",
            lineHeight: 1.55,
            textAlign: "center",
          }}
        >
          We won&apos;t count it in budgets or forecasts until it posts.
        </div>
      </div>
    </StateScreen>
  );
}
