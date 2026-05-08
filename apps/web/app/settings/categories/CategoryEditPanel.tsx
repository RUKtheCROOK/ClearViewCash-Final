"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  CATEGORY_COLOR_PRESETS,
  CATEGORY_ICON_KEYS,
  CATEGORY_KIND_VALUES,
  type Category,
  type CategoryIconKey,
  type CategoryKind,
  isValidHexColor,
  tintForColor,
} from "@cvc/domain";
import { createCategory, updateCategory } from "@cvc/api-client";
import { I } from "../../../lib/icons";
import { useTheme } from "../../../lib/theme-provider";
import { CategoryDisc } from "../../../components/CategoryDisc";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface Props {
  mode: "create" | "edit";
  category: Category | null;
  spaceId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function CategoryEditPanel({ mode, category, spaceId, onClose, onSaved }: Props) {
  const { resolved } = useTheme();
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState<CategoryIconKey>(
    (category?.icon as CategoryIconKey) ?? "doc",
  );
  const [color, setColor] = useState(category?.color ?? CATEGORY_COLOR_PRESETS[0]!);
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? "expense");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    setError(null);
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 40) {
      setError("Name must be 1–40 characters.");
      return;
    }
    if (!isValidHexColor(color)) {
      setError("Color must be a valid hex (#RRGGBB).");
      return;
    }
    setSaving(true);
    try {
      if (mode === "create") {
        await createCategory(supabase, { space_id: spaceId, name: trimmed, icon, color, kind });
      } else if (category) {
        await updateCategory(supabase, { id: category.id, name: trimmed, icon, color, kind });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(20,24,28,0.36)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--bg-surface)",
          borderRadius: 16,
          padding: 20,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: 20, fontWeight: 500, color: "var(--ink-1)" }}>
            {mode === "create" ? "New category" : "Edit category"}
          </h2>
          <button type="button" onClick={onClose} style={iconBtn()} aria-label="Close">
            <I.close color="var(--ink-2)" size={14} />
          </button>
        </div>

        {/* Live preview disc */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
          <CategoryDisc category={{ icon, color, name: name || "Preview" }} size={56} />
          <div>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 16, fontWeight: 500, color: "var(--ink-1)" }}>
              {name.trim() || "New category"}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "capitalize" }}>{kind}</div>
          </div>
        </div>

        {/* Name */}
        <div style={{ marginTop: 20 }}>
          <Label>Name</Label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="e.g. Coffee"
            style={inputStyle()}
          />
        </div>

        {/* Kind segmented */}
        <div style={{ marginTop: 14 }}>
          <Label>Kind</Label>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              borderRadius: 10,
              padding: 4,
              background: "var(--bg-canvas)",
              border: "1px solid var(--line-soft)",
            }}
          >
            {CATEGORY_KIND_VALUES.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                style={{
                  height: 32,
                  borderRadius: 8,
                  border: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                  fontSize: 13,
                  fontWeight: 500,
                  textTransform: "capitalize",
                  background: kind === k ? "var(--bg-surface)" : "transparent",
                  color: kind === k ? "var(--ink-1)" : "var(--ink-3)",
                  boxShadow: kind === k ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Color presets + hex */}
        <div style={{ marginTop: 14 }}>
          <Label>Color</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
            {CATEGORY_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: c,
                  border: color.toLowerCase() === c.toLowerCase() ? "2px solid var(--ink-1)" : "1px solid var(--line-soft)",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <input
              type="color"
              value={isValidHexColor(color) ? color : "#7b79ae"}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 36, height: 36, border: 0, background: "transparent", cursor: "pointer" }}
            />
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#RRGGBB"
              style={{ ...inputStyle(), flex: 1 }}
            />
          </div>
        </div>

        {/* Icon grid */}
        <div style={{ marginTop: 14 }}>
          <Label>Icon</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
            {CATEGORY_ICON_KEYS.map((k) => {
              const Icon = (I as Record<string, (props: { color?: string; size?: number }) => JSX.Element>)[k] ?? I.doc;
              const selected = icon === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setIcon(k)}
                  aria-label={k}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: selected ? "2px solid var(--ink-1)" : "1px solid var(--line-soft)",
                    background: selected ? "var(--bg-canvas)" : "var(--bg-surface)",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon color={selected ? "var(--ink-1)" : "var(--ink-2)"} size={16} />
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div style={{ marginTop: 12, color: "var(--neg)", fontSize: 12 }}>{error}</div>
        ) : null}

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              background: "var(--bg-canvas)",
              border: "1px solid var(--line-soft)",
              color: "var(--ink-1)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{
              flex: 2,
              height: 44,
              borderRadius: 12,
              background: "var(--brand)",
              border: 0,
              color: "var(--brand-fg)",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: "var(--font-num)",
        fontSize: 9.5,
        color: "var(--ink-3)",
        letterSpacing: "0.08em",
        fontWeight: 600,
        textTransform: "uppercase",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    height: 40,
    borderRadius: 10,
    background: "var(--bg-canvas)",
    border: "1px solid var(--line-soft)",
    padding: "0 12px",
    fontFamily: "var(--font-ui)",
    fontSize: 14,
    color: "var(--ink-1)",
  };
}

function iconBtn(): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: "var(--bg-canvas)",
    border: "1px solid var(--line-soft)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
  };
}
