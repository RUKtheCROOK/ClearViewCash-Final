"use client";
import { useState } from "react";
import type { Bill, Cadence, IncomeEvent } from "@cvc/types";
import type { WhatIfMutation } from "@cvc/domain";

const CADENCES: Array<{ key: Cadence; label: string }> = [
  { key: "custom", label: "Once" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Biweekly" },
  { key: "monthly", label: "Monthly" },
];

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function formatCadence(c: Cadence): string {
  return c === "custom" ? "Once" : c.charAt(0).toUpperCase() + c.slice(1);
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export interface WhatIfPanelProps {
  spaceId: string;
  ownerUserId: string;
  defaultFundingAccountId: string | null;
  mutations: WhatIfMutation[];
  onChange: (mutations: WhatIfMutation[]) => void;
  baselineLow: number;
  scenarioLow: number;
}

export function WhatIfPanel({
  spaceId,
  ownerUserId,
  defaultFundingAccountId,
  mutations,
  onChange,
  baselineLow,
  scenarioLow,
}: WhatIfPanelProps) {
  const [open, setOpen] = useState<"none" | "bill" | "income">("none");
  const delta = scenarioLow - baselineLow;

  const addBill = (b: Bill) => {
    onChange([...mutations, { addBill: b }]);
    setOpen("none");
  };
  const addIncome = (i: IncomeEvent) => {
    onChange([...mutations, { addIncome: i }]);
    setOpen("none");
  };
  const remove = (idx: number) => onChange(mutations.filter((_, i) => i !== idx));
  const clearAll = () => onChange([]);

  return (
    <section className="card" style={{ padding: 0 }}>
      <header style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>What-if scenarios</h2>
          <p className="muted" style={{ marginTop: 4, fontSize: 13 }}>
            Test how a future bill or income shifts your low point.
          </p>
        </div>
        {mutations.length > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            style={{ background: "none", border: "none", color: "var(--primary, #0EA5E9)", cursor: "pointer", fontSize: 13 }}
          >
            Clear all
          </button>
        ) : null}
      </header>

      {mutations.length > 0 ? (
        <div style={{ padding: "0 20px 16px", borderBottom: "1px solid var(--border, #E5E7EB)" }}>
          <div style={{ fontSize: 12, color: "var(--text-muted, #64748B)", marginBottom: 8 }}>
            Low-point change:{" "}
            <strong style={{ color: delta < 0 ? "var(--negative, #DC2626)" : "var(--positive, #16A34A)" }}>
              {delta >= 0 ? "+" : ""}
              {fmtMoney(delta)}
            </strong>
          </div>
          {mutations.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 0",
                borderTop: idx === 0 ? "none" : "1px solid var(--border, #E5E7EB)",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {m.addBill ? `Bill · ${m.addBill.name}` : m.addIncome ? `Income · ${m.addIncome.name}` : "Mutation"}
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {m.addBill
                    ? `${formatCadence(m.addBill.cadence)} · starts ${m.addBill.next_due_at}`
                    : m.addIncome
                      ? `${formatCadence(m.addIncome.cadence)} · starts ${m.addIncome.next_due_at}`
                      : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {m.addBill ? <span>{fmtMoney(-m.addBill.amount)}</span> : null}
                {m.addIncome ? <span>{fmtMoney(m.addIncome.amount)}</span> : null}
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--negative, #DC2626)" }}
                  aria-label="Remove scenario"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ padding: "16px 20px", display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => setOpen(open === "bill" ? "none" : "bill")}
          className="btn"
          style={{
            flex: 1,
            background: open === "bill" ? "var(--primary, #0EA5E9)" : "transparent",
            color: open === "bill" ? "white" : undefined,
            border: "1px solid var(--border, #E5E7EB)",
          }}
        >
          + Add bill
        </button>
        <button
          type="button"
          onClick={() => setOpen(open === "income" ? "none" : "income")}
          className="btn"
          style={{
            flex: 1,
            background: open === "income" ? "var(--positive, #16A34A)" : "transparent",
            color: open === "income" ? "white" : undefined,
            border: "1px solid var(--border, #E5E7EB)",
          }}
        >
          + Add income
        </button>
      </div>

      {open === "bill" ? (
        <ScenarioForm
          mode="bill"
          spaceId={spaceId}
          ownerUserId={ownerUserId}
          defaultFundingAccountId={defaultFundingAccountId}
          onSubmit={(v) => addBill(v as Bill)}
          onCancel={() => setOpen("none")}
        />
      ) : null}
      {open === "income" ? (
        <ScenarioForm
          mode="income"
          spaceId={spaceId}
          ownerUserId={ownerUserId}
          defaultFundingAccountId={defaultFundingAccountId}
          onSubmit={(v) => addIncome(v as IncomeEvent)}
          onCancel={() => setOpen("none")}
        />
      ) : null}
    </section>
  );
}

function ScenarioForm({
  mode,
  spaceId,
  ownerUserId,
  defaultFundingAccountId,
  onSubmit,
  onCancel,
}: {
  mode: "bill" | "income";
  spaceId: string;
  ownerUserId: string;
  defaultFundingAccountId: string | null;
  onSubmit: (v: Bill | IncomeEvent) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(mode === "bill" ? "Hypothetical bill" : "Hypothetical income");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayPlus(7));
  const [cadence, setCadence] = useState<Cadence>("custom");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount.replace(/[^\d.]/g, "")) * 100);
    if (!cents || cents <= 0) return;
    if (!isIsoDate(date)) return;
    const due = parseInt(date.slice(8, 10), 10);
    const dueDay = isNaN(due) ? 1 : Math.min(Math.max(due, 1), 31);
    const synthetic: Bill = {
      id: `whatif-${Date.now()}`,
      space_id: spaceId,
      owner_user_id: ownerUserId,
      name: name.trim() || (mode === "bill" ? "Bill" : "Income"),
      amount: cents,
      due_day: dueDay,
      cadence,
      next_due_at: date,
      autopay: false,
      linked_account_id: defaultFundingAccountId,
      source: "manual",
      recurring_group_id: null,
      category: null,
    };
    onSubmit(synthetic);
  };

  return (
    <form onSubmit={submit} style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Amount (USD)">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
          placeholder="0.00"
          style={inputStyle}
        />
      </Field>
      <Field label="Starts (YYYY-MM-DD)">
        <input value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
      </Field>
      <Field label="Cadence">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CADENCES.map((c) => {
            const active = c.key === cadence;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCadence(c.key)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: `1px solid ${active ? "var(--primary, #0EA5E9)" : "var(--border, #E5E7EB)"}`,
                  background: active ? "var(--primary, #0EA5E9)" : "transparent",
                  color: active ? "white" : undefined,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </Field>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button type="button" onClick={onCancel} className="btn" style={{ flex: 1, border: "1px solid var(--border, #E5E7EB)", background: "transparent" }}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{
            flex: 1,
            background: mode === "bill" ? "var(--primary, #0EA5E9)" : "var(--positive, #16A34A)",
            color: "white",
            border: "none",
          }}
        >
          Add
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: "var(--text-muted, #64748B)" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--border, #E5E7EB)",
  fontSize: 14,
  fontFamily: "inherit",
};
