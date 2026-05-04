"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  clearTransactionSplits,
  listSplitsForTransaction,
  upsertTransactionSplits,
} from "@cvc/api-client";

interface SplitRow {
  category: string;
  amountStr: string;
}

interface Props {
  client: SupabaseClient<Database>;
  visible: boolean;
  txnId: string | null;
  txnAmountCents: number;
  spaceId: string | null;
  defaultCategory: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function dollarsToCents(s: string): number {
  if (!s.trim()) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return Number.NaN;
  return Math.round(n * 100);
}

function centsToDollarStr(c: number): string {
  return (c / 100).toFixed(2);
}

export function SplitEditor({
  client,
  visible,
  txnId,
  txnAmountCents,
  spaceId,
  defaultCategory,
  onClose,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<SplitRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !txnId) return;
    setError(null);
    setLoading(true);
    listSplitsForTransaction(client, txnId)
      .then((existing) => {
        if (existing.length) {
          setRows(
            (existing as Array<{ category: string; amount: number }>).map((s) => ({
              category: s.category,
              amountStr: centsToDollarStr(s.amount),
            })),
          );
        } else {
          setRows([
            {
              category: defaultCategory ?? "",
              amountStr: centsToDollarStr(txnAmountCents),
            },
          ]);
        }
      })
      .finally(() => setLoading(false));
  }, [visible, txnId, txnAmountCents, defaultCategory, client]);

  if (!visible) return null;

  const sumCents = rows.reduce((acc, r) => acc + (dollarsToCents(r.amountStr) || 0), 0);
  const remainderCents = txnAmountCents - sumCents;
  const anyInvalid = rows.some((r) => Number.isNaN(dollarsToCents(r.amountStr)));
  const blank = rows.some((r) => !r.category.trim());
  const canSave = !saving && !anyInvalid && !blank && remainderCents === 0 && rows.length > 0;

  function update(idx: number, patch: Partial<SplitRow>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, { category: "", amountStr: centsToDollarStr(remainderCents) }]);
  }
  function removeRow(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!txnId || !spaceId) return;
    setSaving(true);
    setError(null);
    try {
      await upsertTransactionSplits(client, {
        transaction_id: txnId,
        space_id: spaceId,
        splits: rows.map((r) => ({
          category: r.category.trim(),
          amount: dollarsToCents(r.amountStr),
        })),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save splits.");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (!txnId) return;
    setSaving(true);
    setError(null);
    try {
      await clearTransactionSplits(client, txnId);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not clear splits.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={overlayStyle} />
      <aside style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Split transaction</h2>
          <span style={{ fontWeight: 600 }}>${(txnAmountCents / 100).toFixed(2)}</span>
        </div>

        {!spaceId ? (
          <p className="muted">Splits live on a space — switch to a space to split this transaction.</p>
        ) : null}

        {loading ? <p className="muted">Loading…</p> : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((r, idx) => (
            <div
              key={idx}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 12,
                background: "var(--surface)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  Split {idx + 1}
                </span>
                {rows.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--negative)",
                      cursor: "pointer",
                      fontSize: 13,
                      padding: 0,
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <input
                type="text"
                value={r.category}
                onChange={(e) => update(idx, { category: e.target.value })}
                placeholder="Category"
                style={inputStyle}
              />
              <input
                type="text"
                inputMode="decimal"
                value={r.amountStr}
                onChange={(e) => update(idx, { amountStr: e.target.value })}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRow}
          style={{
            marginTop: 10,
            padding: 12,
            borderRadius: 10,
            border: "1px dashed var(--border)",
            background: "transparent",
            cursor: "pointer",
            width: "100%",
            color: "var(--muted)",
          }}
        >
          + Add split
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <span className="muted">Remainder</span>
          <span
            style={{
              color: remainderCents === 0 ? "var(--positive)" : "var(--negative)",
              fontWeight: 600,
            }}
          >
            {remainderCents === 0 ? "$0.00 ✓" : `$${(remainderCents / 100).toFixed(2)}`}
          </span>
        </div>

        {error ? <p style={{ color: "var(--negative)", marginTop: 8 }}>{error}</p> : null}

        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={clear}
            disabled={saving}
          >
            Clear
          </button>
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
            disabled={!canSave}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </aside>
    </>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  zIndex: 60,
};

const panelStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  height: "100%",
  width: "min(100%, 460px)",
  background: "var(--surface)",
  borderLeft: "1px solid var(--border)",
  padding: 24,
  overflowY: "auto",
  zIndex: 61,
  boxShadow: "-8px 0 24px rgba(0,0,0,0.12)",
};

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "8px 10px",
  fontSize: 14,
  background: "var(--bg)",
  color: "var(--text)",
  width: "100%",
  fontFamily: "inherit",
};
