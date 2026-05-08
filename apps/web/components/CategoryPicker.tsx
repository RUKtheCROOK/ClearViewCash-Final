"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import type { Category, CategoryKind } from "@cvc/domain";
import { createCategory } from "@cvc/api-client";
import { CategoryDisc } from "./CategoryDisc";
import { I } from "../lib/icons";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface Props {
  value: string | null;
  onChange: (id: string | null, category: Category | null) => void;
  categories: Category[];
  spaceId: string;
  kind?: CategoryKind;
  placeholder?: string;
  allowNone?: boolean;
  allowCreate?: boolean;
  /** Called after a new category is created via the inline affordance. */
  onCategoryCreated?: (c: Category) => void;
}

export function CategoryPicker({
  value,
  onChange,
  categories,
  spaceId,
  kind,
  placeholder = "Pick a category",
  allowNone = false,
  allowCreate = false,
  onCategoryCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter((c) => (kind ? c.kind === kind : true))
      .filter((c) => !q || c.name.toLowerCase().includes(q));
  }, [categories, query, kind]);

  const selected = value ? categories.find((c) => c.id === value) ?? null : null;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createCategory(supabase, {
        space_id: spaceId,
        name,
        icon: "doc",
        color: "#7b79ae",
        kind: kind ?? "expense",
      });
      const cat = created as unknown as Category;
      onCategoryCreated?.(cat);
      onChange(cat.id, cat);
      setOpen(false);
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create category");
    } finally {
      setCreating(false);
    }
  }

  const exactMatch = filtered.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={popRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          minHeight: 44,
          borderRadius: 12,
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
          padding: "6px 10px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          fontFamily: "var(--font-ui)",
          textAlign: "left",
          color: "var(--ink-1)",
        }}
      >
        {selected ? (
          <>
            <CategoryDisc category={selected} size={28} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>{selected.name}</span>
          </>
        ) : (
          <>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                background: "var(--bg-canvas)",
                border: "1px dashed var(--line-soft)",
              }}
            />
            <span style={{ fontSize: 14, color: "var(--ink-3)" }}>{placeholder}</span>
          </>
        )}
        <span style={{ marginLeft: "auto" }}>
          <I.chev color="var(--ink-3)" />
        </span>
      </button>

      {open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            zIndex: 50,
            background: "var(--bg-surface)",
            border: "1px solid var(--line-soft)",
            borderRadius: 12,
            boxShadow: "0 12px 32px rgba(20,24,28,0.18)",
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid var(--line-soft)" }}>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              style={{
                width: "100%",
                height: 32,
                border: 0,
                outline: 0,
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                color: "var(--ink-1)",
              }}
            />
          </div>
          <div style={{ padding: 4 }}>
            {allowNone ? (
              <button
                type="button"
                onClick={() => {
                  onChange(null, null);
                  setOpen(false);
                  setQuery("");
                }}
                style={rowStyle(value === null)}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: "var(--bg-canvas)",
                    border: "1px dashed var(--line-soft)",
                  }}
                />
                <span style={{ fontSize: 14, color: "var(--ink-2)" }}>Uncategorized</span>
              </button>
            ) : null}
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id, c);
                  setOpen(false);
                  setQuery("");
                }}
                style={rowStyle(c.id === value)}
              >
                <CategoryDisc category={c} size={28} />
                <span style={{ fontSize: 14, color: "var(--ink-1)" }}>{c.name}</span>
                {c.kind !== "expense" ? (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {c.kind}
                  </span>
                ) : null}
              </button>
            ))}
            {filtered.length === 0 && !allowCreate ? (
              <div style={{ padding: 12, color: "var(--ink-3)", fontSize: 13 }}>No matches.</div>
            ) : null}
            {allowCreate && query.trim() && !exactMatch ? (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                style={{ ...rowStyle(false), color: "var(--brand)" }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: "var(--bg-canvas)",
                    border: "1px dashed var(--brand)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <I.plus color="var(--brand)" size={16} />
                </span>
                <span style={{ fontSize: 14 }}>
                  {creating ? "Creating…" : `Create "${query.trim()}"`}
                </span>
              </button>
            ) : null}
            {error ? (
              <div style={{ padding: 8, color: "var(--neg)", fontSize: 12 }}>{error}</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function rowStyle(active: boolean): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 40,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 10px",
    border: 0,
    background: active ? "var(--bg-canvas)" : "transparent",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "var(--font-ui)",
  };
}
