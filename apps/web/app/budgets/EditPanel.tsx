"use client";
import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { deleteBudget, upsertBudget } from "@cvc/api-client";
import { suggestBudgets, type CategorizedTxn } from "@cvc/domain";

export type BudgetPeriod = "monthly" | "weekly";

export interface EditableBudget {
  id: string;
  category: string;
  limit_amount: number;
  period: BudgetPeriod;
  rollover: boolean;
}

interface Props {
  client: SupabaseClient<Database>;
  open: boolean;
  spaceId: string | null;
  budget: EditableBudget | null;
  recentTxns: ReadonlyArray<CategorizedTxn>;
  existingCategories: ReadonlyArray<string>;
  onClose: () => void;
  onSaved: () => void;
}

export function EditPanel({
  client,
  open,
  spaceId,
  budget,
  recentTxns,
  existingCategories,
  onClose,
  onSaved,
}: Props) {
  const [category, setCategory] = useState("");
  const [limitDollars, setLimitDollars] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [rollover, setRollover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (budget) {
      setCategory(budget.category);
      setLimitDollars((budget.limit_amount / 100).toFixed(2));
      setPeriod(budget.period);
      setRollover(budget.rollover);
    } else {
      setCategory("");
      setLimitDollars("");
      setPeriod("monthly");
      setRollover(false);
    }
    setError(null);
  }, [open, budget]);

  const suggestions = useMemo(() => {
    if (budget) return [];
    if (!recentTxns.length) return [];
    return suggestBudgets(recentTxns, new Set(existingCategories));
  }, [budget, recentTxns, existingCategories]);

  if (!open) return null;

  async function save() {
    if (!spaceId) {
      setError("Switch to a space first.");
      return;
    }
    const trimmed = category.trim();
    if (!trimmed) {
      setError("Category is required.");
      return;
    }
    const dollars = parseFloat(limitDollars);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter a positive dollar amount.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await upsertBudget(client, {
        ...(budget ? { id: budget.id } : {}),
        space_id: spaceId,
        category: trimmed,
        limit_amount: Math.round(dollars * 100),
        period,
        rollover,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save budget.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!budget) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteBudget(client, budget.id);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not delete budget.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={overlayStyle} />
      <aside style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 22 }}>{budget ? "Edit budget" : "New budget"}</h2>
        </div>

        {suggestions.length > 0 ? (
          <>
            <label className="muted" style={labelStyle}>
              Suggested from your spending
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {suggestions.map((s) => (
                <button
                  key={s.category}
                  type="button"
                  onClick={() => {
                    setCategory(s.category);
                    setLimitDollars((s.suggested_cents / 100).toFixed(2));
                  }}
                  className="btn btn-secondary"
                  style={{ padding: "6px 12px", fontSize: 12 }}
                >
                  {s.category} · ${(s.suggested_cents / 100).toFixed(0)}/mo
                </button>
              ))}
            </div>
          </>
        ) : null}

        <label className="muted" style={labelStyle}>
          Category
        </label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. groceries"
          style={inputStyle}
        />

        <label className="muted" style={{ ...labelStyle, marginTop: 16 }}>
          Monthly limit (USD)
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={limitDollars}
          onChange={(e) => setLimitDollars(e.target.value)}
          placeholder="500.00"
          style={inputStyle}
        />

        <label className="muted" style={{ ...labelStyle, marginTop: 16 }}>
          Period
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {(["monthly", "weekly"] as BudgetPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={period === p ? "btn btn-primary" : "btn btn-secondary"}
              style={{ flex: 1, padding: "8px 14px", fontSize: 14 }}
            >
              {p === "monthly" ? "Monthly" : "Weekly"}
            </button>
          ))}
        </div>

        <label
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            cursor: "pointer",
          }}
        >
          <span>
            Roll over unused
            <div className="muted" style={{ fontSize: 12 }}>
              Carry leftover budget into next month.
            </div>
          </span>
          <input
            type="checkbox"
            checked={rollover}
            onChange={(e) => setRollover(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
        </label>

        {error ? <p style={{ color: "var(--negative)", marginTop: 12 }}>{error}</p> : null}

        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {budget ? (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            style={{
              marginTop: 16,
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--negative)",
              background: "transparent",
              color: "var(--negative)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {deleting ? "Deleting…" : "Delete budget"}
          </button>
        ) : null}
      </aside>
    </>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  zIndex: 50,
};

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  height: "100%",
  width: "min(100%, 420px)",
  background: "var(--surface)",
  borderLeft: "1px solid var(--border)",
  padding: 24,
  overflowY: "auto",
  zIndex: 51,
  boxShadow: "-8px 0 24px rgba(0,0,0,0.08)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 15,
  background: "var(--surface)",
  color: "var(--text)",
  width: "100%",
  fontFamily: "inherit",
};
