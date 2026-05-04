"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { getBudgets, getMySpaces, getTransactionsForView } from "@cvc/api-client";
import {
  computeRolloverCents,
  computeSpentByCategory,
  effectiveLimit,
  type CategorizedTxn,
} from "@cvc/domain";
import { EditPanel, type EditableBudget } from "./EditPanel";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface Space {
  id: string;
  name: string;
  tint: string;
  kind: "personal" | "shared";
}

export default function BudgetsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [sharedView, setSharedView] = useState(false);
  const [budgets, setBudgets] = useState<EditableBudget[]>([]);
  const [txns60d, setTxns60d] = useState<CategorizedTxn[]>([]);
  const [editing, setEditing] = useState<EditableBudget | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
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
      const list = rows as unknown as Space[];
      setSpaces(list);
      const first = list[0];
      if (first && !activeSpaceId) {
        const stored =
          typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
        const found = stored ? list.find((s) => s.id === stored) : null;
        setActiveSpaceId(found ? found.id : first.id);
      }
    });
  }, [signedIn, activeSpaceId]);

  useEffect(() => {
    if (!signedIn || !activeSpaceId) return;
    getBudgets(supabase, activeSpaceId).then((rows) => {
      setBudgets(rows as unknown as EditableBudget[]);
    });
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 1);
    since.setUTCDate(1);
    getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView,
      since: since.toISOString().slice(0, 10),
      fields: "category, amount, posted_at",
      limit: 2000,
    }).then((rows) => setTxns60d(rows as unknown as CategorizedTxn[]));
  }, [signedIn, activeSpaceId, sharedView, reloadCount]);

  const monthStart = useMemo(() => {
    const d = new Date();
    d.setUTCDate(1);
    return d.toISOString().slice(0, 10);
  }, []);

  const spent = useMemo(
    () => computeSpentByCategory(txns60d.filter((t) => t.posted_at >= monthStart)),
    [txns60d, monthStart],
  );

  function fmtMoney(cents: number): string {
    const sign = cents < 0 ? "-" : "";
    const abs = Math.abs(cents) / 100;
    return `${sign}$${abs.toFixed(2)}`;
  }

  function openCreate() {
    setEditing(null);
    setPanelOpen(true);
  }

  function openEdit(b: EditableBudget) {
    setEditing(b);
    setPanelOpen(true);
  }

  if (!authReady) {
    return (
      <main className="container" style={{ padding: "40px 0" }}>
        <p className="muted">Loading…</p>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="container" style={{ padding: "80px 0", maxWidth: 460 }}>
        <h1>Budgets</h1>
        <p className="muted" style={{ marginTop: 16 }}>
          Sign in to view your budgets.
        </p>
        <button
          className="btn btn-primary"
          style={{ marginTop: 16 }}
          onClick={() => router.push("/sign-in")}
        >
          Sign in
        </button>
      </main>
    );
  }

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) ?? null;

  return (
    <main className="container" style={{ padding: "32px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h1 style={{ margin: 0 }}>Budgets</h1>
        <Link href="/" className="muted" style={{ fontSize: 14 }}>
          ← Home
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <label className="muted" style={{ fontSize: 13 }}>
          Space
        </label>
        <select
          value={activeSpaceId ?? ""}
          onChange={(e) => {
            setActiveSpaceId(e.target.value);
            if (typeof window !== "undefined")
              localStorage.setItem("cvc-active-space", e.target.value);
          }}
          style={selectStyle}
        >
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.kind === "personal" ? "(personal)" : ""}
            </option>
          ))}
        </select>
        {activeSpace && activeSpace.kind !== "personal" ? (
          <button
            className={sharedView ? "btn btn-primary" : "btn btn-secondary"}
            style={{ padding: "8px 14px", fontSize: 14 }}
            onClick={() => setSharedView((v) => !v)}
          >
            {sharedView ? "Shared view" : "My view"}
          </button>
        ) : null}
        <button
          className="btn btn-primary"
          style={{ marginLeft: "auto", padding: "8px 14px", fontSize: 14 }}
          onClick={openCreate}
        >
          + Add budget
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: "center" }}>
          <p className="muted" style={{ marginBottom: 16 }}>
            No budgets set yet.
          </p>
          <button className="btn btn-primary" onClick={openCreate}>
            Create your first budget
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {budgets.map((b) => {
            const used = spent[b.category] ?? 0;
            const rollover = computeRolloverCents(b, txns60d);
            const cap = effectiveLimit(b, rollover);
            const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
            const over = used > cap;
            return (
              <div
                key={b.id}
                onClick={() => openEdit(b)}
                className="card"
                style={{ padding: 20, cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ fontSize: 17 }}>{b.category}</strong>
                  <span className="muted" style={{ fontSize: 13 }}>
                    {b.period}
                  </span>
                </div>
                {rollover > 0 ? (
                  <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    + {fmtMoney(rollover)} rollover
                  </div>
                ) : null}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 10,
                    fontSize: 14,
                  }}
                >
                  <span>{fmtMoney(used)}</span>
                  <span className="muted">of {fmtMoney(cap)}</span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: "var(--border)",
                    borderRadius: 999,
                    marginTop: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: over ? "var(--negative)" : "var(--primary)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <EditPanel
        client={supabase}
        open={panelOpen}
        spaceId={activeSpaceId}
        budget={editing}
        recentTxns={txns60d}
        existingCategories={budgets.map((b) => b.category)}
        onClose={() => setPanelOpen(false)}
        onSaved={() => setReloadCount((c) => c + 1)}
      />
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 15,
  background: "var(--surface)",
  color: "var(--text)",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "8px 10px",
};
