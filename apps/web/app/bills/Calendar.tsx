"use client";
import { useMemo, useState } from "react";
import { computeBillStatus, type BillCycleStatus } from "@cvc/domain";

interface CalendarBill {
  id: string;
  next_due_at: string;
}

interface Props {
  bills: CalendarBill[];
  todayIso: string;
  selectedIso: string | null;
  onSelectDay: (iso: string | null) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_RANK: Record<BillCycleStatus, number> = {
  overdue: 3,
  due_soon: 2,
  upcoming: 1,
};

const STATUS_COLOR: Record<BillCycleStatus, string> = {
  overdue: "var(--negative, #DC2626)",
  due_soon: "var(--warning, #F59E0B)",
  upcoming: "var(--positive, #16A34A)",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoForCell(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export function Calendar({ bills, todayIso, selectedIso, onSelectDay }: Props) {
  const [year, setYear] = useState<number>(() => Number(todayIso.slice(0, 4)));
  const [month, setMonth] = useState<number>(() => Number(todayIso.slice(5, 7)) - 1);

  const billsByDay = useMemo(() => {
    const map = new Map<string, CalendarBill[]>();
    for (const b of bills) {
      const list = map.get(b.next_due_at) ?? [];
      list.push(b);
      map.set(b.next_due_at, list);
    }
    return map;
  }, [bills]);

  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ iso: string; day: number; inMonth: boolean }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ iso: "", day: 0, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: isoForCell(year, month, d), day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push({ iso: "", day: 0, inMonth: false });

  function step(delta: number) {
    let nextMonth = month + delta;
    let nextYear = year;
    while (nextMonth < 0) {
      nextMonth += 12;
      nextYear -= 1;
    }
    while (nextMonth > 11) {
      nextMonth -= 12;
      nextYear += 1;
    }
    setMonth(nextMonth);
    setYear(nextYear);
    onSelectDay(null);
  }

  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button className="btn btn-secondary" style={{ padding: "6px 12px" }} onClick={() => step(-1)}>
          ‹
        </button>
        <strong>{monthLabel}</strong>
        <button className="btn btn-secondary" style={{ padding: "6px 12px" }} onClick={() => step(1)}>
          ›
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="muted" style={{ fontSize: 11, textAlign: "center", textTransform: "uppercase" }}>
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          const dayBills = c.inMonth ? billsByDay.get(c.iso) ?? [] : [];
          let worst: BillCycleStatus | null = null;
          for (const b of dayBills) {
            const s = computeBillStatus(b.next_due_at, todayIso);
            if (!worst || STATUS_RANK[s] > STATUS_RANK[worst]) worst = s;
          }
          const isToday = c.iso === todayIso;
          const isSelected = c.iso && c.iso === selectedIso;
          return (
            <button
              key={i}
              type="button"
              disabled={!c.inMonth}
              onClick={() => c.inMonth && onSelectDay(c.iso === selectedIso ? null : c.iso)}
              style={{
                aspectRatio: "1",
                background: c.inMonth ? "var(--surface)" : "transparent",
                border: isSelected
                  ? "2px solid var(--primary, #0EA5E9)"
                  : isToday
                    ? "1px solid var(--text)"
                    : "1px solid var(--border)",
                borderRadius: 6,
                padding: 4,
                cursor: c.inMonth ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: "inherit",
                color: "var(--text)",
              }}
            >
              {c.inMonth ? (
                <>
                  <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 400 }}>{c.day}</span>
                  {worst ? (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: STATUS_COLOR[worst],
                      }}
                    />
                  ) : (
                    <span style={{ width: 8, height: 8 }} />
                  )}
                </>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
