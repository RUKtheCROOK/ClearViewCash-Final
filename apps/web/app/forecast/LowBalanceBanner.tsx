"use client";

import { Num } from "../../components/money";
import { I } from "../../lib/icons";

function fmtDollars(cents: number): string {
  return `$${Math.abs(Math.floor(cents / 100)).toLocaleString("en-US")}`;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function LowBalanceBanner({
  date,
  projectedLowCents,
  thresholdCents,
}: {
  date: string;
  projectedLowCents: number;
  thresholdCents: number;
}) {
  const deficitCents = Math.max(0, thresholdCents - projectedLowCents);
  const transferCents = Math.ceil(deficitCents / 10000) * 10000;

  return (
    <div
      style={{
        background: "var(--warn-tint)",
        color: "var(--warn)",
        border: "1px solid color-mix(in oklch, var(--warn) 33%, transparent)",
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <span style={{ marginTop: 2, display: "inline-flex" }}>
        {I.alert({ color: "var(--warn)", size: 14 })}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600 }}>
          Below your floor on {fmtDate(date)}
        </div>
        <div
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 12,
            marginTop: 2,
            lineHeight: 1.5,
            color: "var(--ink-2)",
          }}
        >
          Projected to dip to{" "}
          <Num style={{ fontWeight: 600, color: "var(--warn)" }}>{fmtDollars(projectedLowCents)}</Num>
          {" "}— your {fmtDollars(thresholdCents)} threshold.
          {transferCents > 0 ? (
            <>
              {" "}Move{" "}
              <Num style={{ fontWeight: 600, color: "var(--ink-1)" }}>{fmtDollars(transferCents)}</Num>
              {" "}from savings to stay safe.
            </>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            type="button"
            style={{
              appearance: "none",
              border: 0,
              cursor: "pointer",
              background: "var(--brand)",
              color: "var(--brand-on)",
              height: 32,
              padding: "0 14px",
              borderRadius: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {transferCents > 0 ? `Transfer ${fmtDollars(transferCents)}` : "Transfer funds"}
          </button>
          <button
            type="button"
            style={{
              appearance: "none",
              cursor: "pointer",
              background: "transparent",
              color: "var(--warn)",
              border: "1px solid color-mix(in oklch, var(--warn) 33%, transparent)",
              height: 32,
              padding: "0 14px",
              borderRadius: 8,
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            Adjust threshold
          </button>
        </div>
      </div>
    </div>
  );
}
