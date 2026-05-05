"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  computeVariability,
  forecastAmount,
  incomeLabelForType,
  isPaused,
  isVariable,
  todayIso,
} from "@cvc/domain";
import {
  deleteIncomeEvent,
  getAccountsForView,
  getIncomeEventById,
  getIncomeReceipts,
  pauseIncomeEvent,
  resumeIncomeEvent,
} from "@cvc/api-client";
import { IncomeIcon } from "../_components/IncomeIcon";
import { Num, fmtMoneyShort, fmtMoneyDollars, fmtMoneyRange } from "../_components/Num";
import { VariabilityChart } from "../_components/VariabilityChart";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

type IncomeRow = Database["public"]["Tables"]["income_events"]["Row"];
type IncomeReceiptRow = Database["public"]["Tables"]["income_receipts"]["Row"];

interface AccountLite {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function depositDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function approxDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function cadenceLabel(c: string): string {
  switch (c) {
    case "weekly":   return "weekly";
    case "biweekly": return "bi-weekly";
    case "monthly":  return "monthly";
    case "yearly":   return "yearly";
    case "custom":   return "custom";
    case "once":     return "one-time";
    default:         return c;
  }
}

export default function IncomeDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const today = todayIso();

  const [item, setItem] = useState<IncomeRow | null>(null);
  const [receipts, setReceipts] = useState<IncomeReceiptRow[]>([]);
  const [account, setAccount] = useState<AccountLite | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    const it = await getIncomeEventById(supabase, id);
    setItem(it as IncomeRow | null);
    if (it) {
      const list = await getIncomeReceipts(supabase, id, { limit: 50 });
      setReceipts(list as IncomeReceiptRow[]);
      if (it.linked_account_id) {
        const accts = await getAccountsForView(supabase, { spaceId: it.space_id, sharedView: false });
        const found = (accts as Array<AccountLite>).find((a) => a.id === it.linked_account_id);
        setAccount(found ?? null);
      } else {
        setAccount(null);
      }
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const variability = useMemo(() => {
    if (receipts.length === 0) return null;
    return computeVariability(
      receipts.map((r) => ({ income_event_id: r.income_event_id, amount: r.amount, received_at: r.received_at })),
      6,
    );
  }, [receipts]);

  const daysUntil = useMemo(() => {
    if (!item) return 0;
    const next = new Date(`${item.next_due_at}T00:00:00`).getTime();
    const now = new Date(`${today}T00:00:00`).getTime();
    return Math.round((next - now) / 86_400_000);
  }, [item, today]);

  if (!item) {
    return (
      <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", padding: "40px 24px" }}>
        <button
          type="button"
          onClick={() => router.push("/income")}
          style={{
            background: "var(--bg-tinted)", border: 0, padding: "8px 12px", borderRadius: 999,
            cursor: "pointer", color: "var(--ink-2)", fontFamily: "var(--font-ui)", fontSize: 12,
          }}
        >
          ← Back
        </button>
        <p style={{ color: "var(--ink-3)", marginTop: 24 }}>Loading…</p>
      </main>
    );
  }

  const paused = isPaused(item);
  const variable = isVariable(item);
  const forecastCents = forecastAmount({
    id: item.id,
    name: item.name,
    amount: item.amount,
    amount_low: item.amount_low,
    amount_high: item.amount_high,
    cadence: item.cadence,
    next_due_at: item.next_due_at,
    source_type: item.source_type,
    paused_at: item.paused_at,
    received_at: item.received_at,
    actual_amount: item.actual_amount,
  });

  async function togglePause() {
    if (!item) return;
    setBusy("pause");
    setError(null);
    try {
      if (paused) await resumeIncomeEvent(supabase, item.id);
      else await pauseIncomeEvent(supabase, item.id);
      await reload();
    } catch (e) {
      setError((e as Error).message ?? "Could not update.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmDelete() {
    if (!item) return;
    if (!window.confirm("Delete this income source and its receipt history?")) return;
    setBusy("delete");
    try {
      await deleteIncomeEvent(supabase, item.id);
      router.push("/income");
    } catch (e) {
      setError((e as Error).message ?? "Could not delete.");
      setBusy(null);
    }
  }

  const accountText = account
    ? `${account.display_name ?? account.name}${account.mask ? ` ··${account.mask}` : ""}`
    : null;
  const typeLabel = `${incomeLabelForType(item.source_type)} · ${cadenceLabel(item.cadence)}${variable ? " · variable" : ""}`;
  const expectedAmount = variable && item.amount_low != null && item.amount_high != null
    ? fmtMoneyRange(item.amount_low, item.amount_high)
    : fmtMoneyShort(forecastCents);

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 28 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Top nav */}
        <div style={{ padding: "14px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => router.push("/income")}
            aria-label="Back"
            style={{
              width: 36, height: 36, borderRadius: 999,
              background: "var(--bg-tinted)", border: 0, cursor: "pointer",
              display: "grid", placeItems: "center",
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <div style={{ flex: 1 }} />
        </div>

        {/* Hero */}
        <div style={{ padding: "10px 24px 18px", textAlign: "center" }}>
          <div style={{ display: "inline-block", marginBottom: 14 }}>
            <IncomeIcon sourceType={item.source_type} size={64} radius={16} dim={paused} />
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 22, fontWeight: 500, color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
            {item.name}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>
            {typeLabel}
          </div>

          {item.cadence !== "once" || !item.received_at ? (
            <>
              <div style={{ marginTop: 18, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                {item.cadence === "once" ? "Expected" : "Next expected"}
              </div>
              <Num style={{ marginTop: 4, fontSize: 30, fontWeight: 600, color: "var(--ink-1)", letterSpacing: "-0.02em" }}>
                {expectedAmount}
              </Num>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
                ~{approxDateLabel(item.next_due_at)} ·{" "}
                <span>
                  {paused ? "paused" : daysUntil < 0 ? `${-daysUntil} days late` : daysUntil === 0 ? "today" : `${daysUntil} days`}
                </span>
                {accountText ? (
                  <>
                    {" · "}
                    <span style={{ color: "var(--pos)", fontWeight: 500 }}>lands in {accountText}</span>
                  </>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <div style={{ marginTop: 18, fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Received
              </div>
              <Num style={{ marginTop: 4, fontSize: 30, fontWeight: 600, color: "var(--pos)", letterSpacing: "-0.02em" }}>
                +{fmtMoneyDollars(item.actual_amount ?? item.amount)}
              </Num>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
                on {depositDateLabel(item.received_at!)}
              </div>
            </>
          )}
        </div>

        {/* Quick actions */}
        <div style={{ padding: "0 16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <button
            type="button"
            disabled
            title="Use the wizard or edit page (coming soon)."
            style={{
              padding: "12px 0",
              borderRadius: 12,
              background: "var(--bg-tinted)",
              color: "var(--ink-1)",
              border: 0,
              cursor: "not-allowed",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 500,
              opacity: 0.7,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />
            </svg>
            Edit
          </button>
          <button
            type="button"
            onClick={togglePause}
            disabled={busy === "pause"}
            style={{
              padding: "12px 0",
              borderRadius: 12,
              background: "var(--bg-tinted)",
              color: "var(--ink-1)",
              border: 0,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill={paused ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              {paused ? <path d="M8 5l11 7-11 7V5z" /> : <path d="M9 5v14M15 5v14" />}
            </svg>
            {busy === "pause" ? "…" : paused ? "Resume" : "Pause"}
          </button>
          <div
            style={{
              padding: "12px 0",
              borderRadius: 12,
              background: "var(--pos-tint)",
              color: "var(--pos)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 11-3-6.7" />
              <path d="M21 4v5h-5" />
            </svg>
            {paused ? "Paused" : "Active"}
          </div>
        </div>

        {/* Variability chart */}
        {variability ? (
          <>
            <div style={{ padding: "0 18px 8px", display: "flex", alignItems: "baseline", gap: 8 }}>
              <span
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink-1)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Variability
              </span>
              <span style={{ fontFamily: "var(--font-num)", fontSize: 11, color: "var(--ink-3)" }}>
                last {variability.recent.length}
              </span>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-num)", fontSize: 11.5, color: "var(--ink-2)" }}>
                avg <Num style={{ color: "var(--ink-1)" }}>{fmtMoneyShort(variability.averageCents)}</Num>
              </span>
            </div>
            <VariabilityChart
              receipts={variability.recent.map((r) => ({ iso: r.received_at, amount: r.amount }))}
              averageCents={variability.averageCents}
            />
          </>
        ) : null}

        {/* Deposits list */}
        <div
          style={{
            marginTop: 14,
            background: "var(--bg-surface)",
            borderTop: "1px solid var(--line-soft)",
            borderBottom: "1px solid var(--line-soft)",
          }}
        >
          {receipts.length === 0 ? (
            <p style={{ padding: 18, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-3)", margin: 0 }}>
              No deposits recorded yet.
            </p>
          ) : (
            receipts.map((r, i) => (
              <div
                key={r.id}
                style={{
                  padding: "12px 18px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  borderBottom: i === receipts.length - 1 ? "none" : "1px solid var(--line-soft)",
                }}
              >
                <span
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: "var(--pos-tint)", color: "var(--pos)",
                    display: "grid", placeItems: "center",
                  }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </span>
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-1)", fontWeight: 500 }}>
                    {depositDateLabel(r.received_at)}
                  </div>
                  {accountText ? (
                    <div style={{ fontFamily: "var(--font-ui)", fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>
                      Direct deposit · {accountText}
                    </div>
                  ) : null}
                </div>
                <Num style={{ fontSize: 13.5, fontWeight: 500, color: "var(--pos)" }}>+{fmtMoneyDollars(r.amount)}</Num>
              </div>
            ))
          )}
        </div>

        {error ? (
          <p style={{ padding: "12px 18px 0", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--neg)" }}>{error}</p>
        ) : null}

        {/* Destructive */}
        <div style={{ padding: "18px 16px 0" }}>
          <button
            type="button"
            onClick={confirmDelete}
            disabled={busy === "delete"}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              background: "transparent",
              border: "1px solid var(--line-firm)",
              color: "var(--warn)",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: busy === "delete" ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
            </svg>
            {busy === "delete" ? "Deleting…" : "Delete income source"}
          </button>
        </div>
      </div>
    </main>
  );
}
