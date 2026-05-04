"use client";
import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  detectRecurring,
  nextDueFromCadence,
  normalizeMerchant,
  type RecurringGroup,
} from "@cvc/domain";
import {
  tagTransactionsRecurring,
  upsertBill,
  upsertIncomeEvent,
} from "@cvc/api-client";

const DISMISS_KEY = "cvc-recurring-dismissed-v1";

interface MinimalTxn {
  id: string;
  merchant_name: string | null;
  amount: number;
  posted_at: string;
  pending: boolean;
  is_recurring: boolean;
}

interface Props {
  client: SupabaseClient<Database>;
  txns: MinimalTxn[];
  spaceId: string | null;
  onPromoted: () => void;
}

function dayOfMonth(iso: string): number {
  const d = new Date(iso);
  const day = d.getUTCDate();
  if (Number.isFinite(day) && day >= 1 && day <= 31) return day;
  return 1;
}

function readDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function writeDismissed(set: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(set)));
}

export function SuggestionsBanner({ client, txns, spaceId, onPromoted }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(readDismissed());
  }, []);

  const groups = useMemo(() => {
    const recurringIds = new Set(txns.filter((t) => t.is_recurring).map((t) => t.id));
    const detected = detectRecurring(txns as never);
    return detected.filter((g: RecurringGroup) => {
      if (g.transaction_ids.every((id) => recurringIds.has(id))) return false;
      if (dismissed.has(normalizeMerchant(g.merchant_name))) return false;
      return true;
    });
  }, [txns, dismissed]);

  if (groups.length === 0) return null;

  async function promote(group: RecurringGroup) {
    if (!spaceId) {
      setError("Switch to a space to promote this pattern.");
      return;
    }
    setBusy(group.id);
    setError(null);
    try {
      const { data: u } = await client.auth.getUser();
      const userId = u.user?.id;
      if (!userId) throw new Error("Not signed in");
      const next_due_at = nextDueFromCadence(group.last_seen, group.cadence);
      const due_day = dayOfMonth(group.last_seen);
      const payload = {
        space_id: spaceId,
        owner_user_id: userId,
        name: group.merchant_name,
        amount: Math.abs(group.median_amount),
        due_day,
        cadence: group.cadence,
        next_due_at,
        autopay: false,
        linked_account_id: null,
        source: "detected" as const,
        recurring_group_id: null,
        category: null,
      };
      if (group.is_inbound) {
        await upsertIncomeEvent(client, payload);
      } else {
        await upsertBill(client, payload);
      }
      await tagTransactionsRecurring(client, { ids: group.transaction_ids });
      onPromoted();
    } catch (e) {
      setError((e as Error).message ?? "Could not promote pattern.");
    } finally {
      setBusy(null);
    }
  }

  function dismiss(group: RecurringGroup) {
    const next = new Set(dismissed);
    next.add(normalizeMerchant(group.merchant_name));
    setDismissed(next);
    writeDismissed(next);
  }

  function fmtMoney(cents: number): string {
    return `$${(Math.abs(cents) / 100).toFixed(2)}`;
  }

  return (
    <div
      className="card"
      style={{
        marginBottom: 16,
        padding: 20,
        background: "var(--bg)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 600 }}>Suggested patterns</div>
          <div className="muted" style={{ fontSize: 12 }}>
            We noticed {groups.length} repeating {groups.length === 1 ? "charge" : "charges"} that
            aren&apos;t tracked yet.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="muted"
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
        >
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {error ? <p style={{ color: "var(--negative)", marginTop: 8 }}>{error}</p> : null}

      {!collapsed
        ? groups.map((g) => {
            const promoting = busy === g.id;
            return (
              <div
                key={g.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                  borderTop: "1px solid var(--border)",
                  marginTop: 8,
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: "1 1 200px" }}>
                  <div>{g.merchant_name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {g.cadence} · {fmtMoney(g.median_amount)} · last seen {g.last_seen}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => dismiss(g)}
                    className="btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: 13 }}
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={() => promote(g)}
                    disabled={promoting}
                    className="btn btn-primary"
                    style={{ padding: "6px 12px", fontSize: 13 }}
                  >
                    {promoting
                      ? "Saving…"
                      : g.is_inbound
                        ? "Promote to income"
                        : "Promote to bill"}
                  </button>
                </div>
              </div>
            );
          })
        : null}
    </div>
  );
}
