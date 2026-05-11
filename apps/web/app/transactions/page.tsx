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
  listCategoriesForSpace,
  setTransactionRecurring,
  setTransactionShare,
} from "@cvc/api-client";
import {
  displayMerchantName,
  groupTransactionsByDate,
  resolveTxCategory,
  type Category,
} from "@cvc/domain";
import { effectiveSharedView, type SpaceMember } from "../../lib/view";
import { useTheme } from "../../lib/theme-provider";
import { I } from "../../lib/icons";
import { TransactionsChartSection } from "./TransactionsChartSection";
import { TxRow } from "./TxRow";
import { DateGroupHeader } from "./DateGroupHeader";
import { FilterChipRail, type RailChip } from "./FilterChipRail";
import { ExpandedFilters } from "./ExpandedFilters";
import { DetailSheet } from "./DetailSheet";
import { ContextMenu } from "./ContextMenu";
import { SplitEditor } from "./SplitEditor";
import { EmptyTransactions, StateBanner, StateMono } from "../../components/states";
import type {
  AccountOpt,
  ActivityTxn,
  AmountRange,
  DateRangeKey,
  MemberOpt,
  Status,
} from "./types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface Space {
  id: string;
  name: string;
  tint: string;
  members?: SpaceMember[];
}

export default function TransactionsPage() {
  const router = useRouter();
  const { resolved } = useTheme();
  const mode = resolved === "dark" ? ("dark" as const) : ("light" as const);

  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [rawSharedView, setRawSharedView] = useState(false);
  const [tier, setTier] = useState<Tier>("starter");

  const [txns, setTxns] = useState<ActivityTxn[]>([]);
  const [accountOpts, setAccountOpts] = useState<AccountOpt[]>([]);
  const [memberOpts, setMemberOpts] = useState<MemberOpt[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [accountIds, setAccountIds] = useState<Set<string>>(new Set());
  const [categoryKinds, setCategoryKinds] = useState<Set<string>>(new Set());
  const [ownerUserIds, setOwnerUserIds] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<DateRangeKey>("30d");
  const [amountRange, setAmountRange] = useState<AmountRange>({ min: null, max: null });
  const [expanded, setExpanded] = useState(false);

  const [editing, setEditing] = useState<ActivityTxn | null>(null);
  const [contextTarget, setContextTarget] = useState<{
    txn: ActivityTxn;
    x: number;
    y: number;
  } | null>(null);
  const [splitFor, setSplitFor] = useState<ActivityTxn | null>(null);

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [splitTxnIds, setSplitTxnIds] = useState<Set<string>>(new Set());
  const [reloadCount, setReloadCount] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);

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
      ownerUserIds: ownerUserIds.size ? Array.from(ownerUserIds) : undefined,
    }).then((data) => setTxns(data as unknown as ActivityTxn[]));
  }, [signedIn, activeSpaceId, sharedView, restrictToOwnerId, accountIds, ownerUserIds, reloadCount]);

  useEffect(() => {
    if (!signedIn || !activeSpaceId) return;
    listCategoriesForSpace(supabase, activeSpaceId).then((rows) =>
      setCategories(rows as unknown as Category[]),
    );
  }, [signedIn, activeSpaceId, reloadCount]);

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

  const accountNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of accountOpts) map.set(a.id, a.name);
    return map;
  }, [accountOpts]);

  const memberInitialById = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of memberOpts) {
      const name = m.display_name ?? m.invited_email ?? m.user_id;
      map.set(m.user_id, (name.trim()[0] ?? "?").toUpperCase());
    }
    return map;
  }, [memberOpts]);

  const counts = useMemo(() => {
    let pending = 0;
    let completed = 0;
    for (const t of txns) {
      if (t.pending) pending += 1;
      else completed += 1;
    }
    return { all: txns.length, pending, completed };
  }, [txns]);

  const filtered = useMemo(
    () =>
      applyFilters({
        txns,
        search,
        status,
        recurringOnly,
        categoryKinds,
        dateRange,
        amountRange,
      }),
    [txns, search, status, recurringOnly, categoryKinds, dateRange, amountRange],
  );

  const groups = useMemo(() => groupTransactionsByDate(filtered), [filtered]);

  const categorySuggestions = useMemo(() => {
    const set = new Set<string>();
    for (const t of txns) if (t.category) set.add(t.category);
    return Array.from(set).sort();
  }, [txns]);

  const activeFilterCount =
    accountIds.size +
    categoryKinds.size +
    ownerUserIds.size +
    (status !== "all" ? 1 : 0) +
    (recurringOnly ? 1 : 0) +
    (dateRange !== "30d" ? 1 : 0) +
    (amountRange.min !== null || amountRange.max !== null ? 1 : 0);

  function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  function resetAll() {
    setStatus("all");
    setRecurringOnly(false);
    setAccountIds(new Set());
    setCategoryKinds(new Set());
    setOwnerUserIds(new Set());
    setDateRange("30d");
    setAmountRange({ min: null, max: null });
    setSearch("");
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
        <h1>Activity</h1>
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

  const railChips: RailChip[] = [
    {
      key: "all",
      label: "All",
      active: activeFilterCount === 0,
      onPress: () => resetAll(),
    },
    {
      key: "pending",
      label: "Pending",
      count: counts.pending,
      active: status === "pending",
      onPress: () => setStatus(status === "pending" ? "all" : "pending"),
    },
    {
      key: "recurring",
      label: "Recurring",
      active: recurringOnly,
      onPress: () => setRecurringOnly((v) => !v),
    },
    {
      key: "more",
      label: expanded ? "Hide filters" : "More",
      hasIcon: true,
      active: expanded,
      onPress: () => setExpanded((v) => !v),
    },
  ];

  const editingHidden = editing ? hiddenIds.has(editing.id) : false;

  return (
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 80 }}>
      {/* Sticky header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "var(--bg-canvas)",
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            padding: "14px 16px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 28,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--ink-1)",
              margin: 0,
            }}
          >
            Activity
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <select
              value={activeSpaceId ?? ""}
              onChange={(e) => {
                setActiveSpaceId(e.target.value);
                if (typeof window !== "undefined")
                  localStorage.setItem("cvc-active-space", e.target.value);
              }}
              style={spaceSelectStyle}
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {toggleVisible ? (
              <button
                type="button"
                onClick={() => setRawSharedView((v) => !v)}
                style={viewToggleStyle(sharedView)}
              >
                {sharedView ? "Shared view" : "My view"}
              </button>
            ) : null}
            <Link
              href="/"
              className="muted"
              style={{ fontSize: 13, textDecoration: "none", color: "var(--ink-3)" }}
            >
              ← Home
            </Link>
          </div>
        </div>

        <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 16px 8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 38,
              padding: "0 12px",
              borderRadius: 10,
              background: "var(--bg-tinted)",
            }}
          >
            <I.search color="var(--ink-3)" size={16} />
            <input
              type="text"
              placeholder="Search merchants, notes, amounts…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                border: 0,
                outline: 0,
                background: "transparent",
                fontFamily: "var(--font-ui)",
                fontSize: 13,
                color: "var(--ink-1)",
              }}
            />
          </div>
        </div>

        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <FilterChipRail chips={railChips} />
          {expanded ? (
            <ExpandedFilters
              mode={mode}
              status={status}
              setStatus={setStatus}
              counts={counts}
              accountOpts={accountOpts}
              accountIds={accountIds}
              toggleAccount={(id) => setAccountIds((s) => toggleInSet(s, id))}
              categoryKinds={categoryKinds}
              toggleCategoryKind={(k) => setCategoryKinds((s) => toggleInSet(s, k))}
              memberOpts={memberOpts}
              ownerUserIds={ownerUserIds}
              toggleOwner={(id) => setOwnerUserIds((s) => toggleInSet(s, id))}
              showPersonGroup={sharedView}
              dateRange={dateRange}
              setDateRange={setDateRange}
              amountRange={amountRange}
              setAmountRange={setAmountRange}
              onApply={() => setExpanded(false)}
              onReset={resetAll}
              totalMatches={filtered.length}
            />
          ) : null}
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {(() => {
          const STUCK_MS = 5 * 24 * 60 * 60 * 1000;
          const now = Date.now();
          const stuck = txns.filter((t) => {
            if (!t.pending) return false;
            const posted = parseDateLocal(t.posted_at);
            if (!posted) return false;
            return now - posted.getTime() > STUCK_MS;
          });
          const first = stuck[0];
          if (!first) return null;
          const oldest = stuck.reduce<ActivityTxn>((acc, t) => {
            const a = parseDateLocal(acc.posted_at)?.getTime() ?? Infinity;
            const b = parseDateLocal(t.posted_at)?.getTime() ?? Infinity;
            return b < a ? t : acc;
          }, first);
          const oldestPosted = parseDateLocal(oldest.posted_at);
          const days = oldestPosted
            ? Math.floor((now - oldestPosted.getTime()) / (24 * 60 * 60 * 1000))
            : 0;
          return (
            <div style={{ padding: "12px 16px 0" }}>
              <StateBanner
                tone="warn"
                iconChar="?"
                title={
                  stuck.length === 1 ? (
                    <>
                      One transaction has been pending for{" "}
                      <StateMono style={{ color: "var(--warn)" }}>{days} days</StateMono>
                    </>
                  ) : (
                    <>
                      <StateMono style={{ color: "var(--warn)" }}>{stuck.length} transactions</StateMono> are
                      pending longer than usual
                    </>
                  )
                }
                body="Most pending charges clear in 1–3 days. This is unusual but not always a problem — often a tip or final amount is still being calculated."
              />
            </div>
          );
        })()}

        {tier !== "starter" && filtered.length > 0 ? (
          <div style={{ padding: 16 }}>
            <TransactionsChartSection txns={filtered} />
          </div>
        ) : null}

        {groups.length === 0 ? (
          txns.length === 0 && activeFilterCount === 0 && !sharedView ? (
            <EmptyTransactions onLink={() => router.push("/accounts")} />
          ) : (
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "var(--ink-3)" }}>
                {sharedView
                  ? "Nothing shared into this space matches your filters."
                  : "No transactions match your filters."}
              </p>
            </div>
          )
        ) : (
          groups.map((group) => (
            <div key={group.key}>
              <DateGroupHeader label={group.label} count={group.count} totalCents={group.totalCents} />
              {group.txns.map((t) => (
                <TxRow
                  key={t.id}
                  tx={t}
                  mode={mode}
                  accountName={accountNameById.get(t.account_id) ?? null}
                  sharedInitial={sharedView ? memberInitialById.get(t.owner_user_id) ?? null : null}
                  splitFlag={splitTxnIds.has(t.id)}
                  onTap={() => setEditing(t)}
                  onContextMenu={(x, y) => setContextTarget({ txn: t, x, y })}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {editing ? (
        <DetailSheet
          client={supabase}
          txn={editing}
          spaceId={activeSpaceId}
          sharedView={sharedView}
          hiddenInSpace={editingHidden}
          accountName={accountNameById.get(editing.account_id) ?? null}
          mode={mode}
          categorySuggestions={categorySuggestions}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => setReloadCount((c) => c + 1)}
          onCategoryCreated={(c) => setCategories((prev) => [...prev, c])}
        />
      ) : null}

      <ContextMenu
        open={!!contextTarget}
        x={contextTarget?.x ?? 0}
        y={contextTarget?.y ?? 0}
        items={
          contextTarget
            ? buildContextItems({
                txn: contextTarget.txn,
                sharedView,
                isHidden: hiddenIds.has(contextTarget.txn.id),
                onEditCategory: () => {
                  setEditing(contextTarget.txn);
                  setContextTarget(null);
                },
                onToggleRecurring: async () => {
                  await setTransactionRecurring(supabase, {
                    id: contextTarget.txn.id,
                    is_recurring: !contextTarget.txn.is_recurring,
                  });
                  setReloadCount((c) => c + 1);
                },
                onSplit: () => {
                  setSplitFor(contextTarget.txn);
                  setContextTarget(null);
                },
                onShareToggle: async () => {
                  if (!activeSpaceId) return;
                  await setTransactionShare(supabase, {
                    transaction_id: contextTarget.txn.id,
                    space_id: activeSpaceId,
                    hidden: false,
                  });
                  setReloadCount((c) => c + 1);
                },
                onHideToggle: async () => {
                  if (!activeSpaceId) return;
                  const wasHidden = hiddenIds.has(contextTarget.txn.id);
                  await setTransactionShare(supabase, {
                    transaction_id: contextTarget.txn.id,
                    space_id: activeSpaceId,
                    hidden: !wasHidden,
                  });
                  setReloadCount((c) => c + 1);
                },
              })
            : []
        }
        onClose={() => setContextTarget(null)}
      />

      <SplitEditor
        client={supabase}
        visible={!!splitFor}
        txnId={splitFor?.id ?? null}
        txnAmountCents={splitFor?.amount ?? 0}
        spaceId={activeSpaceId}
        defaultCategory={splitFor?.category ?? null}
        onClose={() => setSplitFor(null)}
        onSaved={() => setReloadCount((c) => c + 1)}
      />
    </main>
  );
}

interface FilterArgs {
  txns: ActivityTxn[];
  search: string;
  status: Status;
  recurringOnly: boolean;
  categoryKinds: Set<string>;
  dateRange: DateRangeKey;
  amountRange: AmountRange;
}

function applyFilters({
  txns,
  search,
  status,
  recurringOnly,
  categoryKinds,
  dateRange,
  amountRange,
}: FilterArgs): ActivityTxn[] {
  const today = startOfDayLocal(new Date());
  const cutoff = computeCutoff(dateRange, today);
  const search0 = search.trim().toLowerCase();

  return txns.filter((t) => {
    if (status === "pending" && !t.pending) return false;
    if (status === "completed" && t.pending) return false;
    if (recurringOnly && !t.is_recurring) return false;
    if (search0) {
      const merchant = displayMerchantName(t).toLowerCase();
      const noteText = (t.note ?? "").toLowerCase();
      const amountText = (Math.abs(t.amount) / 100).toFixed(2);
      if (
        !merchant.includes(search0) &&
        !noteText.includes(search0) &&
        !amountText.includes(search0)
      ) {
        return false;
      }
    }
    if (categoryKinds.size > 0) {
      const kind = resolveTxCategory(t.category, t.amount).kind;
      if (!categoryKinds.has(kind)) return false;
    }
    if (cutoff) {
      const d = parseDateLocal(t.posted_at);
      if (!d) return false;
      if (d.getTime() < cutoff.getTime()) return false;
    }
    if (amountRange.min !== null) {
      if (Math.abs(t.amount) / 100 < amountRange.min) return false;
    }
    if (amountRange.max !== null) {
      if (Math.abs(t.amount) / 100 > amountRange.max) return false;
    }
    return true;
  });
}

function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDateLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return null;
  const [, y, mo, da] = m;
  return new Date(Number(y), Number(mo) - 1, Number(da));
}

function computeCutoff(range: DateRangeKey, today: Date): Date | null {
  if (range === "all") return null;
  if (range === "7d") return new Date(today.getTime() - 7 * 86_400_000);
  if (range === "30d") return new Date(today.getTime() - 30 * 86_400_000);
  if (range === "month") return new Date(today.getFullYear(), today.getMonth(), 1);
  return null;
}

interface ContextItem {
  key: string;
  icon: "edit" | "bell" | "split" | "share" | "hide";
  label: string;
  hint?: string;
  warn?: boolean;
  onClick: () => void;
}

function buildContextItems({
  txn,
  sharedView,
  isHidden,
  onEditCategory,
  onToggleRecurring,
  onSplit,
  onShareToggle,
  onHideToggle,
}: {
  txn: ActivityTxn;
  sharedView: boolean;
  isHidden: boolean;
  onEditCategory: () => void;
  onToggleRecurring: () => void;
  onSplit: () => void;
  onShareToggle: () => void;
  onHideToggle: () => void;
}): ContextItem[] {
  const cat = resolveTxCategory(txn.category, txn.amount);
  const items: ContextItem[] = [
    { key: "edit", icon: "edit", label: "Edit category", hint: cat.label, onClick: onEditCategory },
    {
      key: "recur",
      icon: "bell",
      label: txn.is_recurring ? "Stop recurring" : "Mark as recurring",
      onClick: onToggleRecurring,
    },
    { key: "split", icon: "split", label: "Split transaction", onClick: onSplit },
  ];
  if (sharedView) {
    items.push({
      key: "share",
      icon: "share",
      label: "Share to space",
      hint: isHidden ? "Currently hidden" : "Currently shared",
      onClick: onShareToggle,
    });
    items.push({
      key: "hide",
      icon: "hide",
      label: isHidden ? "Unhide" : "Hide from space",
      warn: !isHidden,
      onClick: onHideToggle,
    });
  }
  return items;
}

const spaceSelectStyle: React.CSSProperties = {
  height: 32,
  padding: "0 10px",
  borderRadius: 8,
  border: "1px solid var(--line-soft)",
  background: "var(--bg-surface)",
  fontFamily: "var(--font-ui)",
  fontSize: 13,
  color: "var(--ink-1)",
};

function viewToggleStyle(active: boolean): React.CSSProperties {
  return {
    appearance: "none",
    cursor: "pointer",
    height: 32,
    padding: "0 12px",
    borderRadius: 999,
    background: active ? "var(--ink-1)" : "var(--bg-surface)",
    color: active ? "var(--bg-canvas)" : "var(--ink-1)",
    border: `1px solid ${active ? "var(--ink-1)" : "var(--line-soft)"}`,
    fontFamily: "var(--font-ui)",
    fontSize: 12.5,
    fontWeight: 500,
  };
}
