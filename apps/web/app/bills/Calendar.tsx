"use client";

import { useMemo, useState } from "react";

export interface CalendarBill {
  id: string;
  next_due_at: string;
  amount: number;
  autopay: boolean;
  isOverdue: boolean;
}

interface Props {
  bills: CalendarBill[];
  todayIso: string;
  selectedIso: string | null;
  onSelectDay: (iso: string | null) => void;
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function isoFor(year: number, month0: number, day: number): string {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}

interface DayInfo {
  dotColor: string | null;
  count: number;
}

function dotForDay(bills: CalendarBill[]): DayInfo {
  if (bills.length === 0) return { dotColor: null, count: 0 };
  const hasOverdue = bills.some((b) => b.isOverdue);
  const hasManual = bills.some((b) => !b.autopay && !b.isOverdue);
  let dotColor = "var(--brand)";
  if (hasOverdue) dotColor = "var(--warn)";
  else if (hasManual) dotColor = "var(--ink-1)";
  return { dotColor, count: bills.length };
}

export function Calendar({ bills, todayIso, selectedIso, onSelectDay }: Props) {
  const [view, setView] = useState(() => {
    const today = new Date(`${todayIso}T00:00:00`);
    return { year: today.getFullYear(), month0: today.getMonth() };
  });

  const billsByDay = useMemo(() => {
    const map = new Map<string, CalendarBill[]>();
    for (const b of bills) {
      const arr = map.get(b.next_due_at) ?? [];
      arr.push(b);
      map.set(b.next_due_at, arr);
    }
    return map;
  }, [bills]);

  const monthStartOffset = new Date(view.year, view.month0, 1).getDay();
  const daysInMonth = new Date(view.year, view.month0 + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < monthStartOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function shift(delta: number) {
    setView((v) => {
      let m0 = v.month0 + delta;
      let y = v.year;
      while (m0 < 0) { m0 += 12; y -= 1; }
      while (m0 > 11) { m0 -= 12; y += 1; }
      return { year: y, month0: m0 };
    });
  }

  return (
    <div
      style={{
        margin: "0 16px",
        padding: 14,
        borderRadius: 16,
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <button type="button" onClick={() => shift(-1)} style={navBtn} aria-label="Previous month">
          <ChevLeft />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 16, fontWeight: 500, color: "var(--ink-1)" }}>
            {MONTHS[view.month0]} {view.year}
          </div>
        </div>
        <button type="button" onClick={() => shift(1)} style={navBtn} aria-label="Next month">
          <ChevRight />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
        {DOW.map((d, i) => (
          <div
            key={i}
            style={{ textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 10.5, color: "var(--ink-3)", fontWeight: 500 }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} style={{ height: 44 }} />;
          const iso = isoFor(view.year, view.month0, d);
          const dayBills = billsByDay.get(iso) ?? [];
          const { dotColor, count } = dotForDay(dayBills);
          const isToday = iso === todayIso;
          const isSelected = iso === selectedIso;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectDay(isSelected ? null : iso)}
              style={{
                appearance: "none",
                border: 0,
                cursor: "pointer",
                padding: 0,
                height: 44,
                position: "relative",
                background: "transparent",
              }}
            >
              <div
                style={{
                  margin: "2px auto 0",
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: isSelected ? "var(--brand)" : isToday ? "var(--brand-tint)" : "transparent",
                  color: isSelected ? "var(--brand-on)" : isToday ? "var(--brand)" : "var(--ink-1)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  fontWeight: isToday || isSelected ? 600 : 400,
                }}
              >
                {d}
              </div>
              {count > 0 && dotColor ? (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 2,
                    transform: "translateX(-50%)",
                    display: "flex",
                    gap: 2,
                  }}
                >
                  {Array.from({ length: Math.min(3, count) }).map((_, k) => (
                    <span
                      key={k}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 999,
                        background: dotColor,
                        opacity: isSelected ? 0.9 : 1,
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid var(--line-faint, var(--line-soft))",
          fontFamily: "var(--font-ui)",
          fontSize: 10.5,
          color: "var(--ink-3)",
          flexWrap: "wrap",
        }}
      >
        <LegendDot color="var(--brand)" label="Autopay" />
        <LegendDot color="var(--ink-1)" label="Manual" />
        <LegendDot color="var(--warn)" label="Overdue" />
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ display: "inline-flex", gap: 1.5 }}>
            <DotMicro /> <DotMicro /> <DotMicro />
          </span>
          <span>= 3+ bills</span>
        </span>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 999,
  background: "var(--bg-tinted)",
  border: 0,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  color: "var(--ink-2)",
};

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: color }} />
      {label}
    </span>
  );
}

function DotMicro() {
  return <span style={{ width: 3, height: 3, borderRadius: 999, background: "var(--ink-3)" }} />;
}

function ChevLeft() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function ChevRight() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
