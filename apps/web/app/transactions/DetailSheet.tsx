"use client";

import { useState } from "react";
import {
  displayMerchantName,
  resolveTxCategory,
  TX_CATEGORY_KINDS,
  categoryKindLabel,
  type TxCategoryKind,
} from "@cvc/domain";
import {
  setTransactionRecurring,
  setTransactionShare,
  updateTransactionCategory,
} from "@cvc/api-client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { I } from "../../lib/icons";
import { categoryTint, type CategoryKind, type ThemeMode } from "../../lib/categoryTheme";
import { CategoryGlyph } from "./CategoryGlyph";
import { TxNum } from "./TxNum";
import type { ActivityTxn } from "./types";
import { EditPanel } from "./EditPanel";
import { SplitEditor } from "./SplitEditor";

interface Props {
  client: SupabaseClient<Database>;
  txn: ActivityTxn | null;
  spaceId: string | null;
  sharedView: boolean;
  hiddenInSpace: boolean;
  accountName: string | null;
  mode: ThemeMode;
  categorySuggestions: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function DetailSheet({
  client,
  txn,
  spaceId,
  sharedView,
  hiddenInSpace,
  accountName,
  mode,
  categorySuggestions,
  onClose,
  onSaved,
}: Props) {
  const [splitOpen, setSplitOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!txn) return null;

  const cat = resolveTxCategory(txn.category, txn.amount);
  const tint = categoryTint(cat.kind as CategoryKind, mode);
  const merchant = displayMerchantName(txn);
  const isHidden = sharedView && hiddenInSpace;

  async function changeKind(kind: TxCategoryKind) {
    if (!txn) return;
    setPending(true);
    try {
      await updateTransactionCategory(client, { id: txn.id, category: categoryKindLabel(kind) });
      onSaved();
    } finally {
      setPending(false);
      setPickerOpen(false);
    }
  }

  async function toggleRecurring() {
    if (!txn) return;
    setPending(true);
    try {
      await setTransactionRecurring(client, { id: txn.id, is_recurring: !txn.is_recurring });
      onSaved();
    } finally {
      setPending(false);
    }
  }

  async function toggleHidden() {
    if (!txn || !spaceId || !sharedView) return;
    setPending(true);
    try {
      await setTransactionShare(client, {
        transaction_id: txn.id,
        space_id: spaceId,
        hidden: !hiddenInSpace,
      });
      onSaved();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20,24,28,0.34)",
          zIndex: 60,
        }}
      />
      <div
        role="dialog"
        aria-label="Transaction details"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: "92vh",
          background: "var(--bg-surface)",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          boxShadow: "0 -10px 30px rgba(0,0,0,0.20)",
          zIndex: 61,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: "var(--line-firm)" }} />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "2px 16px 0",
          }}
        >
          <button onClick={onClose} type="button" style={iconBtn}>
            <I.close color="var(--ink-1)" size={18} />
          </button>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-3)" }}>
            Transaction
          </span>
          <button onClick={() => setEditOpen(true)} type="button" style={iconBtn}>
            <I.edit color="var(--ink-1)" size={18} />
          </button>
        </div>

        <div style={{ overflowY: "auto", paddingBottom: 24 }}>
          {/* hero */}
          <div style={{ textAlign: "center", padding: "10px 16px 4px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: tint.pillBg,
                  color: tint.pillFg,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <CategoryGlyph kind={cat.kind as CategoryKind} color={tint.pillFg} size={14} />
              </span>
              <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-2)" }}>
                {cat.label}
              </span>
            </div>
            <div>
              <TxNum
                cents={txn.amount}
                showSign
                fontSize={38}
                fontWeight={500}
                color="var(--ink-1)"
                centsColor="var(--ink-3)"
                letterSpacing={-1.0}
              />
            </div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--ink-2)", marginTop: 4 }}>
              {merchant}
            </div>
            <div
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 11,
                color: "var(--ink-3)",
                marginTop: 4,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {formatHeroDate(txn.posted_at)}
              {accountName ? ` · ${accountName}` : ""}
            </div>
          </div>

          <div
            style={{
              margin: "14px 16px 0",
              background: "var(--bg-sunken)",
              borderRadius: 12,
              padding: "4px",
            }}
          >
            <PropRow
              label="Category"
              onClick={() => setPickerOpen(true)}
              value={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, background: tint.swatch }} />
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-1)" }}>
                    {cat.label}
                  </span>
                  <I.chev color="var(--ink-3)" size={11} />
                </span>
              }
            />
            <PropDivider />
            <PropRow
              label={sharedView ? "Mine vs Shared" : "Visibility"}
              onClick={sharedView && spaceId ? toggleHidden : undefined}
              value={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <I.share color="var(--ink-1)" size={12} />
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-1)" }}>
                    {sharedView ? (isHidden ? "Hidden" : "Shared with space") : "Visible"}
                  </span>
                  {sharedView && spaceId ? <I.chev color="var(--ink-3)" size={11} /> : null}
                </span>
              }
            />
            <PropDivider />
            <PropRow
              label="Recurring"
              onClick={toggleRecurring}
              value={
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-2)" }}>
                    {txn.is_recurring ? "On" : "Off"}
                  </span>
                  <I.chev color="var(--ink-3)" size={11} />
                </span>
              }
            />
            <PropDivider />
            <PropRow
              label="Account"
              value={
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-1)" }}>
                  {accountName ?? "—"}
                </span>
              }
            />
          </div>

          <div style={{ padding: "14px 16px 0" }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink-2)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 6,
              }}
            >
              Note
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              style={{
                appearance: "none",
                cursor: "pointer",
                width: "100%",
                background: "var(--bg-sunken)",
                borderRadius: 10,
                border: 0,
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                textAlign: "left",
              }}
            >
              <I.note color="var(--ink-3)" size={16} />
              {txn.note ? (
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--ink-2)",
                    flex: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {txn.note}
                </span>
              ) : (
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 13,
                    color: "var(--ink-3)",
                    fontStyle: "italic",
                  }}
                >
                  Add a note…
                </span>
              )}
            </button>
          </div>

          <div
            style={{
              padding: "14px 16px 0",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            {spaceId ? (
              <ActionBtn label="Split" iconKey="split" onClick={() => setSplitOpen(true)} />
            ) : null}
            <ActionBtn
              label={txn.is_recurring ? "Stop recurring" : "Make recurring"}
              iconKey="bell"
              onClick={toggleRecurring}
            />
            {sharedView && spaceId ? (
              <ActionBtn
                label={isHidden ? "Unhide" : "Hide from space"}
                iconKey="hide"
                onClick={toggleHidden}
              />
            ) : null}
            <ActionBtn label="Edit details" iconKey="edit" onClick={() => setEditOpen(true)} />
          </div>
        </div>
      </div>

      {pickerOpen ? (
        <div
          onClick={() => setPickerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 70,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-surface)",
              borderRadius: 14,
              padding: 16,
              width: "min(420px, 90vw)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                fontWeight: 600,
                color: "var(--ink-2)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                marginBottom: 12,
              }}
            >
              Choose category
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TX_CATEGORY_KINDS.map((kind) => {
                const active = cat.kind === kind;
                const t = categoryTint(kind as CategoryKind, mode);
                return (
                  <button
                    key={kind}
                    type="button"
                    disabled={pending}
                    onClick={() => changeKind(kind)}
                    style={{
                      appearance: "none",
                      cursor: pending ? "wait" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      height: 32,
                      padding: "0 10px 0 6px",
                      borderRadius: 999,
                      background: active ? t.pillBg : "var(--bg-surface)",
                      border: `1px solid ${active ? "transparent" : "var(--line-soft)"}`,
                      color: active ? t.pillFg : "var(--ink-2)",
                      fontFamily: "var(--font-ui)",
                      fontSize: 12.5,
                      fontWeight: 500,
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: active ? t.swatch : t.pillBg,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <CategoryGlyph
                        kind={kind as CategoryKind}
                        color={active ? "#fff" : t.pillFg}
                        size={12}
                        strokeWidth={1.8}
                      />
                    </span>
                    {categoryKindLabel(kind)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <SplitEditor
        client={client}
        visible={splitOpen}
        txnId={txn.id}
        txnAmountCents={txn.amount}
        spaceId={spaceId}
        defaultCategory={txn.category}
        onClose={() => setSplitOpen(false)}
        onSaved={onSaved}
      />

      <EditPanel
        client={client}
        txn={editOpen ? txn : null}
        spaceId={spaceId}
        sharedView={sharedView}
        hiddenInSpace={hiddenInSpace}
        categorySuggestions={categorySuggestions}
        onClose={() => setEditOpen(false)}
        onSaved={onSaved}
      />
    </>
  );
}

const iconBtn: React.CSSProperties = {
  appearance: "none",
  border: 0,
  cursor: "pointer",
  width: 36,
  height: 36,
  borderRadius: 999,
  background: "var(--bg-surface)",
  color: "var(--ink-1)",
  display: "grid",
  placeItems: "center",
};

function PropRow({
  label,
  value,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
}) {
  const inner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 12px",
      }}
    >
      <span style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-3)" }}>{label}</span>
      {value}
    </div>
  );
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          appearance: "none",
          cursor: "pointer",
          background: "transparent",
          border: 0,
          width: "100%",
          textAlign: "left",
          padding: 0,
        }}
      >
        {inner}
      </button>
    );
  }
  return inner;
}

function PropDivider() {
  return <div style={{ height: 1, background: "var(--line-soft)", margin: "0 12px" }} />;
}

function ActionBtn({
  label,
  iconKey,
  onClick,
  warn,
}: {
  label: string;
  iconKey: "split" | "bell" | "hide" | "edit" | "trash";
  onClick: () => void;
  warn?: boolean;
}) {
  const c = warn ? "var(--warn)" : "var(--ink-1)";
  const Icon =
    iconKey === "split"
      ? I.split
      : iconKey === "bell"
      ? I.bell
      : iconKey === "hide"
      ? I.hide
      : iconKey === "edit"
      ? I.edit
      : I.trash;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        appearance: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--bg-surface)",
        border: "1px solid var(--line-soft)",
        borderRadius: 10,
        padding: "12px 12px",
        minHeight: 48,
        fontFamily: "var(--font-ui)",
        fontSize: 13,
        fontWeight: 500,
        color: c,
      }}
    >
      <Icon color={c} size={16} />
      {label}
    </button>
  );
}

function formatHeroDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return "";
  const [, y, mo, da] = m;
  const d = new Date(Number(y), Number(mo) - 1, Number(da));
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return "TODAY";
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}
