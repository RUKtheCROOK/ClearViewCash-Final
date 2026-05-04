"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  deleteBill,
  getBillPayments,
  getTransactionsByRecurringGroup,
  upsertBill,
} from "@cvc/api-client";
import { displayMerchantName } from "@cvc/domain";
import type { Cadence } from "@cvc/types";

export interface EditableBill {
  id: string;
  space_id: string;
  owner_user_id: string;
  name: string;
  amount: number;
  cadence: Cadence;
  next_due_at: string;
  autopay: boolean;
  source: "detected" | "manual";
  recurring_group_id: string | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  paid_at: string;
  status: "paid" | "overdue" | "skipped";
  transaction_id: string | null;
}

interface MatchedTxn {
  id: string;
  merchant_name: string | null;
  display_name: string | null;
  amount: number;
  posted_at: string;
}

interface Props {
  client: SupabaseClient<Database>;
  bill: EditableBill | null;
  open: boolean;
  spaceId: string | null;
  ownerUserId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const CADENCES: Cadence[] = ["weekly", "biweekly", "monthly", "yearly", "custom"];

function dollarsToCents(s: string): number {
  if (!s.trim()) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return Number.NaN;
  return Math.round(n * 100);
}

function centsToDollarStr(c: number): string {
  return (c / 100).toFixed(2);
}

function dayOfMonth(iso: string): number {
  const m = iso.match(/^\d{4}-\d{2}-(\d{2})$/);
  if (!m) return 1;
  const day = Number(m[1]);
  if (!Number.isFinite(day) || day < 1 || day > 31) return 1;
  return day;
}

function isValidIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export function EditPanel({ client, bill, open, spaceId, ownerUserId, onClose, onSaved }: Props) {
  const isNew = !bill;
  const [name, setName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [nextDueAt, setNextDueAt] = useState("");
  const [autopay, setAutopay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [matched, setMatched] = useState<MatchedTxn[]>([]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (bill) {
      setName(bill.name);
      setAmountStr(centsToDollarStr(bill.amount));
      setCadence(bill.cadence);
      setNextDueAt(bill.next_due_at);
      setAutopay(bill.autopay);
    } else {
      setName("");
      setAmountStr("");
      setCadence("monthly");
      setNextDueAt("");
      setAutopay(false);
      setPayments([]);
      setMatched([]);
    }
  }, [open, bill]);

  useEffect(() => {
    if (!open || !bill) return;
    getBillPayments(client, bill.id).then((rows) => setPayments(rows as PaymentRow[]));
    if (bill.recurring_group_id) {
      getTransactionsByRecurringGroup(client, bill.recurring_group_id).then((rows) =>
        setMatched(rows as MatchedTxn[]),
      );
    } else {
      setMatched([]);
    }
  }, [open, bill, client]);

  if (!open) return null;

  async function save() {
    if (!spaceId || !ownerUserId) {
      setError("Switch to a space first.");
      return;
    }
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const cents = dollarsToCents(amountStr);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!isValidIsoDate(nextDueAt)) {
      setError("Date must be YYYY-MM-DD.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await upsertBill(client, {
        ...(bill ? { id: bill.id } : {}),
        space_id: spaceId,
        owner_user_id: ownerUserId,
        name: name.trim(),
        amount: cents,
        cadence,
        next_due_at: nextDueAt,
        autopay,
        due_day: dayOfMonth(nextDueAt),
        source: bill?.source ?? "manual",
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save bill.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!bill) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteBill(client, bill.id);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not delete bill.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={overlayStyle} />
      <aside style={panelStyle}>
        <h2 style={{ margin: 0, fontSize: 22, marginBottom: 16 }}>{isNew ? "Add bill" : "Edit bill"}</h2>

        <label className="muted" style={labelStyle}>Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Rent"
          style={inputStyle}
        />

        <label className="muted" style={{ ...labelStyle, marginTop: 16 }}>Amount (USD)</label>
        <input
          type="text"
          inputMode="decimal"
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          placeholder="0.00"
          style={inputStyle}
        />

        <label className="muted" style={{ ...labelStyle, marginTop: 16 }}>Next due date</label>
        <input
          type="date"
          value={nextDueAt}
          onChange={(e) => setNextDueAt(e.target.value)}
          style={inputStyle}
        />

        <label className="muted" style={{ ...labelStyle, marginTop: 16 }}>Cadence</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {CADENCES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCadence(c)}
              className={cadence === c ? "btn btn-primary" : "btn btn-secondary"}
              style={{ padding: "6px 12px", fontSize: 13 }}
            >
              {c}
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
          <span>Autopay</span>
          <input
            type="checkbox"
            checked={autopay}
            onChange={(e) => setAutopay(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
        </label>

        {!isNew && payments.length ? (
          <section style={{ marginTop: 24 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Payment history
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {payments.map((p) => (
                <li
                  key={p.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                >
                  <span>
                    {p.paid_at}
                    <span className="muted" style={{ marginLeft: 8 }}>
                      {p.status}
                      {p.transaction_id ? " · linked" : ""}
                    </span>
                  </span>
                  <span>{fmtMoney(p.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!isNew && matched.length ? (
          <section style={{ marginTop: 24 }}>
            <div className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Source transactions
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {matched.map((t) => (
                <li
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 13,
                  }}
                >
                  <span>
                    {displayMerchantName(t)}
                    <span className="muted" style={{ marginLeft: 8 }}>{t.posted_at}</span>
                  </span>
                  <span>{fmtMoney(t.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {error ? <p style={{ color: "var(--negative, #DC2626)", marginTop: 16 }}>{error}</p> : null}

        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={save}
            disabled={saving}
          >
            {saving ? "Saving…" : isNew ? "Create" : "Save"}
          </button>
        </div>

        {!isNew ? (
          <button
            type="button"
            onClick={remove}
            disabled={deleting}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid var(--negative, #DC2626)",
              background: "transparent",
              color: "var(--negative, #DC2626)",
              fontWeight: 600,
              width: "100%",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {deleting ? "Deleting…" : "Delete bill"}
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
  width: "min(100%, 460px)",
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
