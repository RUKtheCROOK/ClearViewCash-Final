"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  deleteBill,
  getAccountsForView,
  getBillPayments,
  getBillReminders,
  recordBillPayment,
  setBillReminder,
  undoBillPayment,
  type BillReminderRow,
} from "@cvc/api-client";
import {
  bucketForBill,
  daysUntilDue,
  formatLongDate,
  formatShortDate,
  resolveBillBranding,
  todayIso,
} from "@cvc/domain";
import type { Cadence } from "@cvc/types";
import { BillIcon } from "../_components/glyphs";
import { Num, fmtMoneyDollars } from "../_components/Num";
import { SwitchRow } from "../_components/SwitchRow";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface BillFull {
  id: string;
  space_id: string;
  owner_user_id: string;
  name: string;
  amount: number;
  next_due_at: string;
  cadence: Cadence;
  autopay: boolean;
  category: string | null;
  payee_hue: number | null;
  payee_glyph: string | null;
  notes: string | null;
  linked_account_id: string | null;
  source: "manual" | "detected";
}

interface PaymentRow {
  id: string;
  amount: number;
  paid_at: string;
  status: "paid" | "overdue" | "skipped";
  transaction_id: string | null;
  prev_next_due_at: string | null;
}

interface AccountLite {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
}

function accountLabel(accounts: AccountLite[], id: string | null): string | null {
  if (!id) return null;
  const a = accounts.find((x) => x.id === id);
  if (!a) return null;
  const name = a.display_name ?? a.name;
  return a.mask ? `${name.split(/\s+/).slice(0, 2).join(" ")} ··${a.mask}` : name;
}

export default function BillDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const billId = params?.id ?? "";
  const today = todayIso();

  const [authReady, setAuthReady] = useState(false);
  const [bill, setBill] = useState<BillFull | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [reminders, setReminders] = useState<BillReminderRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/sign-in");
        return;
      }
      setAuthReady(true);
    })();
  }, [router]);

  const reload = useCallback(async () => {
    if (!authReady || !billId) return;
    const { data, error: e } = await supabase.from("bills").select("*").eq("id", billId).single();
    if (e || !data) {
      setError(e?.message ?? "Bill not found");
      return;
    }
    setBill(data as BillFull);
    const [pays, rems, accts] = await Promise.all([
      getBillPayments(supabase, billId),
      getBillReminders(supabase, billId),
      getAccountsForView(supabase, { spaceId: data.space_id, sharedView: false }),
    ]);
    setPayments(pays as PaymentRow[]);
    setReminders(rems);
    setAccounts(
      (accts as Array<{ id: string; name: string; display_name: string | null; mask: string | null }>).map(
        (a) => ({ id: a.id, name: a.name, display_name: a.display_name, mask: a.mask }),
      ),
    );
  }, [authReady, billId]);

  useEffect(() => {
    reload();
  }, [reload, reloadCount]);

  const branding = useMemo(
    () =>
      bill
        ? resolveBillBranding(bill)
        : { hue: 220, glyph: "doc" as const },
    [bill],
  );

  const sortedPays = useMemo(
    () => [...payments].sort((a, b) => b.paid_at.localeCompare(a.paid_at)),
    [payments],
  );

  const detailBucket = useMemo(() => {
    if (!bill) return null;
    const latest = sortedPays[0];
    return bucketForBill(
      {
        next_due_at: bill.next_due_at,
        amount: bill.amount,
        autopay: bill.autopay,
        latest_payment: latest ? { paid_at: latest.paid_at } : null,
      },
      today,
    );
  }, [bill, sortedPays, today]);

  const sparkData = useMemo(() => {
    // Last 6 payments (oldest first); fall back to fewer if no history.
    return [...sortedPays.slice(0, 6)].reverse();
  }, [sortedPays]);

  const avgCents = useMemo(() => {
    if (payments.length === 0) return null;
    const sum = payments.reduce((s, p) => s + p.amount, 0);
    return Math.round(sum / payments.length);
  }, [payments]);

  function reminderState(kind: BillReminderRow["kind"], days_before: number | null) {
    const r = reminders.find(
      (x) => x.kind === kind && (x.days_before ?? null) === days_before,
    );
    return { exists: !!r, enabled: !!r?.enabled };
  }

  async function toggleReminder(
    kind: BillReminderRow["kind"],
    days_before: number | null,
    enabled: boolean,
  ) {
    if (!bill) return;
    setBusy(`rem-${kind}-${days_before ?? "x"}`);
    setError(null);
    try {
      await setBillReminder(supabase, {
        bill_id: bill.id,
        kind,
        days_before,
        enabled,
      });
      setReloadCount((c) => c + 1);
    } catch (e) {
      setError((e as Error).message ?? "Could not update reminder.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleAutopay() {
    if (!bill) return;
    setBusy("autopay");
    setError(null);
    try {
      const { error: e } = await supabase
        .from("bills")
        .update({ autopay: !bill.autopay })
        .eq("id", bill.id);
      if (e) throw e;
      setReloadCount((c) => c + 1);
    } catch (e) {
      setError((e as Error).message ?? "Could not toggle autopay.");
    } finally {
      setBusy(null);
    }
  }

  async function markPaid() {
    if (!bill) return;
    setBusy("pay");
    setError(null);
    try {
      await recordBillPayment(supabase, {
        bill_id: bill.id,
        amount: bill.amount,
        paid_at: today,
        cadence: bill.cadence,
        current_next_due_at: bill.next_due_at,
      });
      setReloadCount((c) => c + 1);
    } catch (e) {
      setError((e as Error).message ?? "Could not mark paid.");
    } finally {
      setBusy(null);
    }
  }

  async function unmarkPaid() {
    if (!bill) return;
    const latest = sortedPays[0];
    if (!latest) return;
    setBusy("pay");
    setError(null);
    try {
      await undoBillPayment(supabase, {
        payment_id: latest.id,
        bill_id: bill.id,
        cadence: bill.cadence,
        current_next_due_at: bill.next_due_at,
        prev_next_due_at: latest.prev_next_due_at,
      });
      setReloadCount((c) => c + 1);
    } catch (e) {
      setError((e as Error).message ?? "Could not unmark paid.");
    } finally {
      setBusy(null);
    }
  }

  async function onDelete() {
    if (!bill) return;
    if (!window.confirm("Delete this bill? Payment history will be kept.")) return;
    setBusy("delete");
    try {
      await deleteBill(supabase, bill.id);
      router.push("/bills");
    } catch (e) {
      setError((e as Error).message ?? "Could not delete bill.");
      setBusy(null);
    }
  }

  if (!authReady || !bill) {
    return (
      <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", padding: "40px 24px" }}>
        <p style={{ color: "var(--ink-3)" }}>{error ?? "Loading…"}</p>
      </main>
    );
  }

  const dueDays = daysUntilDue(bill.next_due_at, today);
  const dueLabel =
    dueDays < 0
      ? `${Math.abs(dueDays)} day${Math.abs(dueDays) === 1 ? "" : "s"} late`
      : dueDays === 0
        ? "today"
        : `${dueDays} day${dueDays === 1 ? "" : "s"}`;
  const accountText = accountLabel(accounts, bill.linked_account_id);

  const reminder3d = reminderState("days_before", 3);
  const reminderDue = reminderState("on_due_date", null);
  const reminderMute = reminderState("mute_all", null);

  return (
    <main
      style={{
        background: "var(--bg-canvas)",
        minHeight: "100vh",
        paddingBottom: 40,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Top nav */}
        <div style={{ padding: "14px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" onClick={() => router.back()} style={topBtn} aria-label="Back">
            <BackIcon />
          </button>
          <div style={{ flex: 1 }} />
        </div>

        {/* Hero */}
        <div style={{ padding: "10px 24px 18px", textAlign: "center" }}>
          <div style={{ display: "inline-flex", margin: "0 auto 14px" }}>
            <BillIcon hue={branding.hue} glyph={branding.glyph} size={64} radius={16} />
          </div>
          <div
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--ink-1)",
              letterSpacing: "-0.01em",
            }}
          >
            {bill.name}
          </div>
          <div style={{ fontFamily: "var(--font-ui)", fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>
            {[bill.category, bill.cadence].filter(Boolean).join(" · ")}
          </div>

          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: 11,
                color: "var(--ink-3)",
                textTransform: "uppercase",
                letterSpacing: "0.07em",
              }}
            >
              Next due
            </div>
            <Num
              style={{
                fontSize: 34,
                fontWeight: 600,
                color: "var(--ink-1)",
                letterSpacing: "-0.02em",
                marginTop: 4,
                display: "inline-block",
              }}
            >
              {fmtMoneyDollars(bill.amount)}
            </Num>
            <div style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>
              {formatShortDate(bill.next_due_at)} · {dueLabel}
              {bill.autopay && accountText ? (
                <>
                  {" · "}
                  <span style={{ color: "var(--brand)", fontWeight: 500 }}>Autopay from {accountText}</span>
                </>
              ) : accountText ? (
                <> · From {accountText}</>
              ) : null}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ padding: "0 16px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {detailBucket === "paid" ? (
            <DetailAction
              label={busy === "pay" ? "Saving…" : "Unmark paid"}
              disabled={busy === "pay"}
              onClick={unmarkPaid}
              icon={<UndoIcon color="var(--ink-1)" />}
            />
          ) : (
            <DetailAction
              label={busy === "pay" ? "Saving…" : "Mark paid"}
              disabled={busy === "pay"}
              onClick={markPaid}
              icon={<CheckIcon color="var(--ink-1)" />}
            />
          )}
          <DetailAction
            label="Edit"
            onClick={() => router.push(`/bills/${bill.id}/edit`)}
            icon={<EditIcon color="var(--ink-1)" />}
          />
          <DetailAction
            label={bill.autopay ? "Autopay on" : "Autopay off"}
            tinted
            disabled={busy === "autopay"}
            onClick={toggleAutopay}
            icon={<BoltIcon color="var(--brand)" />}
          />
        </div>

        {/* Payment history */}
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
            Payment history
          </span>
          <span style={{ fontFamily: "var(--font-num)", fontSize: 11, color: "var(--ink-3)" }}>
            {payments.length === 0 ? "none yet" : `last ${Math.min(6, payments.length)}`}
          </span>
          {avgCents != null ? (
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-num)",
                fontSize: 11.5,
                color: "var(--ink-2)",
              }}
            >
              avg {fmtMoneyDollars(avgCents)}
            </span>
          ) : null}
        </div>

        {sparkData.length > 0 ? (
          <Sparkline data={sparkData} />
        ) : (
          <div style={{ padding: "0 18px 6px" }}>
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                borderRadius: 12,
                padding: 14,
                color: "var(--ink-3)",
                fontSize: 12.5,
                textAlign: "center",
              }}
            >
              No payments recorded yet. Tap “Mark paid” after this bill clears.
            </div>
          </div>
        )}

        {sortedPays.length > 0 ? (
          <div
            style={{
              marginTop: 14,
              background: "var(--bg-surface)",
              borderTop: "1px solid var(--line-soft)",
              borderBottom: "1px solid var(--line-soft)",
            }}
          >
            {sortedPays.slice(0, 8).map((p, i) => (
              <div
                key={p.id}
                style={{
                  padding: "12px 18px",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  borderBottom:
                    i === Math.min(sortedPays.length, 8) - 1
                      ? "none"
                      : "1px solid var(--line-faint, var(--line-soft))",
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: p.status === "paid" ? "var(--pos-tint)" : "var(--bg-tinted)",
                    display: "grid",
                    placeItems: "center",
                    color: p.status === "paid" ? "var(--pos)" : "var(--ink-3)",
                  }}
                >
                  <CheckIcon color={p.status === "paid" ? "var(--pos)" : "var(--ink-3)"} />
                </span>
                <div>
                  <div style={{ fontFamily: "var(--font-ui)", fontSize: 13.5, color: "var(--ink-1)" }}>
                    {formatLongDate(p.paid_at)}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-ui)",
                      fontSize: 11,
                      color: "var(--ink-3)",
                      marginTop: 1,
                    }}
                  >
                    {bill.autopay ? "Autopay" : "Manual"}
                    {accountText ? ` · ${accountText}` : ""}
                  </div>
                </div>
                <Num style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink-2)" }}>
                  −{fmtMoneyDollars(p.amount)}
                </Num>
              </div>
            ))}
          </div>
        ) : null}

        {/* Reminders */}
        <div style={{ padding: "18px 16px 0" }}>
          <div
            style={{
              padding: "0 4px 8px",
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--ink-1)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Reminders
          </div>
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--line-soft)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <SwitchRow
              icon={<BellIcon color="var(--ink-2)" />}
              title="3 days before due"
              subtitle={`${formatShortDate(addDays(bill.next_due_at, -3))} · 9:00 AM`}
              on={reminder3d.exists && reminder3d.enabled}
              onToggle={(on) => toggleReminder("days_before", 3, on)}
            />
            <SwitchRow
              icon={<BellIcon color="var(--ink-2)" />}
              title="On due date"
              subtitle={`${formatShortDate(bill.next_due_at)} · 9:00 AM`}
              on={reminderDue.exists && reminderDue.enabled}
              onToggle={(on) => toggleReminder("on_due_date", null, on)}
            />
            <SwitchRow
              icon={<BellOffIcon color="var(--ink-2)" />}
              title="Mute all reminders"
              subtitle="Useful while autopay is on"
              on={reminderMute.exists && reminderMute.enabled}
              onToggle={(on) => toggleReminder("mute_all", null, on)}
              last
            />
          </div>
        </div>

        {/* Notes */}
        {bill.notes ? (
          <div style={{ padding: "18px 16px 0" }}>
            <div
              style={{
                padding: "0 4px 8px",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink-1)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Notes
            </div>
            <div
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                borderRadius: 12,
                padding: 14,
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-2)",
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
              }}
            >
              {bill.notes}
            </div>
          </div>
        ) : null}

        {error ? (
          <p style={{ color: "var(--neg)", padding: "12px 16px 0", fontSize: 12 }}>{error}</p>
        ) : null}

        {/* Delete */}
        <div style={{ padding: "18px 16px 0" }}>
          <button
            type="button"
            onClick={onDelete}
            disabled={busy === "delete"}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              background: "transparent",
              border: "1px solid var(--line-firm)",
              color: "var(--neg)",
              fontFamily: "var(--font-ui)",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: busy === "delete" ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <TrashIcon color="var(--neg)" />
            {busy === "delete" ? "Deleting…" : "Delete bill"}
          </button>
        </div>
      </div>
    </main>
  );
}

function Sparkline({ data }: { data: PaymentRow[] }) {
  const W = 320;
  const H = 64;
  const padX = 16;
  const max = Math.max(...data.map((p) => p.amount), 1);
  const barW = data.length === 0 ? 0 : (W - padX * 2) / data.length - 8;
  return (
    <div style={{ padding: "0 18px 6px" }}>
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--line-soft)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: "block" }}>
          <line x1={0} y1={H - 6} x2={W} y2={H - 6} stroke="var(--line-firm)" strokeWidth={1} />
          {data.map((p, i) => {
            const x = padX + i * (barW + 8);
            const h = Math.max(4, ((p.amount / max) * (H - 18)));
            const isLast = i === data.length - 1;
            const date = new Date(`${p.paid_at}T00:00:00`);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return (
              <g key={p.id}>
                <rect
                  x={x}
                  y={H - 6 - h}
                  width={barW}
                  height={h}
                  rx={4}
                  fill={isLast ? "var(--brand)" : "var(--bg-tinted)"}
                />
                <text
                  x={x + barW / 2}
                  y={H - 0}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--ink-3)"
                  fontFamily="var(--font-num)"
                >
                  {months[date.getMonth()]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function DetailAction({
  label,
  icon,
  tinted,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  tinted?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        appearance: "none",
        cursor: disabled ? "wait" : "pointer",
        padding: "12px 0",
        borderRadius: 12,
        background: tinted ? "var(--brand-tint)" : "var(--bg-tinted)",
        color: tinted ? "var(--brand)" : "var(--ink-1)",
        border: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-ui)",
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const topBtn: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  background: "var(--bg-tinted)",
  border: 0,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  color: "var(--ink-2)",
};

function BackIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}

function UndoIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14l-5-5 5-5" />
      <path d="M4 9h11a5 5 0 010 10h-3" />
    </svg>
  );
}

function EditIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />
    </svg>
  );
}

function BoltIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill={color}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

function BellIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 1112 0v5l2 3H4l2-3V8z" />
      <path d="M10 19a2 2 0 004 0" />
    </svg>
  );
}

function BellOffIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M6 8a6 6 0 0110-4M18 13l2 3H8" />
    </svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}
