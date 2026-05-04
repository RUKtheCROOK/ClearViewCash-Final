"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  getBillsWithLatestPayment,
  getMySpaces,
  getTransactionsForView,
  recordBillPayment,
} from "@cvc/api-client";
import { computeBillStatus, todayIso, type BillCycleStatus } from "@cvc/domain";
import type { Cadence } from "@cvc/types";
import { EditPanel, type EditableBill } from "./EditPanel";
import { Calendar } from "./Calendar";
import { SuggestionsBanner } from "../transactions/SuggestionsBanner";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface BillRow {
  id: string;
  space_id: string;
  owner_user_id: string;
  name: string;
  amount: number;
  next_due_at: string;
  cadence: Cadence;
  autopay: boolean;
  source: "detected" | "manual";
  recurring_group_id: string | null;
  latest_payment: {
    id: string;
    amount: number;
    paid_at: string;
    status: "paid" | "overdue" | "skipped";
  } | null;
}

interface MinimalTxn {
  id: string;
  merchant_name: string | null;
  amount: number;
  posted_at: string;
  pending: boolean;
  is_recurring: boolean;
}

interface Space {
  id: string;
  name: string;
  tint: string;
  kind: "personal" | "shared";
}

type StatusFilter = "all" | BillCycleStatus;
type CadenceFilter = "all" | "recurring" | "one_time";
type AutopayFilter = "all" | "autopay" | "manual";
type ViewMode = "list" | "calendar";

const STATUS_LABEL: Record<BillCycleStatus, string> = {
  overdue: "Overdue",
  due_soon: "Due soon",
  upcoming: "Upcoming",
};

const STATUS_COLOR: Record<BillCycleStatus, string> = {
  overdue: "var(--negative, #DC2626)",
  due_soon: "var(--warning, #F59E0B)",
  upcoming: "var(--positive, #16A34A)",
};

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

export default function BillsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [outflowTxns, setOutflowTxns] = useState<MinimalTxn[]>([]);
  const [editing, setEditing] = useState<EditableBill | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cadenceFilter, setCadenceFilter] = useState<CadenceFilter>("all");
  const [autopayFilter, setAutopayFilter] = useState<AutopayFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarSelectedIso, setCalendarSelectedIso] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const today = todayIso();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(!!data.session);
      setOwnerUserId(data.session?.user?.id ?? null);
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
        const stored = typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
        const found = stored ? list.find((s) => s.id === stored) : null;
        setActiveSpaceId(found ? found.id : first.id);
      }
    });
  }, [signedIn, activeSpaceId]);

  const reload = useCallback(() => {
    if (!activeSpaceId) return;
    getBillsWithLatestPayment(supabase, activeSpaceId).then((rows) =>
      setBills(rows as unknown as BillRow[]),
    );
    getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView: false,
      limit: 200,
      fields: "id, merchant_name, amount, posted_at, pending, is_recurring",
    }).then((rows) => {
      const minimal = (rows as unknown as MinimalTxn[]).filter((t) => t.amount < 0);
      setOutflowTxns(minimal);
    });
  }, [activeSpaceId]);

  useEffect(() => {
    if (!signedIn) return;
    reload();
  }, [signedIn, reload, reloadCount]);

  const filtered = useMemo(() => {
    return bills.filter((b) => {
      const status = computeBillStatus(b.next_due_at, today);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (cadenceFilter === "recurring" && b.cadence === "custom") return false;
      if (cadenceFilter === "one_time" && b.cadence !== "custom") return false;
      if (autopayFilter === "autopay" && !b.autopay) return false;
      if (autopayFilter === "manual" && b.autopay) return false;
      if (viewMode === "calendar" && calendarSelectedIso && b.next_due_at !== calendarSelectedIso) {
        return false;
      }
      return true;
    });
  }, [bills, statusFilter, cadenceFilter, autopayFilter, viewMode, calendarSelectedIso, today]);

  async function markPaid(b: BillRow) {
    setBusy(b.id);
    setError(null);
    try {
      await recordBillPayment(supabase, {
        bill_id: b.id,
        amount: b.amount,
        paid_at: today,
        cadence: b.cadence,
        current_next_due_at: b.next_due_at,
      });
      setReloadCount((c) => c + 1);
    } catch (e) {
      setError((e as Error).message ?? "Could not mark paid.");
    } finally {
      setBusy(null);
    }
  }

  function openCreate() {
    setEditing(null);
    setPanelOpen(true);
  }

  function openEdit(b: BillRow) {
    setEditing({
      id: b.id,
      space_id: b.space_id,
      owner_user_id: b.owner_user_id,
      name: b.name,
      amount: b.amount,
      cadence: b.cadence,
      next_due_at: b.next_due_at,
      autopay: b.autopay,
      source: b.source,
      recurring_group_id: b.recurring_group_id,
    });
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
        <h1>Bills</h1>
        <p className="muted" style={{ marginTop: 16 }}>
          Sign in to view your bills.
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

  return (
    <main className="container" style={{ padding: "32px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Bills</h1>
        <Link href="/" className="muted" style={{ fontSize: 14 }}>
          ← Home
        </Link>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <label className="muted" style={{ fontSize: 13 }}>Space</label>
        <select
          value={activeSpaceId ?? ""}
          onChange={(e) => {
            setActiveSpaceId(e.target.value);
            if (typeof window !== "undefined") localStorage.setItem("cvc-active-space", e.target.value);
          }}
          style={selectStyle}
        >
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.kind === "personal" ? "(personal)" : ""}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={openCreate}>
          + Add bill
        </button>
      </div>

      <SuggestionsBanner
        client={supabase}
        txns={outflowTxns}
        spaceId={activeSpaceId}
        onPromoted={() => setReloadCount((c) => c + 1)}
      />

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <button
          className={viewMode === "list" ? "btn btn-primary" : "btn btn-secondary"}
          style={pillBtnStyle}
          onClick={() => setViewMode("list")}
        >
          List
        </button>
        <button
          className={viewMode === "calendar" ? "btn btn-primary" : "btn btn-secondary"}
          style={pillBtnStyle}
          onClick={() => setViewMode("calendar")}
        >
          Calendar
        </button>
      </div>

      {viewMode === "calendar" ? (
        <div style={{ marginBottom: 16 }}>
          <Calendar
            bills={bills.map((b) => ({ id: b.id, next_due_at: b.next_due_at }))}
            todayIso={today}
            selectedIso={calendarSelectedIso}
            onSelectDay={setCalendarSelectedIso}
          />
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {(["all", "overdue", "due_soon", "upcoming"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={statusFilter === s ? "btn btn-primary" : "btn btn-secondary"}
            style={pillBtnStyle}
          >
            {s === "all" ? "All" : STATUS_LABEL[s as BillCycleStatus]}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {(["all", "recurring", "one_time"] as CadenceFilter[]).map((c) => (
          <button
            key={c}
            onClick={() => setCadenceFilter(c)}
            className={cadenceFilter === c ? "btn btn-primary" : "btn btn-secondary"}
            style={pillBtnStyle}
          >
            {c === "all" ? "All cadences" : c === "one_time" ? "One-time" : "Recurring"}
          </button>
        ))}
        <button
          onClick={() => setAutopayFilter(autopayFilter === "autopay" ? "all" : "autopay")}
          className={autopayFilter === "autopay" ? "btn btn-primary" : "btn btn-secondary"}
          style={pillBtnStyle}
        >
          Autopay
        </button>
        <button
          onClick={() => setAutopayFilter(autopayFilter === "manual" ? "all" : "manual")}
          className={autopayFilter === "manual" ? "btn btn-primary" : "btn btn-secondary"}
          style={pillBtnStyle}
        >
          Manual
        </button>
      </div>

      {error ? <p style={{ color: "var(--negative, #DC2626)" }}>{error}</p> : null}

      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <p className="muted" style={{ padding: 24, margin: 0 }}>
            {bills.length === 0
              ? "No bills yet. Click Add bill to create one or let us detect them from transactions."
              : "No bills match the current filters."}
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {filtered.map((b) => {
              const status = computeBillStatus(b.next_due_at, today);
              const isPaying = busy === b.id;
              return (
                <li
                  key={b.id}
                  onClick={() => openEdit(b)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px 20px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    gap: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{b.name}</div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                      Due {b.next_due_at} · {b.cadence}
                      {b.autopay ? " · autopay" : ""}
                      {b.source === "detected" ? " · auto-detected" : ""}
                    </div>
                    {b.latest_payment ? (
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        Last paid {b.latest_payment.paid_at}
                      </div>
                    ) : null}
                  </div>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: STATUS_COLOR[status],
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    {STATUS_LABEL[status]}
                  </span>
                  <span style={{ fontWeight: 600 }}>{fmtMoney(b.amount)}</span>
                  <button
                    className="btn btn-primary"
                    style={{ padding: "8px 14px", fontSize: 13 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      markPaid(b);
                    }}
                    disabled={isPaying}
                  >
                    {isPaying ? "Saving…" : "Mark paid"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <EditPanel
        client={supabase}
        bill={editing}
        open={panelOpen}
        spaceId={activeSpaceId}
        ownerUserId={ownerUserId}
        onClose={() => setPanelOpen(false)}
        onSaved={() => setReloadCount((c) => c + 1)}
      />
    </main>
  );
}

const pillBtnStyle: React.CSSProperties = {
  padding: "6px 14px",
  fontSize: 13,
};

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
