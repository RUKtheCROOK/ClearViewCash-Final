"use client";

import { I } from "../../lib/icons";

interface Props {
  onSetUp: () => void;
  onDismiss: () => void;
}

export function EmptyLinksCallout({ onSetUp, onDismiss }: Props) {
  return (
    <div style={{ padding: "24px 0 0" }}>
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px dashed var(--line-firm)",
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--brand-tint)",
              color: "var(--brand)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <I.link color="var(--brand)" size={16} />
          </span>
          <div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 14.5,
                fontWeight: 500,
                color: "var(--ink-1)",
              }}
            >
              Link cards to funding accounts
            </div>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11.5,
                color: "var(--ink-3)",
                fontStyle: "italic",
                marginTop: 1,
              }}
            >
              Optional · adds Effective Available cash
            </div>
          </div>
        </div>
        <p
          style={{
            margin: "4px 0 12px",
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.55,
          }}
        >
          When you mark a card as paid by a funding account, ClearView Cash subtracts
          the linked card balance from cash. You always see what&apos;s truly spendable.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onSetUp}
            style={{
              appearance: "none",
              cursor: "pointer",
              border: 0,
              height: 38,
              padding: "0 14px",
              borderRadius: 10,
              background: "var(--brand)",
              color: "var(--brand-on)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Set up payment link
          </button>
          <button
            type="button"
            onClick={onDismiss}
            style={{
              appearance: "none",
              cursor: "pointer",
              height: 38,
              padding: "0 14px",
              borderRadius: 10,
              background: "transparent",
              color: "var(--ink-1)",
              border: "1px solid var(--line-firm)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
