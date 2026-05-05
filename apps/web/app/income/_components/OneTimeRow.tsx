"use client";

import { Num, fmtMoneyDollars } from "./Num";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export interface OneTimeRowData {
  id: string;
  name: string;
  amount: number;
  date: string;
  accountLabel: string | null;
  received: boolean;
}

interface Props {
  item: OneTimeRowData;
  isLast: boolean;
  onClick: () => void;
}

export function OneTimeRow({ item, isLast, onClick }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 10,
        alignItems: "center",
        padding: "12px 18px",
        borderBottom: isLast ? "none" : "1px solid var(--line-soft)",
        cursor: "pointer",
      }}
    >
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>{item.name}</div>
        <div style={{ marginTop: 2, fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)" }}>
          {dateLabel(item.date)}
          {item.accountLabel ? ` · ${item.accountLabel}` : ""}
          {!item.received ? " · expected" : ""}
        </div>
      </div>
      <Num style={{ fontSize: 14, fontWeight: 600, color: item.received ? "var(--pos)" : "var(--ink-2)" }}>
        {item.received ? "+" : ""}
        {fmtMoneyDollars(item.amount)}
      </Num>
    </div>
  );
}
