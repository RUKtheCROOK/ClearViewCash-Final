"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  archiveCategory,
  getMySpaces,
  listCategoriesForSpace,
  restoreCategory,
} from "@cvc/api-client";
import type { Category } from "@cvc/domain";
import { useTheme } from "../../../lib/theme-provider";
import { PageHeader } from "../_components/SettingsAtoms";
import { CategoryDisc } from "../../../components/CategoryDisc";
import { I } from "../../../lib/icons";
import { CategoryEditPanel } from "./CategoryEditPanel";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface SpaceLite {
  id: string;
  name: string;
  tint: string;
}

export default function CategoriesSettingsPage() {
  const router = useRouter();
  const { resolved } = useTheme();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<SpaceLite[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(!!data.session);
      setAuthReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    getMySpaces(supabase).then((rows) => {
      const list = rows as unknown as SpaceLite[];
      setSpaces(list);
      if (list.length > 0 && !activeSpaceId) {
        const stored =
          typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
        const found = stored ? list.find((s) => s.id === stored) : null;
        setActiveSpaceId(found?.id ?? list[0]!.id);
      }
    });
  }, [signedIn, activeSpaceId]);

  useEffect(() => {
    if (!activeSpaceId) return;
    listCategoriesForSpace(supabase, activeSpaceId, { includeArchived: true }).then((rows) =>
      setCategories(rows as unknown as Category[]),
    );
  }, [activeSpaceId, reloadCount]);

  const active = useMemo(() => categories.filter((c) => !c.archived_at), [categories]);
  const archived = useMemo(() => categories.filter((c) => !!c.archived_at), [categories]);

  if (!authReady) return null;
  if (!signedIn) {
    router.replace("/sign-in");
    return null;
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this category? Existing transactions, budgets and bills will keep referencing it but it will no longer appear in pickers.")) return;
    await archiveCategory(supabase, id);
    setReloadCount((n) => n + 1);
  }

  async function handleRestore(id: string) {
    await restoreCategory(supabase, id);
    setReloadCount((n) => n + 1);
  }

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader title="Categories" sub="Customize the categories you use across transactions, budgets, bills and reports." backHref="/settings" />

        {spaces.length > 1 ? (
          <div style={{ padding: "8px 16px 0" }}>
            <select
              value={activeSpaceId ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                setActiveSpaceId(id);
                if (id && typeof window !== "undefined") localStorage.setItem("cvc-active-space", id);
              }}
              style={{
                width: "100%",
                height: 40,
                borderRadius: 12,
                border: "1px solid var(--line-soft)",
                background: "var(--bg-surface)",
                padding: "0 12px",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                color: "var(--ink-1)",
              }}
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div style={{ padding: "12px 16px 0" }}>
          <button
            type="button"
            onClick={() => setCreating(true)}
            disabled={!activeSpaceId}
            style={{
              width: "100%",
              height: 44,
              borderRadius: 12,
              background: "var(--brand)",
              color: "var(--brand-fg)",
              border: 0,
              cursor: activeSpaceId ? "pointer" : "not-allowed",
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <I.plus color="var(--brand-fg)" size={16} />
            New category
          </button>
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          <div
            style={{
              fontFamily: "var(--font-num)",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.08em",
              fontWeight: 600,
              textTransform: "uppercase",
              padding: "0 4px 6px",
            }}
          >
            Active · {active.length}
          </div>
          <div
            style={{
              borderRadius: 14,
              background: "var(--bg-surface)",
              border: "1px solid var(--line-soft)",
              overflow: "hidden",
            }}
          >
            {active.length === 0 ? (
              <div style={{ padding: 20, color: "var(--ink-3)", fontSize: 13 }}>No categories yet.</div>
            ) : (
              active.map((c, idx) => (
                <CategoryListRow
                  key={c.id}
                  category={c}
                  last={idx === active.length - 1}
                  onEdit={() => setEditing(c)}
                  onArchive={() => handleArchive(c.id)}
                />
              ))
            )}
          </div>
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            style={{
              border: 0,
              background: "transparent",
              color: "var(--ink-2)",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              cursor: "pointer",
              padding: "6px 4px",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {showArchived ? "Hide" : "Show"} archived ({archived.length})
            <I.chev color="var(--ink-3)" />
          </button>
          {showArchived ? (
            <div
              style={{
                marginTop: 6,
                borderRadius: 14,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                overflow: "hidden",
              }}
            >
              {archived.length === 0 ? (
                <div style={{ padding: 20, color: "var(--ink-3)", fontSize: 13 }}>Nothing archived.</div>
              ) : (
                archived.map((c, idx) => (
                  <CategoryListRow
                    key={c.id}
                    category={c}
                    last={idx === archived.length - 1}
                    onEdit={() => setEditing(c)}
                    onRestore={() => handleRestore(c.id)}
                  />
                ))
              )}
            </div>
          ) : null}
        </div>

        {editing && activeSpaceId ? (
          <CategoryEditPanel
            mode="edit"
            category={editing}
            spaceId={activeSpaceId}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              setReloadCount((n) => n + 1);
            }}
          />
        ) : null}
        {creating && activeSpaceId ? (
          <CategoryEditPanel
            mode="create"
            category={null}
            spaceId={activeSpaceId}
            onClose={() => setCreating(false)}
            onSaved={() => {
              setCreating(false);
              setReloadCount((n) => n + 1);
            }}
          />
        ) : null}
      </div>
    </main>
  );
}

function CategoryListRow({
  category,
  last,
  onEdit,
  onArchive,
  onRestore,
}: {
  category: Category;
  last: boolean;
  onEdit: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 12,
        alignItems: "center",
        padding: "12px 14px",
        borderBottom: last ? "none" : "1px solid var(--line-soft)",
      }}
    >
      <CategoryDisc category={category} size={36} />
      <div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>
          {category.name}
        </div>
        <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>
          {category.kind === "expense" ? "Expense" : category.kind === "income" ? "Income" : "Transfer"}
          {category.is_system ? " · Built-in" : ""}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={onEdit}
          aria-label="Edit"
          style={iconBtnStyle()}
        >
          <I.edit color="var(--ink-2)" size={14} />
        </button>
        {onArchive ? (
          <button
            type="button"
            onClick={onArchive}
            aria-label="Archive"
            style={iconBtnStyle()}
          >
            <I.trash color="var(--ink-2)" size={14} />
          </button>
        ) : null}
        {onRestore ? (
          <button
            type="button"
            onClick={onRestore}
            aria-label="Restore"
            style={iconBtnStyle()}
          >
            <I.rollover color="var(--ink-2)" size={14} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function iconBtnStyle(): React.CSSProperties {
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
