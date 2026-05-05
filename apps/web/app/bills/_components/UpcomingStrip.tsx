"use client";

import type { UpcomingSummary } from "@cvc/domain";
import { Num, fmtMoneyDollars } from "./Num";

export function UpcomingStrip({ summary }: { summary: UpcomingSummary }) {
  return (
    <div style={{ padding: "0 16px 14px" }}>
      <div
        style={{
          background: "var(--brand-tint)",
          borderRadius: 14,
          padding: "14px 16px",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Section eyebrow="NEXT 7 DAYS" {...summary.next7} />
        <span style={{ width: 1, height: 36, background: "var(--brand-soft, var(--brand-tint))" }} />
        <Section eyebrow="NEXT 30 DAYS" {...summary.next30} />
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  count,
  totalCents,
  autopayCount,
}: {
  eyebrow: string;
  count: number;
  totalCents: number;
  autopayCount: number;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-num)",
          fontSize: 10.5,
          color: "var(--brand)",
          letterSpacing: "0.08em",
        }}
      >
        {eyebrow}
      </div>
      <Num style={{ fontSize: 20, fontWeight: 600, color: "var(--ink-1)", marginTop: 2, display: "block" }}>
        {fmtMoneyDollars(totalCents)}
      </Num>
      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-2)", marginTop: 1 }}>
        {count} {count === 1 ? "bill" : "bills"}
        {autopayCount > 0 ? ` · ${autopayCount} on autopay` : ""}
      </div>
    </div>
  );
}
