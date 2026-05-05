"use client";

import { useEffect } from "react";
import { I } from "../lib/icons";
import {
  DASHBOARD_MODULES,
  type DashboardModuleId,
  isPremiumModule,
} from "@cvc/domain";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  type DashboardLayoutEntry,
} from "../lib/use-dashboard-layout";

interface Props {
  open: boolean;
  onClose: () => void;
  layout: DashboardLayoutEntry[];
  onLayout: (next: DashboardLayoutEntry[]) => void;
  onReset: () => void;
  isPremium: boolean;
  onPremiumPress: () => void;
}

export function CustomizeDashboardSheet({
  open,
  onClose,
  layout,
  onLayout,
  onReset,
  isPremium,
  onPremiumPress,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function toggle(id: DashboardModuleId) {
    if (isPremiumModule(id) && !isPremium) {
      onPremiumPress();
      return;
    }
    onLayout(layout.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e)));
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...layout];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    onLayout(next);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,24,28,0.32)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-surface)",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingBottom: 36,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: "var(--line-firm)" }} />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 18px 4px",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 500, color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
              Customize dashboard
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>
              Toggle modules and reorder them
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
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
            <I.close color="var(--ink-2)" />
          </button>
        </div>

        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {layout.map((entry, i) => {
            const meta = DASHBOARD_MODULES[entry.id];
            const premium = meta.premium;
            const locked = premium && !isPremium;
            const checked = entry.visible && !locked;
            return (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: 14,
                  background: "var(--bg-canvas)",
                  border: "1px solid var(--line-soft)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      border: 0,
                      background: i === 0 ? "transparent" : "var(--bg-tinted)",
                      display: "grid",
                      placeItems: "center",
                      cursor: i === 0 ? "default" : "pointer",
                    }}
                  >
                    <span style={{ display: "inline-block", transform: "rotate(180deg)" }}>
                      <I.chev color={i === 0 ? "var(--ink-4)" : "var(--ink-2)"} />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === layout.length - 1}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      border: 0,
                      background: i === layout.length - 1 ? "transparent" : "var(--bg-tinted)",
                      display: "grid",
                      placeItems: "center",
                      cursor: i === layout.length - 1 ? "default" : "pointer",
                    }}
                  >
                    <I.chev color={i === layout.length - 1 ? "var(--ink-4)" : "var(--ink-2)"} />
                  </button>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
                      {meta.label}
                    </span>
                    {premium ? (
                      <button
                        type="button"
                        onClick={onPremiumPress}
                        style={{
                          background: "var(--brand-tint)",
                          color: "var(--brand)",
                          fontFamily: "var(--font-num)",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          padding: "1px 6px",
                          borderRadius: 4,
                          border: 0,
                          cursor: "pointer",
                        }}
                      >
                        PRO
                      </button>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                    {locked ? "Upgrade to enable" : meta.description}
                  </div>
                </div>
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: 38,
                    height: 22,
                    cursor: locked ? "not-allowed" : "pointer",
                    opacity: locked ? 0.5 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked}
                    onChange={() => toggle(entry.id)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 999,
                      background: checked ? "var(--brand)" : "var(--line-firm)",
                      transition: "background 0.15s",
                    }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 2,
                      left: checked ? 18 : 2,
                      width: 18,
                      height: 18,
                      borderRadius: 999,
                      background: "var(--bg-surface)",
                      transition: "left 0.15s",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                    }}
                  />
                </label>
              </div>
            );
          })}

          <button
            type="button"
            onClick={onReset}
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              background: "transparent",
              border: 0,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ink-2)",
            }}
          >
            Reset to default
          </button>
        </div>
      </div>
    </div>
  );
}
