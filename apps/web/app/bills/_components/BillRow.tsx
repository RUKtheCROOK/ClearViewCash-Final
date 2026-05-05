"use client";

import { resolveBillBranding, formatBillDateLabel, daysLate, type BillBucket } from "@cvc/domain";
import { BillIcon } from "./glyphs";
import { Num, fmtMoneyDollars } from "./Num";

export interface BillRowData {
  id: string;
  name: string;
  amount: number;
  next_due_at: string;
  cadence: string;
  autopay: boolean;
  category: string | null;
  payee_hue: number | null;
  payee_glyph: string | null;
  source: "manual" | "detected";
  recurring_group_id: string | null;
  latest_payment: { paid_at: string; amount: number } | null;
}

interface Props {
  bill: BillRowData;
  bucket: BillBucket;
  todayIso: string;
  accountLabel: string | null;
  onClick: () => void;
  onMarkPaid?: (e: React.MouseEvent) => void;
  paying?: boolean;
}

export function BillRow({ bill, bucket, todayIso, accountLabel, onClick, onMarkPaid, paying }: Props) {
  const branding = resolveBillBranding(bill);
  const dim = bucket === "paid";
  const amountColor = dim ? "var(--ink-3)" : "var(--ink-1)";
  const dateLabel = formatBillDateLabel(bill, todayIso);
  const isRecurring = bill.cadence !== "once" && bill.cadence !== "custom";
  const lateBy = bucket === "overdue" ? daysLate(bill.next_due_at, todayIso) : 0;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "12px 18px",
        background: "transparent",
        borderBottom: "1px solid var(--line-faint, var(--line-soft))",
        cursor: "pointer",
        opacity: dim ? 0.7 : 1,
      }}
    >
      <BillIcon hue={branding.hue} glyph={branding.glyph} dim={dim} />

      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 14.5,
              fontWeight: 500,
              color: "var(--ink-1)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {bill.name}
          </span>
          {isRecurring ? (
            <RecurIcon color="var(--ink-3)" />
          ) : null}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 3,
            color: "var(--ink-3)",
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            flexWrap: "wrap",
          }}
        >
          <span>{dateLabel}</span>
          {accountLabel ? (
            <>
              <Dot />
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <CardIcon color="var(--ink-3)" />
                {accountLabel}
              </span>
            </>
          ) : null}
        </div>
      </div>

      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <Num style={{ fontSize: 14.5, fontWeight: 600, color: amountColor }}>
          {dim ? "−" : ""}{fmtMoneyDollars(bill.amount)}
        </Num>
        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
          {bucket === "overdue" ? (
            <Badge kind="warn">
              <WarnIcon color="var(--warn)" /> {lateBy}D LATE
            </Badge>
          ) : null}
          {bill.autopay && bucket !== "paid" ? (
            <Badge kind="brand">
              <BoltIcon color="var(--brand)" /> AUTO
            </Badge>
          ) : null}
          {bucket === "paid" ? (
            <Badge kind="pos">
              <CheckIcon color="var(--pos)" /> PAID
            </Badge>
          ) : null}
        </div>
        {onMarkPaid && bucket !== "paid" ? (
          <button
            type="button"
            disabled={paying}
            onClick={(e) => {
              e.stopPropagation();
              onMarkPaid(e);
            }}
            style={{
              marginTop: 4,
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid var(--line-firm)",
              background: "var(--bg-surface)",
              color: "var(--ink-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              fontWeight: 500,
              cursor: paying ? "wait" : "pointer",
            }}
          >
            {paying ? "Saving…" : "Mark paid"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Badge({ kind, children }: { kind: "warn" | "brand" | "pos"; children: React.ReactNode }) {
  const bg = kind === "warn" ? "var(--warn-tint)" : kind === "brand" ? "var(--brand-tint)" : "var(--pos-tint)";
  const fg = kind === "warn" ? "var(--warn)" : kind === "brand" ? "var(--brand)" : "var(--pos)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        padding: "2px 7px",
        borderRadius: 999,
        background: bg,
        color: fg,
        fontFamily: "var(--font-num)",
        fontSize: 9.5,
        letterSpacing: "0.05em",
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

function Dot() {
  return <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--ink-4)", display: "inline-block" }} />;
}

function RecurIcon({ color }: { color: string }) {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 11-3-6.7" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

function CardIcon({ color }: { color: string }) {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 11h18" />
    </svg>
  );
}

function WarnIcon({ color }: { color: string }) {
  return (
    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4l10 17H2L12 4z" />
      <path d="M12 10v5M12 18.5v.5" />
    </svg>
  );
}

function BoltIcon({ color }: { color: string }) {
  return (
    <svg width={10} height={10} viewBox="0 0 24 24" fill={color}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}
