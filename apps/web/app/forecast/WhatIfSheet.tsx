"use client";

import { useEffect, useMemo, useState } from "react";
import type { Bill, Cadence } from "@cvc/types";
import type { WhatIfMutation } from "@cvc/domain";
import { I } from "../../lib/icons";

const CATEGORIES = ["Vet", "Travel", "Repair", "Gift", "Subscription", "Custom"] as const;
type Category = (typeof CATEGORIES)[number];

export interface WhatIfSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (mutation: WhatIfMutation) => void;
  onDiscard: () => void;
  impactText: string | null;
  spaceId: string;
  ownerUserId: string;
  defaultFundingAccountId: string | null;
  /** ISO date selected for the scenario (yyyy-mm-dd). */
  selectedDate: string;
}

export function WhatIfSheet({
  open,
  onClose,
  onSave,
  onDiscard,
  impactText,
  spaceId,
  ownerUserId,
  defaultFundingAccountId,
  selectedDate,
}: WhatIfSheetProps) {
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<Category>("Custom");

  // Reset when reopened.
  useEffect(() => {
    if (open) {
      setAmount("");
      setLabel("");
      setCategory("Custom");
    }
  }, [open]);

  const dateLabel = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    if (!y || !m || !d) return selectedDate;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }, [selectedDate]);

  const amountCents = useMemo(() => {
    const cleaned = amount.replace(/[^\d.]/g, "");
    if (!cleaned) return 0;
    const num = parseFloat(cleaned);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return Math.round(num * 100);
  }, [amount]);

  const canSave = amountCents > 0 && spaceId && ownerUserId;

  const handleSave = () => {
    if (!canSave) return;
    const dueDay = Math.max(1, Math.min(31, parseInt(selectedDate.slice(8, 10), 10) || 1));
    const billName = label.trim() || category;
    const synthetic: Bill = {
      id: `whatif-${Date.now()}`,
      space_id: spaceId,
      owner_user_id: ownerUserId,
      name: billName,
      amount: amountCents,
      due_day: dueDay,
      cadence: "once" as Cadence,
      next_due_at: selectedDate,
      autopay: false,
      linked_account_id: defaultFundingAccountId,
      source: "manual",
      recurring_group_id: null,
      category: null,
      payee_hue: null,
      payee_glyph: null,
      notes: null,
    };
    onSave({ addBill: synthetic });
  };

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(20,24,28,0.34)",
          zIndex: 90,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
          background: "var(--bg-surface)",
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          boxShadow: "0 -10px 30px rgba(0,0,0,0.16)",
          padding: "8px 16px 22px",
          borderTop: "1px solid var(--line-soft)",
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: "var(--line-firm)" }} />
        </div>

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginTop: 12,
            marginBottom: 4,
            gap: 10,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-num)",
                fontSize: 10,
                color: "var(--brand)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              What-if
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 15,
                fontWeight: 500,
                color: "var(--ink-1)",
                marginTop: 2,
              }}
            >
              Add expense on {dateLabel}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
              Tap a different day on the chart to change the date.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              appearance: "none",
              border: 0,
              cursor: "pointer",
              background: "var(--bg-tinted)",
              color: "var(--ink-2)",
              width: 32,
              height: 32,
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
            }}
          >
            {I.close({ color: "var(--ink-2)", size: 16 })}
          </button>
        </div>

        {/* Amount input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 12,
            background: "var(--bg-sunken)",
            marginTop: 14,
          }}
        >
          <span style={{ fontFamily: "var(--font-num)", fontSize: 18, color: "var(--ink-3)" }}>$</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            autoFocus
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontFamily: "var(--font-num)",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--ink-1)",
              outline: "none",
              padding: 0,
            }}
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={category.toLowerCase()}
            style={{
              border: "none",
              background: "transparent",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-2)",
              outline: "none",
              width: 110,
              textAlign: "right",
              padding: 0,
            }}
          />
        </div>

        {/* Category pills */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 12,
            overflowX: "auto",
            paddingBottom: 2,
          }}
        >
          {CATEGORIES.map((k) => {
            const active = k === category;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setCategory(k)}
                style={{
                  flexShrink: 0,
                  height: 30,
                  padding: "0 12px",
                  borderRadius: 999,
                  background: active ? "var(--ink-1)" : "var(--bg-surface)",
                  color: active ? "var(--bg-canvas)" : "var(--ink-2)",
                  border: `1px solid ${active ? "var(--ink-1)" : "var(--line-soft)"}`,
                  fontFamily: "var(--font-ui)",
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {k}
              </button>
            );
          })}
        </div>

        {/* Impact callout */}
        {impactText && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              borderRadius: 12,
              background: "var(--brand-tint)",
              color: "var(--brand)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                background: "var(--brand)",
                color: "var(--brand-on)",
                display: "grid",
                placeItems: "center",
              }}
            >
              {I.arrowDown({ color: "var(--brand-on)", size: 12 })}
            </span>
            <div style={{ flex: 1, fontFamily: "var(--font-ui)", fontSize: 12, lineHeight: 1.45 }}>
              {impactText}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            style={{
              flex: 1,
              appearance: "none",
              border: 0,
              cursor: canSave ? "pointer" : "not-allowed",
              background: "var(--brand)",
              color: "var(--brand-on)",
              height: 44,
              padding: "0 14px",
              borderRadius: 12,
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 500,
              opacity: canSave ? 1 : 0.45,
            }}
          >
            Save scenario
          </button>
          <button
            type="button"
            onClick={onDiscard}
            style={{
              appearance: "none",
              cursor: "pointer",
              background: "transparent",
              color: "var(--ink-1)",
              border: "1px solid var(--line-firm)",
              height: 44,
              padding: "0 16px",
              borderRadius: 12,
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Discard
          </button>
        </div>
      </div>
    </>
  );
}
