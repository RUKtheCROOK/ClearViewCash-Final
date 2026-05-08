"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import { deleteAccounts, getAccountsForPlaidItem, getPlaidItem } from "@cvc/api-client";
import { Group, PageHeader, ProChip, SectionLabel } from "../../_components/SettingsAtoms";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface AccountRow {
  id: string;
  name: string;
  mask: string | null;
  type: string;
  current_balance: number | null;
}

interface ItemDetail {
  id: string;
  institution_name: string | null;
  status: string;
}

function fmtMoney(cents: number | null): string {
  if (cents == null) return "—";
  const v = cents / 100;
  return v.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function ConnectedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const [itm, accs] = await Promise.all([getPlaidItem(supabase, id), getAccountsForPlaidItem(supabase, id)]);
      if (cancelled) return;
      setItem(itm as ItemDetail | null);
      const rows = accs as AccountRow[];
      setAccounts(rows);
      setSelected(new Set(rows.map((a) => a.id)));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function toggle(accId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(accId)) next.delete(accId);
      else next.add(accId);
      return next;
    });
    setConfirming(false);
  }

  const allSelected = accounts.length > 0 && selected.size === accounts.length;
  const noneSelected = selected.size === 0;

  async function performRemove() {
    if (noneSelected || !item) return;
    setRemoving(true);
    setError(null);
    try {
      if (allSelected) {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-item-remove`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ plaid_item_row_id: item.id }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
        }
      } else {
        await deleteAccounts(supabase, Array.from(selected));
      }
      router.push("/settings/connected");
    } catch (e) {
      setError((e as Error).message);
      setRemoving(false);
    }
  }

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 60 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <PageHeader
          title={item?.institution_name ?? "Connected service"}
          sub={loading ? "Loading…" : `Status: ${item?.status ?? "unknown"}`}
          backHref="/settings/connected"
          onBack={() => router.push("/settings/connected")}
        />

        <div style={{ padding: "4px 18px 12px", fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5 }}>
          Select accounts to remove. Removing all of them disconnects the service from ClearViewCash and revokes access at Plaid. Removing some keeps the connection alive.
        </div>

        <SectionLabel>ACCOUNTS</SectionLabel>
        <Group>
          {accounts.length === 0 ? (
            <div style={{ padding: 18, fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-3)" }}>No accounts.</div>
          ) : (
            <>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setSelected(allSelected ? new Set() : new Set(accounts.map((a) => a.id)))}
                style={{
                  padding: "12px 18px",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  borderBottom: "1px solid var(--line-soft)",
                  cursor: "pointer",
                  fontFamily: "var(--font-ui)",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>{allSelected ? "Deselect all" : "Select all"}</span>
                <span style={{ fontFamily: "var(--font-num)", fontSize: 12, color: "var(--ink-3)" }}>
                  {selected.size}/{accounts.length}
                </span>
              </div>
              {accounts.map((a, idx) => {
                const checked = selected.has(a.id);
                return (
                  <label
                    key={a.id}
                    style={{
                      padding: "12px 18px",
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      gap: 12,
                      alignItems: "center",
                      borderBottom: idx === accounts.length - 1 ? "none" : "1px solid var(--line-soft)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(a.id)}
                      style={{ width: 18, height: 18, accentColor: "var(--brand)" }}
                    />
                    <div>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>{a.name}</div>
                      <div style={{ fontFamily: "var(--font-ui)", fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                        {a.type}
                        {a.mask ? ` · •••${a.mask}` : ""}
                      </div>
                    </div>
                    <div style={{ fontFamily: "var(--font-num)", fontSize: 14, fontWeight: 500, color: "var(--ink-1)" }}>{fmtMoney(a.current_balance)}</div>
                  </label>
                );
              })}
            </>
          )}
        </Group>

        <div style={{ padding: "16px" }}>
          <div style={{ marginBottom: 8 }}>
            <ProChip tone="muted">{allSelected ? "WILL DISCONNECT SERVICE" : "WILL KEEP SERVICE CONNECTED"}</ProChip>
          </div>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--ink-3)", lineHeight: 1.55, marginBottom: 12 }}>
            {allSelected
              ? `Removes all ${accounts.length} account${accounts.length === 1 ? "" : "s"} and revokes the Plaid connection.`
              : `Removes ${selected.size} of ${accounts.length} accounts. The service stays connected.`}
          </p>
          {error ? (
            <div style={{ padding: 12, borderRadius: 12, background: "var(--neg-tint)", color: "var(--neg)", fontSize: 13, marginBottom: 12 }}>{error}</div>
          ) : null}
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              disabled={noneSelected}
              style={{
                width: "100%",
                height: 44,
                borderRadius: 10,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-soft)",
                color: "var(--neg)",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                fontWeight: 500,
                cursor: noneSelected ? "not-allowed" : "pointer",
                opacity: noneSelected ? 0.5 : 1,
              }}
            >
              {noneSelected ? "Select at least one account" : "Remove selected"}
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: "var(--font-ui)", fontSize: 12, fontWeight: 600, color: "var(--neg)" }}>
                Final confirmation. This cannot be undone.
              </div>
              <button
                type="button"
                onClick={performRemove}
                disabled={removing}
                style={{ height: 44, borderRadius: 10, background: "var(--neg)", color: "white", border: 0, cursor: removing ? "wait" : "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, opacity: removing ? 0.5 : 1 }}
              >
                {removing ? "Removing…" : allSelected ? "Disconnect & remove" : "Remove selected accounts"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                style={{ height: 44, borderRadius: 10, background: "transparent", border: 0, cursor: "pointer", fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
