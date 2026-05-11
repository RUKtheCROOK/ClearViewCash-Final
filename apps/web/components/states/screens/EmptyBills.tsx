"use client";

import { EmptyScaffold } from "../EmptyScaffold";
import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";
import { IlloCalendar } from "../illustrations";

interface Props {
  onScan?: () => void;
  onAddManually?: () => void;
}

export function EmptyBills({ onScan, onAddManually }: Props) {
  return (
    <StateScreen>
      <StateHeader title="Bills" sub="0 tracked" space={{ name: "Personal", hue: 195 }} />
      <EmptyScaffold
        illo={<IlloCalendar accent="var(--warn)" />}
        accent="warn"
        eyebrow="WE'LL FIND THEM FOR YOU"
        title="Let us spot the bills you're already paying"
        body="We scan your transactions for recurring charges — rent, utilities, subscriptions — and suggest them as bills you can confirm."
        primary={{ label: "Scan my transactions", onPress: onScan }}
        secondary={{ label: "Add a bill manually", onPress: onAddManually }}
      />
      <div style={{ padding: "4px 16px 0" }}>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
          }}
        >
          <StateMono style={{ fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
            WE LOOK FOR
          </StateMono>
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["Rent / mortgage", "Utilities", "Streaming", "Insurance", "Phone", "Subscriptions"].map((x) => (
              <span
                key={x}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "var(--bg-tinted)",
                  color: "var(--ink-2)",
                  fontFamily: "var(--font-ui)",
                  fontSize: 11.5,
                }}
              >
                {x}
              </span>
            ))}
          </div>
        </div>
      </div>
    </StateScreen>
  );
}
