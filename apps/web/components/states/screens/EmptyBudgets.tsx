"use client";

import { EmptyScaffold } from "../EmptyScaffold";
import { StateHeader } from "../StateHeader";
import { StateMono } from "../StateMono";
import { StateScreen } from "../StateScreen";
import { IlloPieEmpty } from "../illustrations";

interface Props {
  onUseAverages?: () => void;
  onBuildFromScratch?: () => void;
  topCategories?: Array<{ category: string; amount: string; hue: number }>;
  monthLabel?: string;
}

const DEFAULT_TOP = [
  { category: "Groceries", amount: "612", hue: 155 },
  { category: "Dining", amount: "384", hue: 35 },
  { category: "Transport", amount: "186", hue: 240 },
];

export function EmptyBudgets({
  onUseAverages,
  onBuildFromScratch,
  topCategories = DEFAULT_TOP,
  monthLabel,
}: Props) {
  return (
    <StateScreen>
      <StateHeader
        title="Budgets"
        sub={monthLabel ? `No budgets yet · ${monthLabel}` : "No budgets yet"}
        space={{ name: "Personal", hue: 195 }}
      />
      <EmptyScaffold
        illo={<IlloPieEmpty />}
        eyebrow="START WHERE YOU ALREADY ARE"
        title="Budget by what you actually spend"
        body="We've crunched the last 3 months. Tap to use your real averages as starting caps — adjust later."
        primary={{ label: "Use my 3-month averages", onPress: onUseAverages }}
        secondary={{ label: "Build a budget from scratch", onPress: onBuildFromScratch }}
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
            YOUR TOP 3 LAST MONTH
          </StateMono>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {topCategories.map((x) => (
              <div
                key={x.category}
                style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center" }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 999, background: `oklch(60% 0.105 ${x.hue})` }} />
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-1)" }}>{x.category}</span>
                <StateMono style={{ fontSize: 13, color: "var(--ink-1)", fontWeight: 500 }}>${x.amount}</StateMono>
              </div>
            ))}
          </div>
        </div>
      </div>
    </StateScreen>
  );
}
