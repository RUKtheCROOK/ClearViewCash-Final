"use client";

import { I } from "../../lib/icons";

interface MenuItem {
  key: string;
  icon: "edit" | "bell" | "split" | "share" | "hide";
  label: string;
  hint?: string;
  warn?: boolean;
  onClick: () => void;
}

interface Props {
  open: boolean;
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ open, x, y, items, onClose }: Props) {
  if (!open) return null;
  // Position; clamp to viewport.
  const left = Math.min(x, typeof window !== "undefined" ? window.innerWidth - 240 : x);
  const top = Math.min(y, typeof window !== "undefined" ? window.innerHeight - 280 : y);

  return (
    <>
      <div
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        style={{ position: "fixed", inset: 0, zIndex: 80 }}
      />
      <div
        role="menu"
        style={{
          position: "fixed",
          top,
          left,
          minWidth: 240,
          background: "var(--bg-surface)",
          borderRadius: 14,
          padding: 6,
          boxShadow: "0 10px 30px rgba(0,0,0,0.22)",
          zIndex: 81,
        }}
      >
        {items.map((item, i) => {
          const c = item.warn ? "var(--warn)" : "var(--ink-1)";
          const Icon =
            item.icon === "edit"
              ? I.edit
              : item.icon === "bell"
              ? I.bell
              : item.icon === "split"
              ? I.split
              : item.icon === "share"
              ? I.share
              : I.hide;
          return (
            <div key={item.key}>
              {item.warn && i > 0 ? (
                <div style={{ height: 1, margin: "4px 8px", background: "var(--line-soft)" }} />
              ) : null}
              <button
                type="button"
                onClick={() => {
                  item.onClick();
                  onClose();
                }}
                style={{
                  appearance: "none",
                  cursor: "pointer",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 12,
                  alignItems: "center",
                  width: "100%",
                  background: "transparent",
                  border: 0,
                  padding: "12px 12px",
                  borderRadius: 10,
                  textAlign: "left",
                  color: c,
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "var(--bg-tinted)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon color={c} size={16} />
                </span>
                <span style={{ fontFamily: "var(--font-ui)", fontSize: 14.5, fontWeight: 500, color: c }}>
                  {item.label}
                </span>
                {item.hint ? (
                  <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)" }}>
                    {item.hint}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
