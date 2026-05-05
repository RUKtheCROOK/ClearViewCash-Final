"use client";

import { useEffect } from "react";
import { I } from "../lib/icons";

interface Props {
  open: boolean;
  onClose: () => void;
  onStartTrial: () => void;
}

interface Feature {
  icon: keyof typeof I;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: "spark",
    title: "30-day forecast",
    body: "Daily projection with low-balance warnings and what-if scenarios for upcoming bills, income, and card payoffs.",
  },
  {
    icon: "share",
    title: "Payment links across spaces",
    body: "Tie funding accounts to specific cards or shared obligations so the right account always covers the right charge.",
  },
  {
    icon: "summary",
    title: "Reports & exports",
    body: "Net worth over time, cash flow, and category spending — exportable to CSV and PDF for taxes or planning.",
  },
  {
    icon: "fam",
    title: "Up to 5 members per space",
    body: "Household and Family Trust spaces with granular per-account / per-transaction sharing rules.",
  },
];

export function PremiumModal({ open, onClose, onStartTrial }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,22,28,0.45)",
        zIndex: 200,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-surface)",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: 36,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: "var(--line-firm)" }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px 12px" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "var(--brand-tint)",
                display: "grid",
                placeItems: "center",
                marginBottom: 14,
              }}
            >
              <I.spark color="var(--brand)" size={28} />
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 500,
                color: "var(--ink-1)",
                letterSpacing: "-0.01em",
                textAlign: "center",
              }}
            >
              Clear View Pro
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "var(--ink-2)",
                textAlign: "center",
                marginTop: 6,
                lineHeight: 1.45,
                maxWidth: 360,
              }}
            >
              See further, share smarter, and keep every dollar accounted for.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {FEATURES.map((f) => {
              const Icon = I[f.icon];
              return (
                <div
                  key={f.title}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: 14,
                    borderRadius: 14,
                    background: "var(--bg-canvas)",
                    border: "1px solid var(--line-soft)",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "var(--brand-tint)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon color="var(--brand)" size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>{f.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.5 }}>
                      {f.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 16,
              borderRadius: 16,
              background: "var(--brand-tint)",
              border: "1px solid var(--brand)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--brand)",
                letterSpacing: "0.06em",
              }}
            >
              14-DAY FREE TRIAL
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-1)", marginTop: 6, lineHeight: 1.5 }}>
              No charge for 14 days. Cancel anytime in Settings — your data and free-tier limits stay if you don&apos;t convert.
            </div>
          </div>
        </div>

        <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={onStartTrial}
            style={{
              height: 52,
              borderRadius: 14,
              background: "var(--brand)",
              color: "var(--brand-on)",
              border: 0,
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "-0.005em",
            }}
          >
            Start 14-day free trial
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 44,
              background: "transparent",
              border: 0,
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ink-2)",
            }}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
