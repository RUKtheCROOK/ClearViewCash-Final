"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import type { Tier } from "@cvc/types";
import {
  getAccountsForView,
  getMembersWithProfilesForSpace,
  getMySpaces,
  getTransactionsForView,
} from "@cvc/api-client";
import { displayMerchantName } from "@cvc/domain";
import { effectiveSharedView, type SpaceMember } from "../../lib/view";
import { EditPanel } from "./EditPanel";
import { SuggestionsBanner } from "./SuggestionsBanner";
import { TransactionsChartSection } from "./TransactionsChartSection";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface Txn {
  id: string;
  merchant_name: string | null;
  display_name: string | null;
  amount: number;
  posted_at: string;
  category: string | null;
  pending: boolean;
  is_recurring: boolean;
  account_id: string;
  owner_user_id: string;
  note: string | null;
}

interface Space {
  id: string;
  name: string;
  tint: string;
  members?: SpaceMember[];
}

interface AccountOpt {
  id: string;
  name: string;
}

interface MemberOpt {
  user_id: string;
  display_name: string | null;
  invited_email: string | null;
}

type Status = "all" | "pending" | "completed";

export default function TransactionsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [rawSharedView, setRawSharedView] = useState(false);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [accountOpts, setAccountOpts] = useState<AccountOpt[]>([]);
  const [memberOpts, setMemberOpts] = useState<MemberOpt[]>([]);
  const [status, setStatus] = useState<Status>("all");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [accountIds, setAccountIds] = useState<Set<string>>(new Set());
  const [categoriesSel, setCategoriesSel] = useState<Set<string>>(new Set());
  const [ownerUserIds, setOwnerUserIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Txn | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [splitTxnIds, setSplitTxnIds] = useState<Set<string>>(new Set());
  const [reloadCount, setReloadCount] = useState(0);
  const [tier, setTier] = useState<Tier>("starter");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(!!data.session);
      setCurrentUserId(data.session?.user?.id ?? null);
      setAuthReady(true);
    })();
  }, []);

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? null,
    [spaces, activeSpaceId],
  );
  const { sharedView, restrictToOwnerId, toggleVisible } = useMemo(
    () => effectiveSharedView(activeSpace, rawSharedView, currentUserId),
    [activeSpace, rawSharedView, currentUserId],
  );

  useEffect(() => {
    if (!signedIn) return;
    supabase
      .from("users")
      .select("tier")
      .maybeSingle()
      .then(({ data }) => setTier(((data?.tier as Tier) ?? "starter") as Tier));
  }, [signedIn]);

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

  useEffect(() => {
    if (!signedIn) return;
    getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView,
      restrictToOwnerId,
      limit: 200,
      accountIds: accountIds.size ? Array.from(accountIds) : undefined,
      categories: categoriesSel.size ? Array.from(categoriesSel) : undefined,
      ownerUserIds: ownerUserIds.size ? Array.from(ownerUserIds) : undefined,
    }).then((data) => setTxns(data as unknown as Txn[]));
  }, [signedIn, activeSpaceId, sharedView, restrictToOwnerId, accountIds, categoriesSel, ownerUserIds, reloadCount]);

  useEffect(() => {
    if (!signedIn) return;
    getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView, restrictToOwnerId }).then(
      (accs) => {
        setAccountOpts(
          (accs as Array<{ id: string; name: string }>).map((a) => ({ id: a.id, name: a.name })),
        );
      },
    );
  }, [signedIn, activeSpaceId, sharedView, restrictToOwnerId]);

  useEffect(() => {
    if (!signedIn || !sharedView || !activeSpaceId) {
      setMemberOpts([]);
      return;
    }
    getMembersWithProfilesForSpace(supabase, activeSpaceId).then((rows) => {
      setMemberOpts(rows as MemberOpt[]);
    });
  }, [signedIn, activeSpaceId, sharedView]);

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

  useEffect(() => {
    if (!signedIn || txns.length === 0) {
      setSplitTxnIds(new Set());
      return;
    }
    const ids = txns.map((t) => t.id);
    supabase
      .from("transaction_splits")
      .select("transaction_id")
      .in("transaction_id", ids)
      .then(({ data }) => {
        const set = new Set<string>(
          (data ?? []).map((r: { transaction_id: string }) => r.transaction_id),
        );
        setSplitTxnIds(set);
      });
  }, [signedIn, txns]);

  const categoryOpts = useMemo(() => {
    const set = new Set<string>();
    for (const t of txns) if (t.category) set.add(t.category);
    return Array.from(set).sort();
  }, [txns]);

  const filtered = useMemo(() => {
    return txns.filter((t) => {
      if (status === "pending" && !t.pending) return false;
      if (status === "completed" && t.pending) return false;
      if (recurringOnly && !t.is_recurring) return false;
      if (search && !displayMerchantName(t).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [txns, status, recurringOnly, search]);

  function memberLabel(m: MemberOpt): string {
    return m.display_name ?? m.invited_email ?? m.user_id.slice(0, 8);
  }

  function selectedSetFromOptions(el: HTMLSelectElement): Set<string> {
    const next = new Set<string>();
    for (const opt of Array.from(el.selectedOptions)) next.add(opt.value);
    return next;
  }

  function fmtMoney(cents: number): string {
    const sign = cents < 0 ? "-" : "";
    const abs = Math.abs(cents) / 100;
    return `${sign}$${abs.toFixed(2)}`;
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
        <h1>Transactions</h1>
        <p className="muted" style={{ marginTop: 16 }}>
          Sign in to view your transactions.
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

  const filterCount = accountIds.size + categoriesSel.size + ownerUserIds.size;

  return (
    <main className="container" style={{ padding: "32px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Transactions</h1>
        <Link href="/" className="muted" style={{ fontSize: 14 }}>
          ← Home
        </Link>
      </div>

      {/* Space + view */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <label className="muted" style={{ fontSize: 13 }}>
          Space
        </label>
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
              {s.name}
            </option>
          ))}
        </select>
        {toggleVisible ? (
          <button
            className={sharedView ? "btn btn-primary" : "btn btn-secondary"}
            style={{ padding: "8px 14px", fontSize: 14 }}
            onClick={() => setRawSharedView((v) => !v)}
          >
            {sharedView ? "Shared view" : "My view"}
          </button>
        ) : null}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search merchant…"
        style={{ ...inputStyle, width: "100%", marginBottom: 16 }}
      />

      {/* Status + recurring */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {(["all", "pending", "completed"] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={status === s ? "btn btn-primary" : "btn btn-secondary"}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            {s}
          </button>
        ))}
        <button
          onClick={() => setRecurringOnly((v) => !v)}
          className={recurringOnly ? "btn btn-primary" : "btn btn-secondary"}
          style={{ padding: "6px 14px", fontSize: 13 }}
        >
          recurring
        </button>
      </div>

      {/* Multi-axis filters */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: sharedView ? "1fr 1fr 1fr" : "1fr 1fr",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
            Account
          </div>
          <select
            multiple
            value={Array.from(accountIds)}
            onChange={(e) => setAccountIds(selectedSetFromOptions(e.target))}
            style={{ ...inputStyle, width: "100%", height: 96 }}
          >
            {accountOpts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
            Category
          </div>
          <select
            multiple
            value={Array.from(categoriesSel)}
            onChange={(e) => setCategoriesSel(selectedSetFromOptions(e.target))}
            style={{ ...inputStyle, width: "100%", height: 96 }}
          >
            {categoryOpts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {sharedView ? (
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
              Person
            </div>
            <select
              multiple
              value={Array.from(ownerUserIds)}
              onChange={(e) => setOwnerUserIds(selectedSetFromOptions(e.target))}
              style={{ ...inputStyle, width: "100%", height: 96 }}
            >
              {memberOpts.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {memberLabel(m)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {filterCount > 0 ? (
        <button
          className="btn btn-secondary"
          style={{ padding: "6px 14px", fontSize: 13, marginBottom: 16 }}
          onClick={() => {
            setAccountIds(new Set());
            setCategoriesSel(new Set());
            setOwnerUserIds(new Set());
          }}
        >
          Clear filters
        </button>
      ) : null}

      <SuggestionsBanner
        client={supabase}
        txns={txns}
        spaceId={activeSpaceId}
        onPromoted={() => setReloadCount((c) => c + 1)}
      />

      {tier !== "starter" ? <TransactionsChartSection txns={filtered} /> : null}

      {/* List */}
      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <p className="muted" style={{ padding: 24, margin: 0 }}>
            {sharedView
              ? "Nothing shared into this space matches your filters."
              : "No transactions."}
          </p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {filtered.map((t) => (
              <li
                key={t.id}
                onClick={() => setEditing(t)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                <div>
                  <div>{displayMerchantName(t)}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {t.category ?? "Uncategorized"} · {t.posted_at}
                    {t.pending ? " · pending" : ""}
                    {t.is_recurring ? " · recurring" : ""}
                    {t.note ? " · note" : ""}
                    {splitTxnIds.has(t.id) ? " · split" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span
                    style={{
                      color: t.amount > 0 ? "var(--positive)" : "var(--text)",
                      fontWeight: 600,
                    }}
                  >
                    {fmtMoney(t.amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EditPanel
        client={supabase}
        txn={editing}
        spaceId={activeSpaceId}
        sharedView={sharedView}
        hiddenInSpace={editing ? hiddenIds.has(editing.id) : false}
        categorySuggestions={categoryOpts}
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
