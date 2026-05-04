"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  getAccountsForView,
  getMySpaces,
  getPlaidItemsStatus,
  getTransactionsForView,
} from "@cvc/api-client";
import {
  allocatePaymentLinks,
  computeObligations,
  displayMerchantName,
  effectiveAvailableBalances,
  type ObligationsBreakdown,
  type PaymentLinkAllocation,
} from "@cvc/domain";
import { openPlaidLink } from "../../lib/plaid";
import { EditPanel, type EditableTxn } from "../transactions/EditPanel";

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
  plaid_item_id: string | null;
  last_synced_at?: string | null;
}

interface PlaidItemStatus {
  id: string;
  status: string;
  institution_name: string | null;
}

interface Space {
  id: string;
  name: string;
  tint: string;
  kind: "personal" | "shared";
}

interface LinkRow {
  id: string;
  funding_account_id: string;
  name: string;
  cross_space: boolean;
}
interface CardRow {
  payment_link_id: string;
  card_account_id: string;
  split_pct: number;
}

function relativeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return null;
  const m = Math.floor(diffMs / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "—";
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents) / 100;
  return `${sign}$${abs.toFixed(2)}`;
}

export default function AccountsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [sharedView, setSharedView] = useState(false);
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [myAccounts, setMyAccounts] = useState<AccountRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [itemStatus, setItemStatus] = useState<Record<string, PlaidItemStatus>>({});
  const [effective, setEffective] = useState<Record<string, number>>({});
  const [allocations, setAllocations] = useState<PaymentLinkAllocation[]>([]);
  const [reconnectingItemId, setReconnectingItemId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [cashOnHand, setCashOnHand] = useState(0);
  const [obligations, setObligations] = useState<ObligationsBreakdown>({
    debtCents: 0,
    upcomingBillsCents: 0,
    totalCents: 0,
  });
  const [recent, setRecent] = useState<EditableTxn[]>([]);
  const [editing, setEditing] = useState<EditableTxn | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(!!data.session);
      setAuthReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    getMySpaces(supabase).then((spacesRows) => {
      const list = spacesRows as unknown as Space[];
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
    if (!signedIn) return;
    (async () => {
      const todayIso = new Date().toISOString().slice(0, 10);
      const [accs, allAccsRes, linksRes, cardsRes, items, billsRes, txnsRes] = await Promise.all([
        getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView }),
        supabase
          .from("accounts")
          .select("id, name, mask, type, current_balance, plaid_item_id"),
        supabase.from("payment_links").select("id, funding_account_id, name, cross_space"),
        supabase.from("payment_link_cards").select("payment_link_id, card_account_id, split_pct"),
        getPlaidItemsStatus(supabase),
        activeSpaceId
          ? supabase
              .from("bills")
              .select("amount, next_due_at")
              .eq("space_id", activeSpaceId)
              .gte("next_due_at", todayIso)
          : Promise.resolve({ data: [] as Array<{ amount: number; next_due_at: string }> }),
        getTransactionsForView(supabase, {
          spaceId: activeSpaceId,
          sharedView,
          limit: 10,
          fields:
            "id, merchant_name, display_name, amount, posted_at, category, pending, is_recurring, account_id, owner_user_id, note",
        }),
      ]);
      const accounts = accs as unknown as AccountRow[];
      setRows(accounts);
      setMyAccounts((allAccsRes.data ?? []) as unknown as AccountRow[]);
      setLinks((linksRes.data ?? []) as LinkRow[]);
      setCards((cardsRes.data ?? []) as CardRow[]);
      setItemStatus(Object.fromEntries(items.map((it) => [it.id, it])));

      const bills = (billsRes.data ?? []) as Array<{ amount: number; next_due_at: string }>;
      setCashOnHand(
        accounts
          .filter((a) => a.type === "depository")
          .reduce((s, a) => s + (a.current_balance ?? 0), 0),
      );
      setObligations(computeObligations({ accounts, bills }));
      setRecent(txnsRes as unknown as EditableTxn[]);
      const linkObjs = (linksRes.data ?? []).map((pl) => ({
        ...pl,
        owner_user_id: "",
        cards: (cardsRes.data ?? []).filter((c) => c.payment_link_id === pl.id),
      }));
      const allBalances = [
        ...accounts.map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
        ...((allAccsRes.data ?? []) as unknown as AccountRow[])
          .filter((a) => !accounts.some((ac) => ac.id === a.id))
          .map((a) => ({ account_id: a.id, current_balance: a.current_balance ?? 0 })),
      ];
      const eff = effectiveAvailableBalances(linkObjs as never, allBalances);
      setEffective(Object.fromEntries(eff));
      setAllocations(allocatePaymentLinks(linkObjs as never, allBalances));
    })();
  }, [signedIn, activeSpaceId, sharedView, reloadCount]);

  useEffect(() => {
    if (!signedIn || !sharedView || !activeSpaceId) {
      setHiddenIds(new Set());
      return;
    }
    supabase
      .from("transaction_shares")
      .select("transaction_id")
      .eq("space_id", activeSpaceId)
      .eq("hidden", true)
      .then(({ data }) => {
        const ids = (data ?? []).map((r: { transaction_id: string }) => r.transaction_id);
        setHiddenIds(new Set(ids));
      });
  }, [signedIn, activeSpaceId, sharedView, reloadCount]);

  const effectiveAvailableTotal = cashOnHand - obligations.totalCents;
  const obligationsSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (obligations.debtCents > 0)
      parts.push(`$${(obligations.debtCents / 100).toFixed(0)} balances`);
    if (obligations.upcomingBillsCents > 0)
      parts.push(`$${(obligations.upcomingBillsCents / 100).toFixed(0)} bills (30d)`);
    return parts.join(" · ");
  }, [obligations]);
  const categorySuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const t of recent) if (t.category) set.add(t.category);
    return Array.from(set).sort();
  }, [recent]);

  const accountNameById = new Map(rows.map((r) => [r.id, r.name]));
  const myAccountNameById = new Map(myAccounts.map((r) => [r.id, r.name]));
  const balanceById = new Map<string, number>(
    [...myAccounts, ...rows].map((r) => [r.id, r.current_balance ?? 0]),
  );

  function isDebtFullyCovered(account: AccountRow): boolean {
    if (account.type !== "credit") return false;
    if ((account.current_balance ?? 0) <= 0) return false;
    const cardAllocs = allocations.filter((a) => a.card_account_id === account.id);
    if (cardAllocs.length === 0) return false;
    for (const alloc of cardAllocs) {
      if (!balanceById.has(alloc.funding_account_id)) return false;
      const funderBalance = balanceById.get(alloc.funding_account_id) ?? 0;
      if (funderBalance < alloc.reserved_cents) return false;
    }
    return true;
  }

  function badgesFor(account: AccountRow): string[] {
    const out: string[] = [];
    if (account.type === "depository") {
      const myLinks = links.filter((l) => l.funding_account_id === account.id);
      for (const l of myLinks) {
        for (const c of cards.filter((c) => c.payment_link_id === l.id)) {
          const name =
            accountNameById.get(c.card_account_id) ?? myAccountNameById.get(c.card_account_id);
          if (!name) continue;
          out.push(`Pays → ${name}${l.cross_space ? " · cross-space" : ""}`);
        }
      }
    }
    if (account.type === "credit") {
      const cardLinks = cards.filter((c) => c.card_account_id === account.id);
      for (const cl of cardLinks) {
        const link = links.find((l) => l.id === cl.payment_link_id);
        if (!link) continue;
        const counterpartVisible = accountNameById.has(link.funding_account_id);
        const name =
          accountNameById.get(link.funding_account_id) ??
          (link.cross_space ? myAccountNameById.get(link.funding_account_id) : undefined);
        if (!name) continue;
        const suffix = link.cross_space && !counterpartVisible ? " · cross-space" : "";
        out.push(`Paid by ${name}${suffix}`);
      }
    }
    return out;
  }

  async function reconnect(itemRowId: string) {
    setReconnectingItemId(itemRowId);
    setActionError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("not_signed_in");
      const tokenRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-link-token`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plaid_item_row_id: itemRowId }),
        },
      );
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.link_token) {
        throw new Error(tokenJson.error ?? "could_not_start_reconnect");
      }
      await openPlaidLink(tokenJson.link_token);
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-sync`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plaid_item_row_id: itemRowId }),
      });
      setReloadCount((n) => n + 1);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== "user_exited") setActionError(msg);
    } finally {
      setReconnectingItemId(null);
    }
  }

  async function addAccount() {
    setAdding(true);
    setActionError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("not_signed_in");
      const tokenRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-link-token`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      const tokenJson = await tokenRes.json();
      if (!tokenRes.ok || !tokenJson.link_token) {
        throw new Error(tokenJson.error ?? "could_not_start_link");
      }
      const publicToken = await openPlaidLink(tokenJson.link_token);
      const exchangeRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/plaid-exchange`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ public_token: publicToken }),
        },
      );
      const exchangeJson = await exchangeRes.json();
      if (!exchangeRes.ok) throw new Error(exchangeJson.error ?? "exchange_failed");
      setReloadCount((n) => n + 1);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== "user_exited") setActionError(msg);
    } finally {
      setAdding(false);
    }
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
        <h1>Accounts</h1>
        <p className="muted" style={{ marginTop: 16 }}>
          Sign in to view your accounts.
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
        <h1 style={{ margin: 0 }}>Accounts {sharedView ? "· Shared" : "· Mine"}</h1>
        <Link href="/" className="muted" style={{ fontSize: 14 }}>
          ← Home
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
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
            if (typeof window !== "undefined") {
              localStorage.setItem("cvc-active-space", e.target.value);
            }
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
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-primary"
          style={{ padding: "8px 14px", fontSize: 14 }}
          onClick={addAccount}
          disabled={adding || reconnectingItemId !== null}
        >
          {adding ? "Connecting…" : "+ Add account"}
        </button>
      </div>

      {actionError ? (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "var(--negative)",
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 16,
            fontSize: 14,
          }}
        >
          {actionError}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="card">
          <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Cash on hand
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginTop: 6,
              color: cashOnHand > 0 ? "var(--positive)" : "var(--text)",
            }}
          >
            {fmtMoney(cashOnHand)}
          </div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Obligations
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>
            {fmtMoney(obligations.totalCents)}
          </div>
          {obligationsSubtitle ? (
            <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              {obligationsSubtitle}
            </div>
          ) : null}
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Effective available
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginTop: 6,
              color: effectiveAvailableTotal > 0 ? "var(--positive)" : "var(--text)",
            }}
          >
            {fmtMoney(effectiveAvailableTotal)}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            Cash on hand minus obligations.
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            {sharedView
              ? "Nothing shared into this space yet."
              : "No accounts linked yet. Use + Add account to connect your first bank."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((a) => {
            const status = a.plaid_item_id ? itemStatus[a.plaid_item_id]?.status : undefined;
            const needsReconnect = status === "error";
            const ago = relativeAgo(a.last_synced_at ?? null);
            const badges = badgesFor(a);
            const fullyCovered = isDebtFullyCovered(a);
            const showEffective =
              a.type === "depository" &&
              effective[a.id] !== undefined &&
              effective[a.id] !== a.current_balance;
            return (
              <div key={a.id} className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <strong style={{ fontSize: 17 }}>{a.name}</strong>
                      {status ? (
                        <span
                          style={{
                            padding: "2px 10px",
                            borderRadius: 999,
                            background: needsReconnect ? "#F59E0B" : "var(--positive)",
                            color: "white",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {needsReconnect ? "Needs reconnect" : "Synced"}
                        </span>
                      ) : null}
                      {fullyCovered ? (
                        <span
                          style={{
                            padding: "2px 10px",
                            borderRadius: 999,
                            background: "var(--positive)",
                            color: "white",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          Fully covered
                        </span>
                      ) : null}
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      {a.type}
                      {a.mask ? ` · •••${a.mask}` : ""}
                      {ago ? ` · synced ${ago}` : ""}
                    </div>
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 17,
                      color:
                        (a.current_balance ?? 0) > 0 ? "var(--positive)" : "var(--text)",
                    }}
                  >
                    {fmtMoney(a.current_balance)}
                  </div>
                </div>

                {showEffective ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <span className="muted" style={{ fontSize: 13 }}>
                      Effective Available
                    </span>
                    <span style={{ fontWeight: 600, color: "var(--positive)" }}>
                      {fmtMoney(effective[a.id]!)}
                    </span>
                  </div>
                ) : null}

                {badges.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      marginTop: 10,
                    }}
                  >
                    {badges.map((b) => (
                      <span
                        key={b}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                          color: "var(--muted)",
                          fontSize: 12,
                        }}
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                ) : null}

                {needsReconnect && a.plaid_item_id ? (
                  <div style={{ marginTop: 12 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "8px 14px", fontSize: 13 }}
                      onClick={() => reconnect(a.plaid_item_id!)}
                      disabled={reconnectingItemId !== null || adding}
                    >
                      {reconnectingItemId === a.plaid_item_id
                        ? "Reconnecting…"
                        : "Reconnect"}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Recent transactions</h2>
        {recent.length === 0 ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              {sharedView ? "Nothing shared into this space yet." : "No transactions yet."}
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {recent.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEditing(t)}
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                  color: "var(--text)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500 }}>{displayMerchantName(t)}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {t.category ?? "Uncategorized"} · {t.posted_at}
                    {t.pending ? " · pending" : ""}
                    {t.is_recurring ? " · recurring" : ""}
                    {t.note ? " · note" : ""}
                  </div>
                </div>
                <div
                  style={{
                    fontWeight: 600,
                    color: t.amount > 0 ? "var(--positive)" : "var(--text)",
                  }}
                >
                  {fmtMoney(t.amount)}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <EditPanel
        client={supabase}
        txn={editing}
        spaceId={activeSpaceId}
        sharedView={sharedView}
        hiddenInSpace={editing ? hiddenIds.has(editing.id) : false}
        categorySuggestions={categorySuggestions}
        onClose={() => setEditing(null)}
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
