"use client";
import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { deleteBudget, upsertBudget } from "@cvc/api-client";
import { suggestBudgets, type CategorizedTxn } from "@cvc/domain";
import { BudgetCategoryIcon, resolveCategoryBranding } from "./_components/budgetGlyphs";
import { Num, fmtMoneyShort } from "./_components/Num";

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
  seedCategory?: string | null;
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
  seedCategory,
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
      setLimitDollars((budget.limit_amount / 100).toFixed(0));
      setPeriod(budget.period);
      setRollover(budget.rollover);
    } else {
      setCategory(seedCategory ?? "");
      setLimitDollars("");
      setPeriod("monthly");
      setRollover(false);
    }
    setError(null);
  }, [open, budget, seedCategory]);

  const branding = useMemo(() => resolveCategoryBranding(category || "Food & dining"), [category]);

  const suggestions = useMemo(() => {
    if (budget) return [];
    if (!recentTxns.length) return [];
    return suggestBudgets(recentTxns, new Set(existingCategories)).slice(0, 4);
  }, [budget, recentTxns, existingCategories]);

  const avgFromSuggest = useMemo(() => {
    if (!recentTxns) return null;
    const trimmed = category.trim();
    if (!trimmed) return null;
    let total = 0;
    let count = 0;
    for (const t of recentTxns) {
      if (t.amount >= 0) continue;
      if ((t.category ?? "") !== trimmed) continue;
      total += Math.abs(t.amount);
      count += 1;
    }
    if (count === 0) return null;
    return Math.round(total / 3);
  }, [recentTxns, category]);

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
        {/* Top nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "var(--bg-tinted)",
              border: 0,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <CloseIcon />
          </button>
          <div style={{ flex: 1, textAlign: "center", fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
            {budget ? "Edit budget" : "New budget"}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              padding: "7px 13px",
              borderRadius: 999,
              background: "var(--brand)",
              color: "var(--brand-on)",
              border: 0,
              cursor: saving ? "default" : "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: 12.5,
              fontWeight: 500,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {/* Hero */}
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <div style={{ display: "inline-block" }}>
            <BudgetCategoryIcon hue={branding.hue} glyph={branding.glyph} size={64} radius={16} />
          </div>
          <div
            style={{
              marginTop: 14,
              padding: "8px 14px",
              borderRadius: 12,
              background: "var(--bg-surface)",
              border: "1px solid var(--line-soft)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              maxWidth: 320,
              width: "100%",
            }}
          >
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Groceries"
              style={{
                flex: 1,
                border: 0,
                outline: 0,
                background: "transparent",
                textAlign: "center",
                fontFamily: "var(--font-ui)",
                fontSize: 16,
                fontWeight: 500,
                color: "var(--ink-1)",
              }}
            />
          </div>
        </div>

        {/* Suggestions */}
        {!budget && suggestions.length > 0 ? (
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 6,
              }}
            >
              Suggested
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {suggestions.map((s) => (
                <button
                  key={s.category}
                  type="button"
                  onClick={() => {
                    setCategory(s.category);
                    setLimitDollars((s.suggested_cents / 100).toFixed(0));
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 999,
                    background: "var(--bg-surface)",
                    border: "1px solid var(--line-soft)",
                    cursor: "pointer",
                    fontFamily: "var(--font-ui)",
                    fontSize: 12,
                    color: "var(--ink-2)",
                  }}
                >
                  {s.category} · <Num style={{ color: "var(--ink-2)", fontWeight: 500 }}>{fmtMoneyShort(s.suggested_cents)}</Num>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Limit */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-num)", fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.08em", fontWeight: 600 }}>
            {period === "monthly" ? "MONTHLY LIMIT" : "WEEKLY LIMIT"}
          </div>
          <div
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "baseline",
              gap: 4,
              padding: "12px 20px",
              borderRadius: 16,
              background: "var(--bg-surface)",
              border: "1.5px solid var(--brand)",
            }}
          >
            <span style={{ fontFamily: "var(--font-num)", fontSize: 22, color: "var(--ink-3)", fontWeight: 600 }}>$</span>
            <input
              type="text"
              inputMode="decimal"
              value={limitDollars}
              onChange={(e) => setLimitDollars(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="500"
              style={{
                width: 140,
                border: 0,
                outline: 0,
                background: "transparent",
                textAlign: "center",
                fontFamily: "var(--font-num)",
                fontSize: 36,
                fontWeight: 600,
                color: "var(--ink-1)",
                letterSpacing: "-0.02em",
              }}
            />
          </div>
          {avgFromSuggest != null ? (
            <div style={{ marginTop: 8, fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)" }}>
              Avg over last 3 months · <Num style={{ color: "var(--ink-2)", fontWeight: 500 }}>{fmtMoneyShort(avgFromSuggest)}</Num>
            </div>
          ) : null}
        </div>

        {/* Settings */}
        <div style={{ marginTop: 24 }}>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--ink-2)",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: 8,
              paddingLeft: 4,
            }}
          >
            Settings
          </div>
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--line-soft)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)" }}>
                  Rollover unspent
                </div>
                <div style={{ marginTop: 2, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)" }}>
                  Carry leftover into next month
                </div>
              </div>
              <Toggle on={rollover} onChange={setRollover} />
            </div>
            <div style={{ height: 1, background: "var(--line-soft)" }} />
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, fontWeight: 500, color: "var(--ink-1)" }}>
                  Period
                </div>
              </div>
              <div style={{ display: "flex", borderRadius: 999, background: "var(--bg-tinted)", padding: 2 }}>
                {(["monthly", "weekly"] as BudgetPeriod[]).map((p) => {
                  const active = period === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 999,
                        border: 0,
                        cursor: "pointer",
                        background: active ? "var(--bg-surface)" : "transparent",
                        fontFamily: "var(--font-ui)",
                        fontSize: 12,
                        fontWeight: 500,
                        color: active ? "var(--ink-1)" : "var(--ink-3)",
                      }}
                    >
                      {p === "monthly" ? "Monthly" : "Weekly"}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Rollover explainer */}
        {rollover ? (
          <div
            style={{
              marginTop: 14,
              padding: "12px 14px",
              borderRadius: 12,
              background: "var(--brand-tint)",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                background: "var(--bg-surface)",
                color: "var(--brand)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <RolloverIcon />
            </span>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-2)", lineHeight: 1.55 }}>
              <span style={{ color: "var(--ink-1)", fontWeight: 500 }}>How rollover works.</span> Spend less than your
              limit? The leftover is added to next month. Go over? Nothing carries — your next month stays at the same
              limit.
            </div>
          </div>
        ) : null}

        {error ? <p style={{ color: "var(--warn)", marginTop: 12, fontFamily: "var(--font-ui)", fontSize: 13 }}>{error}</p> : null}

        {budget ? (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            style={{
              marginTop: 18,
              width: "100%",
              height: 48,
              borderRadius: 12,
              border: "1px solid var(--line-firm)",
              background: "transparent",
              color: "var(--warn)",
              cursor: deleting ? "default" : "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              fontWeight: 500,
              opacity: deleting ? 0.6 : 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <TrashIcon /> {deleting ? "Removing…" : "Remove this category"}
          </button>
        ) : null}
      </aside>
    </>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        width: 38,
        height: 22,
        borderRadius: 999,
        background: on ? "var(--brand)" : "var(--line-firm)",
        position: "relative",
        flexShrink: 0,
        border: 0,
        cursor: "pointer",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: "var(--bg-surface)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          transition: "left 120ms ease",
        }}
      />
    </button>
  );
}

function CloseIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function RolloverIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12c0-5 4-9 9-9s9 4 9 9" />
      <path d="M21 12v6h-6" />
      <path d="M21 12a9 9 0 01-9 9" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
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
  width: "min(100%, 460px)",
  background: "var(--bg-canvas)",
  borderLeft: "1px solid var(--line-soft)",
  padding: 20,
  overflowY: "auto",
  zIndex: 51,
  boxShadow: "-8px 0 24px rgba(0,0,0,0.08)",
};
