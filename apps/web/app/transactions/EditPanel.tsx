"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  renameVendor,
  setTransactionDisplayName,
  setTransactionNote,
  setTransactionRecurring,
  setTransactionShare,
  updateTransactionCategory,
} from "@cvc/api-client";
import { displayMerchantName, type Category } from "@cvc/domain";
import { CategoryPicker } from "../../components/CategoryPicker";
import { SplitEditor } from "./SplitEditor";

export interface EditableTxn {
  id: string;
  merchant_name: string | null;
  display_name: string | null;
  amount: number;
  posted_at: string;
  category: string | null;
  category_id?: string | null;
  pending: boolean;
  is_recurring: boolean;
  account_id: string;
  owner_user_id: string;
  note: string | null;
}

interface Props {
  client: SupabaseClient<Database>;
  txn: EditableTxn | null;
  spaceId: string | null;
  sharedView: boolean;
  hiddenInSpace: boolean;
  categorySuggestions: string[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
  onCategoryCreated?: (c: Category) => void;
}

export function EditPanel({
  client,
  txn,
  spaceId,
  sharedView,
  hiddenInSpace,
  categorySuggestions,
  categories,
  onClose,
  onSaved,
  onCategoryCreated,
}: Props) {
  const [name, setName] = useState("");
  const [applyToVendor, setApplyToVendor] = useState(false);
  const [category, setCategory] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);

  useEffect(() => {
    if (!txn) return;
    setName(displayMerchantName(txn));
    setApplyToVendor(false);
    setCategory(txn.category ?? "");
    setCategoryId(txn.category_id ?? null);
    setNote(txn.note ?? "");
    setRecurring(txn.is_recurring);
    setHidden(hiddenInSpace);
    setError(null);
  }, [txn, hiddenInSpace]);

  if (!txn) return null;

  function fmtMoney(cents: number): string {
    const sign = cents < 0 ? "-" : "";
    const abs = Math.abs(cents) / 100;
    return `${sign}$${abs.toFixed(2)}`;
  }

  async function save() {
    if (!txn) return;
    setSaving(true);
    setError(null);
    try {
      const trimmedName = name.trim();
      const currentDisplay = displayMerchantName(txn);
      // null means "revert to plaid merchant_name"; only persist when the user
      // typed something different from what's currently shown.
      if (trimmedName !== currentDisplay) {
        const next = trimmedName.length && trimmedName !== (txn.merchant_name ?? "") ? trimmedName : null;
        if (applyToVendor && txn.merchant_name) {
          await renameVendor(client, { merchant_name: txn.merchant_name, display_name: next });
        } else {
          await setTransactionDisplayName(client, { id: txn.id, display_name: next });
        }
      }
      const trimmedCategory = category.trim();
      const newCategory = trimmedCategory.length ? trimmedCategory : null;
      const idChanged = categoryId !== (txn.category_id ?? null);
      const nameChanged = newCategory !== (txn.category ?? null);
      if (idChanged || nameChanged) {
        await updateTransactionCategory(client, {
          id: txn.id,
          category: newCategory,
          category_id: categoryId,
        });
      }
      const trimmedNote = note.trim();
      const newNote = trimmedNote.length ? trimmedNote : null;
      if (newNote !== (txn.note ?? null)) {
        await setTransactionNote(client, { id: txn.id, note: newNote });
      }
      if (recurring !== txn.is_recurring) {
        await setTransactionRecurring(client, { id: txn.id, is_recurring: recurring });
      }
      if (sharedView && spaceId && hidden !== hiddenInSpace) {
        await setTransactionShare(client, {
          transaction_id: txn.id,
          space_id: spaceId,
          hidden,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={overlayStyle} />
      <aside style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{displayMerchantName(txn)}</h2>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {txn.posted_at}
              {txn.pending ? " · pending" : ""}
            </div>
          </div>
          <div style={{ fontWeight: 600, color: txn.amount > 0 ? "var(--positive)" : "var(--text)" }}>
            {fmtMoney(txn.amount)}
          </div>
        </div>

        <label className="muted" style={labelStyle}>
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={txn.merchant_name ?? "Transaction name"}
          style={inputStyle}
        />
        {txn.merchant_name ? (
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginTop: 8,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={applyToVendor}
              onChange={(e) => setApplyToVendor(e.target.checked)}
              style={{ width: 16, height: 16, marginTop: 2 }}
            />
            <span style={{ fontSize: 13 }}>
              Apply to all transactions from <strong>{txn.merchant_name}</strong>
              <div className="muted" style={{ fontSize: 12 }}>
                Renames every past and future transaction from this vendor.
              </div>
            </span>
          </label>
        ) : null}

        <label className="muted" style={{ ...labelStyle, marginTop: 16 }}>
          Category
        </label>
        {spaceId ? (
          <CategoryPicker
            value={categoryId}
            onChange={(id, cat) => {
              setCategoryId(id);
              setCategory(cat?.name ?? "");
            }}
            categories={categories}
            spaceId={spaceId}
            placeholder="Pick a category"
            allowNone
            allowCreate
            onCategoryCreated={onCategoryCreated}
          />
        ) : (
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. groceries"
            style={inputStyle}
          />
        )}

        <label className="muted" style={{ ...labelStyle, marginTop: 16 }}>
          Notes
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
        />

        <label
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            cursor: "pointer",
          }}
        >
          <span>Mark as recurring</span>
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
        </label>

        {sharedView && spaceId ? (
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
              cursor: "pointer",
            }}
          >
            <span>
              Hide from this space
              <div className="muted" style={{ fontSize: 12 }}>
                Other members will not see this transaction.
              </div>
            </span>
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
          </label>
        ) : null}

        {spaceId ? (
          <button
            type="button"
            onClick={() => setSplitOpen(true)}
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontFamily: "inherit",
              fontSize: 14,
            }}
          >
            <span>
              <div>Split this transaction</div>
              <div className="muted" style={{ fontSize: 12 }}>
                Divide the amount across multiple categories.
              </div>
            </span>
            <span className="muted">›</span>
          </button>
        ) : null}

        {error ? (
          <p style={{ color: "var(--negative)", marginTop: 12 }}>{error}</p>
        ) : null}

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
      </aside>

      <SplitEditor
        client={client}
        visible={splitOpen}
        txnId={txn.id}
        txnAmountCents={txn.amount}
        spaceId={spaceId}
        defaultCategory={category.trim() || txn.category}
        onClose={() => setSplitOpen(false)}
        onSaved={onSaved}
      />
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
