"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { I } from "../lib/icons";
import { useTheme } from "../lib/theme-provider";

interface Props {
  open: boolean;
  onClose: () => void;
  onAddTransaction: () => void;
}

interface Action {
  id: string;
  label: string;
  body: string;
  icon: keyof typeof I;
  onClick: () => void;
}

export function QuickActionsMenu({ open, onClose, onAddTransaction }: Props) {
  const router = useRouter();
  const { resolved, setMode } = useTheme();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const actions: Action[] = [
    {
      id: "premium-hub",
      label: "Premium hub",
      body: "Manage subscription, see trial status, and explore Pro features.",
      icon: "spark",
      onClick: () => {
        onClose();
        router.push("/settings");
      },
    },
    {
      id: "income",
      label: "Income",
      body: "Track paychecks, freelance, rentals, and one-off deposits.",
      icon: "summary",
      onClick: () => {
        onClose();
        router.push("/income");
      },
    },
    {
      id: "add-transaction",
      label: "Add transaction",
      body: "Manually log a cash transaction not yet imported from a linked account.",
      icon: "plus",
      onClick: () => {
        onClose();
        onAddTransaction();
      },
    },
    {
      id: "toggle-dark",
      label: resolved === "dark" ? "Switch to light mode" : "Switch to dark mode",
      body: resolved === "dark"
        ? "Light theme follows the warm-paper palette."
        : "Dark theme uses the cool ink-blue palette.",
      icon: "spark",
      onClick: () => {
        setMode(resolved === "dark" ? "light" : "dark");
      },
    },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(20,22,28,0.18)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: 96,
          left: "50%",
          transform: "translateX(-50%)",
          width: "calc(100% - 32px)",
          maxWidth: 448,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
          borderRadius: 18,
          boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "14px 16px 8px" }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 11,
              fontWeight: 500,
              color: "var(--ink-2)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Quick actions
          </span>
        </div>
        {actions.map((a, i) => {
          const Icon = I[a.icon];
          const last = i === actions.length - 1;
          return (
            <button
              key={a.id}
              type="button"
              onClick={a.onClick}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                padding: "12px 16px",
                alignItems: "center",
                background: "transparent",
                border: 0,
                borderBottom: last ? "none" : "1px solid var(--line-soft)",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "var(--brand-tint)",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Icon color="var(--brand)" size={18} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>{a.label}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>{a.body}</div>
              </div>
              <I.chevR color="var(--ink-3)" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
