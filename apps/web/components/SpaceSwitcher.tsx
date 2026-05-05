"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { I } from "../lib/icons";
import { Num } from "./money";

export interface SpaceItem {
  id: string;
  name: string;
  hue: number;
  members: number;
  totalCents: number;
  accountCount: number;
  spaceKey: "personal" | "household" | "business" | "family" | "travel";
}

interface Props {
  active: SpaceItem | null;
  spaces: SpaceItem[];
  onSelect: (id: string) => void;
}

const SPACE_TYPE_ICON: Record<SpaceItem["spaceKey"], keyof typeof I> = {
  personal: "home",
  household: "fam",
  business: "brief",
  family: "fam",
  travel: "plane",
};

export function SpaceSwitcher({ active, spaces, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        type="button"
        style={{
          appearance: "none",
          border: 0,
          cursor: "pointer",
          background: "var(--space-pill-bg)",
          color: "var(--space-pill-fg)",
          height: 36,
          padding: "0 6px 0 10px",
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "var(--font-ui)",
          fontWeight: 500,
          fontSize: 14,
        }}
      >
        <I.spaces color="var(--space-pill-fg)" size={16} />
        <span>{active?.name ?? "Personal"}</span>
        <I.chev color="var(--space-pill-fg)" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
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
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 8, paddingBottom: 4 }}>
              <div
                style={{
                  width: 36,
                  height: 5,
                  borderRadius: 3,
                  background: "var(--line-firm)",
                }}
              />
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
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 500,
                    color: "var(--ink-1)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Spaces
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 1 }}>
                  Switch context · {spaces.length} space{spaces.length === 1 ? "" : "s"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
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

            <div style={{ padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
              {spaces.map((s) => {
                const Icon = I[SPACE_TYPE_ICON[s.spaceKey]];
                const isActive = active?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      onSelect(s.id);
                      setOpen(false);
                    }}
                    className={`space space-${s.spaceKey}`}
                    style={{
                      appearance: "none",
                      border: `1px solid ${isActive ? "var(--space-edge)" : "transparent"}`,
                      cursor: "pointer",
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 14,
                      padding: "12px 14px",
                      borderRadius: 14,
                      alignItems: "center",
                      background: isActive ? "var(--space-wash)" : "transparent",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: "var(--space-pill-bg)",
                        color: "var(--space-pill-fg)",
                        display: "grid",
                        placeItems: "center",
                        position: "relative",
                      }}
                    >
                      <Icon color="var(--space-pill-fg)" size={22} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-1)" }}>
                          {s.name}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            background: "var(--bg-tinted)",
                            padding: "2px 7px",
                            borderRadius: 999,
                          }}
                        >
                          <I.user color="var(--ink-3)" />
                          <Num style={{ fontSize: 11, color: "var(--ink-3)" }}>{s.members}</Num>
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>
                        ${(s.totalCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}{" "}
                        across {s.accountCount} account{s.accountCount === 1 ? "" : "s"}
                      </div>
                    </div>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        background: isActive ? "var(--space-pill-fg)" : "transparent",
                        border: isActive ? "0" : "1px solid var(--line-soft)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {isActive ? <I.check color="var(--bg-surface)" size={14} /> : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ height: 1, background: "var(--line-soft)", margin: "4px 18px 8px" }} />

            <Link
              href="/settings/spaces"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 14px",
                margin: "0 12px",
                borderRadius: 14,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: "var(--bg-tinted)",
                  color: "var(--ink-2)",
                  display: "grid",
                  placeItems: "center",
                  border: "1px dashed var(--line-firm)",
                }}
              >
                <I.plus color="var(--ink-2)" />
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 15, fontWeight: 500, color: "var(--ink-1)" }}>
                  New Space
                </span>
                <span style={{ display: "block", fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                  Invite people, choose what to share
                </span>
              </span>
              <I.chevR color="var(--ink-3)" />
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
