"use client";

import type { ForecastDay } from "@cvc/domain";
import { Num } from "../../components/money";
import { I } from "../../lib/icons";

interface ScheduledEvent {
  date: string;
  kind: "bill" | "income" | "estimated_card_spend";
  source: string;
  name: string;
  amount: number;
  accountId: string | null;
  cadence?: string | null;
  note?: string | null;
  refId: string;
}

function collectScheduledEvents(days: ForecastDay[]): ScheduledEvent[] {
  const events: ScheduledEvent[] = [];
  for (const day of days) {
    for (const item of day.appliedItems) {
      if (item.source !== "scheduled") continue;
      events.push({
        date: day.date,
        kind: item.kind,
        source: item.source,
        name: item.name,
        amount: item.amount,
        accountId: item.accountId ?? null,
        cadence: item.cadence ?? null,
        note: item.note ?? null,
        refId: item.refId ?? `${day.date}-${item.name}`,
      });
    }
  }
  return events;
}

function fmtAmount(cents: number): string {
  const sign = cents < 0 ? "−$" : "+$";
  return `${sign}${Math.abs(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseDateParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return { mon: "", num: 0, day: "" };
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    mon: dt.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
    num: d,
    day: dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
  };
}

export function EventsList({
  days,
  accountsById,
  whatIfRefIds,
  rangeLabel,
}: {
  days: ForecastDay[];
  accountsById: Record<string, string>;
  whatIfRefIds: Set<string>;
  rangeLabel: string;
}) {
  const events = collectScheduledEvents(days);
  if (events.length === 0) return null;

  return (
    <div>
      <div
        style={{
          padding: "18px 16px 6px",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-ui)",
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--ink-2)",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          Upcoming · {rangeLabel}
        </span>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)" }}>
          {events.length} events
        </span>
      </div>
      <div
        style={{
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--line-soft)",
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        {events.map((e, i) => (
          <EventRow
            key={`${e.refId}-${e.date}-${i}`}
            event={e}
            accountsById={accountsById}
            isWhatIf={whatIfRefIds.has(e.refId)}
            isLast={i === events.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function EventRow({
  event: e,
  accountsById,
  isWhatIf,
  isLast,
}: {
  event: ScheduledEvent;
  accountsById: Record<string, string>;
  isWhatIf: boolean;
  isLast: boolean;
}) {
  const isIncome = e.amount > 0;
  const isCard = e.kind === "estimated_card_spend";
  const dateParts = parseDateParts(e.date);
  const accountName = e.accountId ? accountsById[e.accountId] ?? null : null;

  const iconColor = isCard ? "var(--brand)" : isIncome ? "var(--pos)" : "var(--ink-2)";
  const iconBg = isCard ? "var(--brand-tint)" : isIncome ? "var(--pos-tint)" : "var(--bg-tinted)";

  const meta: string[] = [];
  if (accountName) meta.push(accountName);
  if (e.cadence && e.cadence !== "custom" && e.cadence !== "once") meta.push("recurring");
  if (e.note) meta.push(e.note);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto auto 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "12px 16px",
        borderBottom: isLast ? "none" : "1px solid var(--line-soft)",
        background: isWhatIf ? "var(--brand-tint)" : "transparent",
        ...(isWhatIf ? { borderLeft: "2px solid var(--brand)" } : {}),
      }}
    >
      {/* Date block */}
      <div
        style={{
          width: 40,
          padding: "4px 0",
          textAlign: "center",
          background: "var(--bg-sunken)",
          borderRadius: 8,
          fontFamily: "var(--font-ui)",
        }}
      >
        <div style={{ fontSize: 8.5, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
          {dateParts.mon}
        </div>
        <Num style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-1)", lineHeight: 1 }}>
          {dateParts.num}
        </Num>
        <div style={{ fontSize: 8.5, color: "var(--ink-4)", letterSpacing: "0.06em" }}>
          {dateParts.day}
        </div>
      </div>

      {/* Type icon */}
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: iconBg,
          color: iconColor,
          display: "grid",
          placeItems: "center",
        }}
      >
        {isCard
          ? I.card({ color: iconColor, size: 14 })
          : isIncome
            ? I.arrowUp({ color: iconColor, size: 14 })
            : I.bolt({ color: iconColor, size: 14 })}
      </span>

      {/* Label + metadata */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 500,
              color: "var(--ink-1)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {e.name}
          </span>
          {isWhatIf && (
            <span
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 9,
                color: "var(--brand)",
                background: "var(--brand-tint)",
                padding: "1px 5px",
                borderRadius: 999,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              what-if
            </span>
          )}
        </div>
        {meta.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 2,
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              color: "var(--ink-3)",
            }}
          >
            {meta.map((m, idx) => (
              <span key={idx} style={{ display: "inline-flex", alignItems: "center" }}>
                {idx > 0 && (
                  <span
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: 999,
                      background: "var(--ink-4)",
                      margin: "0 6px",
                    }}
                  />
                )}
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Amount */}
      <Num
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: isWhatIf ? "var(--brand)" : isIncome ? "var(--pos)" : "var(--ink-1)",
        }}
      >
        {fmtAmount(e.amount)}
      </Num>
    </div>
  );
}
