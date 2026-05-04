"use client";
import type { CoverageReport } from "@cvc/domain";

const STATUS_LABELS: Record<CoverageReport["status"], string> = {
  green: "Fully covered",
  yellow: "Tight — watch the dip",
  red: "Shortfall ahead",
};

const STATUS_COLORS: Record<CoverageReport["status"], string> = {
  green: "var(--positive, #16A34A)",
  yellow: "var(--warning, #F59E0B)",
  red: "var(--negative, #DC2626)",
};

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export interface CoverageStatusCardProps {
  report: CoverageReport;
  compact?: boolean;
}

export function CoverageStatusCard({ report, compact = false }: CoverageStatusCardProps) {
  const tone = STATUS_COLORS[report.status];

  return (
    <section className="card" style={{ padding: 20 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: 999, background: tone }} />
        <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: tone, fontWeight: 600 }}>
          Funding coverage
        </span>
      </header>
      <div style={{ marginTop: 8, fontSize: compact ? 16 : 22, fontWeight: 600 }}>
        {STATUS_LABELS[report.status]}
      </div>

      {report.status !== "green" ? (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr auto", rowGap: 6, columnGap: 16 }}>
          {report.insolvencyDate ? (
            <>
              <span className="muted" style={{ fontSize: 13 }}>Drops below threshold</span>
              <strong style={{ fontSize: 13 }}>
                {report.daysUntilInsolvency != null
                  ? `In ${report.daysUntilInsolvency} day${report.daysUntilInsolvency === 1 ? "" : "s"}`
                  : report.insolvencyDate}
              </strong>
            </>
          ) : null}
          {report.worstShortfallDate && report.worstShortfall < 0 ? (
            <>
              <span className="muted" style={{ fontSize: 13 }}>Worst position</span>
              <strong style={{ fontSize: 13, color: "var(--negative, #DC2626)" }}>
                {fmtMoney(report.worstShortfall)}
              </strong>
            </>
          ) : null}
        </div>
      ) : null}

      {!compact && report.uncoveredBills.length > 0 ? (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border, #E5E7EB)" }}>
          <div className="muted" style={{ fontSize: 11, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {report.uncoveredBills.length} bill{report.uncoveredBills.length === 1 ? "" : "s"} not covered
          </div>
          {report.uncoveredBills.slice(0, 3).map((b, idx) => (
            <div
              key={`${b.billId}-${b.date}-${idx}`}
              style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{b.billName}</div>
                <div className="muted" style={{ fontSize: 11 }}>{b.date}</div>
              </div>
              <div style={{ color: "var(--negative, #DC2626)" }}>{fmtMoney(-b.amount)}</div>
            </div>
          ))}
          {report.uncoveredBills.length > 3 ? (
            <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
              +{report.uncoveredBills.length - 3} more
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
