"use client";
import { useEffect } from "react";
import type { AppliedDayItem, ForecastBucket } from "@cvc/domain";

const POSITIVE = "var(--positive, #16A34A)";
const NEGATIVE = "var(--negative, #DC2626)";
const WARNING = "var(--warning, #F59E0B)";
const MUTED = "var(--text-muted, #64748B)";
const BORDER = "var(--border, #E5E7EB)";
const BG = "var(--bg, #F7F8FB)";

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function fmtSigned(cents: number): string {
  if (cents === 0) return "$0.00";
  const sign = cents > 0 ? "+" : "−";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface DayDetailPanelProps {
  bucket: ForecastBucket | null;
  onClose: () => void;
  accountsById?: Record<string, string>;
}

export function DayDetailPanel({ bucket, onClose, accountsById = {} }: DayDetailPanelProps) {
  useEffect(() => {
    if (!bucket) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bucket, onClose]);

  if (!bucket) return null;

  const isMultiDay = bucket.startDate !== bucket.endDate;
  const headerLabel = isMultiDay ? bucket.label : prettyDate(bucket.startDate);
  const netChange = bucket.effectiveAvailable - bucket.openEffectiveAvailable;

  const scheduled = bucket.appliedItems.filter((i) => i.source === "scheduled");
  const estimated = bucket.appliedItems.filter((i) => i.source === "estimated");

  const incomeItems = scheduled.filter((i) => i.kind === "income");
  const billItems = scheduled.filter((i) => i.kind === "bill");

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.35)",
          zIndex: 90,
        }}
      />
      <aside
        role="dialog"
        aria-label={`Details for ${headerLabel}`}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "min(440px, 100vw)",
          height: "100vh",
          background: "white",
          boxShadow: "-4px 0 12px rgba(15, 23, 42, 0.12)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${BORDER}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {isMultiDay ? "Period" : "Day"}
            </div>
            <h2 style={{ margin: "4px 0 0", fontSize: 20 }}>{headerLabel}</h2>
            {isMultiDay ? (
              <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
                {bucket.startDate} → {bucket.endDate}
              </div>
            ) : null}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "none",
              background: "transparent",
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              color: MUTED,
              padding: 4,
            }}
          >
            ×
          </button>
        </header>

        {bucket.belowThreshold ? (
          <div
            style={{
              background: "#FEF2F2",
              borderBottom: `1px solid ${BORDER}`,
              padding: "10px 24px",
              fontSize: 13,
              color: NEGATIVE,
              fontWeight: 500,
            }}
          >
            Effective available drops below your threshold here.
          </div>
        ) : null}

        <div style={{ overflow: "auto", flex: 1 }}>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 0,
              borderBottom: `1px solid ${BORDER}`,
              background: BG,
            }}
          >
            <Kpi label="Open" value={fmtMoney(bucket.openEffectiveAvailable)} />
            <Kpi
              label="Close"
              value={fmtMoney(bucket.effectiveAvailable)}
              tone={bucket.effectiveAvailable < 0 ? "negative" : undefined}
            />
            <Kpi
              label="Net change"
              value={fmtSigned(netChange)}
              tone={netChange > 0 ? "positive" : netChange < 0 ? "negative" : undefined}
            />
          </section>

          <section style={{ padding: "16px 24px" }}>
            <SectionHeading
              title="Scheduled"
              subtitle="Known bills and income"
              count={scheduled.length}
            />
            {scheduled.length === 0 ? (
              <Empty text="Nothing scheduled on this day." />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {incomeItems.map((item, idx) => (
                  <ItemRow key={`inc-${item.refId}-${idx}`} item={item} accountsById={accountsById} bucket={bucket} />
                ))}
                {billItems.map((item, idx) => (
                  <ItemRow key={`bill-${item.refId}-${idx}`} item={item} accountsById={accountsById} bucket={bucket} />
                ))}
              </div>
            )}
          </section>

          {estimated.length > 0 ? (
            <section
              style={{
                padding: "16px 24px",
                borderTop: `1px solid ${BORDER}`,
                background: "#FFFBEB",
              }}
            >
              <SectionHeading
                title="Estimated"
                subtitle="Projected from your last 30 days of spending"
                count={estimated.length}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {estimated.map((item, idx) => (
                  <ItemRow
                    key={`est-${item.refId}-${idx}`}
                    item={item}
                    accountsById={accountsById}
                    bucket={bucket}
                  />
                ))}
              </div>
              <p style={{ fontSize: 11, color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
                Estimates assume your average daily spend on each card continues. Actual charges
                will vary; this isn't a fixed bill.
              </p>
            </section>
          ) : null}

          {scheduled.length === 0 && estimated.length === 0 ? (
            <section style={{ padding: "24px", color: MUTED, fontSize: 13 }}>
              Nothing changes on this {isMultiDay ? "period" : "day"}.
            </section>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  const color = tone === "positive" ? POSITIVE : tone === "negative" ? NEGATIVE : undefined;
  return (
    <div style={{ padding: "16px 20px", borderRight: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 11, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 600, color }}>{value}</div>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h3>
        <span
          style={{
            fontSize: 11,
            color: MUTED,
            background: BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 999,
            padding: "1px 8px",
          }}
        >
          {count}
        </span>
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{subtitle}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ marginTop: 8, fontSize: 13, color: MUTED }}>{text}</div>;
}

function ItemRow({
  item,
  accountsById,
  bucket,
}: {
  item: AppliedDayItem;
  accountsById: Record<string, string>;
  bucket: ForecastBucket;
}) {
  const positive = item.amount > 0;
  const color = item.source === "estimated" ? WARNING : positive ? POSITIVE : NEGATIVE;
  const accountName = item.accountId ? accountsById[item.accountId] : null;
  const isMultiDay = bucket.startDate !== bucket.endDate;
  const itemDate = isMultiDay ? findItemDate(bucket, item) : null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 4,
        padding: "10px 12px",
        border: `1px solid ${BORDER}`,
        borderRadius: 8,
        background: "white",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>{item.name}</span>
          {item.source === "estimated" ? (
            <span
              style={{
                fontSize: 10,
                color: WARNING,
                border: `1px solid ${WARNING}`,
                borderRadius: 999,
                padding: "0 6px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              Estimated
            </span>
          ) : item.cadence ? (
            <span
              style={{
                fontSize: 10,
                color: MUTED,
                border: `1px solid ${BORDER}`,
                borderRadius: 999,
                padding: "0 6px",
              }}
            >
              {item.cadence}
            </span>
          ) : null}
        </div>
        {(accountName || item.note || itemDate) ? (
          <div style={{ fontSize: 11, color: MUTED }}>
            {[itemDate, accountName, item.note].filter(Boolean).join(" · ")}
          </div>
        ) : null}
      </div>
      <div style={{ fontWeight: 600, color, fontSize: 14, alignSelf: "center" }}>
        {fmtSigned(item.amount)}
      </div>
    </div>
  );
}

function findItemDate(bucket: ForecastBucket, item: AppliedDayItem): string | null {
  for (const d of bucket.days) {
    if (d.appliedItems.includes(item)) return d.date;
  }
  return null;
}
