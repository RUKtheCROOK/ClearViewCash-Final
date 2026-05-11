"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  getAccountsForView,
  getBillsWithLatestPayment,
  getMySpaces,
  getTransactionsForView,
  recordBillPayment,
  undoBillPayment,
} from "@cvc/api-client";
import {
  groupBillsByBucket,
  summariseUpcoming,
  todayIso,
  type BillBucket,
} from "@cvc/domain";
import type { BillListRow as BillRow } from "@cvc/types";
import { Calendar, type CalendarBill } from "./Calendar";
import { BillRow as BillRowView, type BillRowData } from "./_components/BillRow";
import { UpcomingStrip } from "./_components/UpcomingStrip";
import { GroupHeader } from "./_components/GroupHeader";
import { ViewToggle, type BillsViewMode } from "./_components/ViewToggle";
import { BillsSuggestions } from "./_components/BillsSuggestions";
import { Num, fmtMoneyDollars } from "./_components/Num";
import { EmptyBills } from "../../components/states";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

interface MinimalTxn {
  id: string;
  merchant_name: string | null;
  amount: number;
  posted_at: string;
  pending: boolean;
  is_recurring: boolean;
  account_id: string | null;
}

interface AccountLite {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
}

interface Space {
  id: string;
  name: string;
  tint: string;
}

const BUCKET_META: Record<BillBucket, { label: string; color: string }> = {
  overdue: { label: "Overdue", color: "var(--warn)" },
  this_week: { label: "Due this week", color: "var(--brand)" },
  later: { label: "Due later this month", color: "var(--ink-3)" },
  paid: { label: "Paid recently", color: "var(--pos)" },
};

const BUCKET_ORDER: BillBucket[] = ["overdue", "this_week", "later", "paid"];

function accountLabel(accounts: AccountLite[], id: string | null): string | null {
  if (!id) return null;
  const a = accounts.find((x) => x.id === id);
  if (!a) return null;
  const name = a.display_name ?? a.name;
  const short = name.split(/\s+/).slice(0, 2).join(" ");
  return a.mask ? `${short} ··${a.mask}` : short;
}

export default function BillsPage() {
  const router = useRouter();
  const today = todayIso();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [outflowTxns, setOutflowTxns] = useState<MinimalTxn[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<BillsViewMode>("list");
  const [calendarSelectedIso, setCalendarSelectedIso] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

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
    getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView: false }).then((rows) => {
      setAccounts(
        (rows as Array<{ id: string; name: string; display_name: string | null; mask: string | null }>).map((a) => ({
          id: a.id,
          name: a.name,
          display_name: a.display_name,
          mask: a.mask,
        })),
      );
    });
    getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView: false,
      limit: 200,
      fields: "id, merchant_name, amount, posted_at, pending, is_recurring, account_id",
    }).then((rows) => {
      const minimal = (rows as unknown as MinimalTxn[]).filter((t) => t.amount < 0);
      setOutflowTxns(minimal);
    });
  }, [activeSpaceId]);

  useEffect(() => {
    if (!signedIn) return;
    reload();
  }, [signedIn, reload, reloadCount]);

  const summary = useMemo(() => summariseUpcoming(bills, today), [bills, today]);
  const buckets = useMemo(() => groupBillsByBucket(bills, today), [bills, today]);

  const calendarBills: CalendarBill[] = useMemo(
    () =>
      bills.map((b) => ({
        id: b.id,
        next_due_at: b.next_due_at,
        amount: b.amount,
        autopay: b.autopay,
        isOverdue: b.next_due_at < today && !b.latest_payment,
      })),
    [bills, today],
  );

  function billToRowData(b: BillRow): BillRowData {
    return {
      id: b.id,
      name: b.name,
      amount: b.amount,
      next_due_at: b.next_due_at,
      cadence: b.cadence,
      autopay: b.autopay,
      category: b.category,
      payee_hue: (b as unknown as { payee_hue?: number | null }).payee_hue ?? null,
      payee_glyph: (b as unknown as { payee_glyph?: string | null }).payee_glyph ?? null,
      source: b.source,
      recurring_group_id: b.recurring_group_id,
      latest_payment: b.latest_payment
        ? {
            id: b.latest_payment.id,
            paid_at: b.latest_payment.paid_at,
            amount: b.latest_payment.amount,
            prev_next_due_at: b.latest_payment.prev_next_due_at,
          }
        : null,
    };
  }

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

  async function unmarkPaid(b: BillRow) {
    if (!b.latest_payment) return;
    setBusy(b.id);
    setError(null);
    try {
      await undoBillPayment(supabase, {
        payment_id: b.latest_payment.id,
        bill_id: b.id,
        cadence: b.cadence,
        current_next_due_at: b.next_due_at,
        prev_next_due_at: b.latest_payment.prev_next_due_at,
      });
      setReloadCount((c) => c + 1);
    } catch (e) {
      setError((e as Error).message ?? "Could not unmark paid.");
    } finally {
      setBusy(null);
    }
  }

  function openCreate() {
    router.push("/bills/new");
  }

  function openDetail(billId: string) {
    router.push(`/bills/${billId}`);
  }

  const filterByDay = viewMode === "calendar" && calendarSelectedIso;
  const dayBills = filterByDay
    ? bills.filter((b) => b.next_due_at === calendarSelectedIso)
    : [];

  const searchHits = search.trim()
    ? bills.filter((b) => b.name.toLowerCase().includes(search.trim().toLowerCase()))
    : null;

  if (!authReady) {
    return (
      <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", padding: "40px 24px" }}>
        <p style={{ color: "var(--ink-3)" }}>Loading…</p>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main
        style={{
          background: "var(--bg-canvas)",
          minHeight: "100vh",
          padding: "80px 24px",
          maxWidth: 460,
          margin: "0 auto",
        }}
      >
        <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 28, color: "var(--ink-1)" }}>Bills</h1>
        <p style={{ color: "var(--ink-3)", marginTop: 16 }}>Sign in to view your bills.</p>
        <button
          type="button"
          onClick={() => router.push("/sign-in")}
          style={{
            marginTop: 16,
            padding: "10px 16px",
            background: "var(--brand)",
            color: "var(--brand-on)",
            borderRadius: 12,
            border: 0,
            cursor: "pointer",
            fontFamily: "var(--font-ui)",
            fontWeight: 500,
          }}
        >
          Sign in
        </button>
      </main>
    );
  }

  return (
    <main
      style={{
        background: "var(--bg-canvas)",
        minHeight: "100vh",
        paddingBottom: 80,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ padding: "14px 16px 8px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                margin: 0,
                fontFamily: "var(--font-ui)",
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "var(--ink-1)",
                lineHeight: 1.1,
              }}
            >
              Bills
            </h1>
            {spaces.length > 1 ? (
              <SpaceSelect
                spaces={spaces}
                activeSpaceId={activeSpaceId}
                onChange={(id) => {
                  setActiveSpaceId(id);
                  if (typeof window !== "undefined") localStorage.setItem("cvc-active-space", id);
                }}
              />
            ) : null}
          </div>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-3)",
              alignSelf: "flex-start",
              padding: "8px 0",
            }}
          >
            ← Home
          </Link>
          <button
            type="button"
            onClick={openCreate}
            aria-label="Add bill"
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              background: "var(--brand)",
              color: "var(--brand-on)",
              border: 0,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            }}
          >
            <PlusIcon />
          </button>
        </div>

        {/* View toggle + search */}
        <div style={{ padding: "4px 16px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <ViewToggle value={viewMode} onChange={setViewMode} />
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={() => setSearchOpen((s) => !s)}
            aria-label="Search bills"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: searchOpen ? "var(--brand-tint)" : "var(--bg-tinted)",
              color: searchOpen ? "var(--brand)" : "var(--ink-2)",
              border: 0,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            <SearchIcon />
          </button>
        </div>

        {searchOpen ? (
          <div style={{ padding: "0 16px 14px" }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search bills by name…"
              style={{
                width: "100%",
                height: 44,
                padding: "0 14px",
                borderRadius: 12,
                background: "var(--bg-surface)",
                border: "1px solid var(--line-firm)",
                fontFamily: "var(--font-ui)",
                fontSize: 14,
                color: "var(--ink-1)",
                outline: "none",
              }}
            />
          </div>
        ) : null}

        {/* Upcoming summary */}
        <UpcomingStrip summary={summary} />

        {/* Recurring detection (compact, on list view only) */}
        {viewMode === "list" && !searchHits ? (
          <BillsSuggestions
            client={supabase}
            txns={outflowTxns}
            accounts={accounts}
            spaceId={activeSpaceId}
            ownerUserId={ownerUserId}
            limit={1}
            onPromoted={() => setReloadCount((c) => c + 1)}
          />
        ) : null}

        {error ? (
          <p style={{ color: "var(--neg)", padding: "0 16px 8px", fontSize: 12 }}>{error}</p>
        ) : null}

        {/* Calendar mode */}
        {viewMode === "calendar" ? (
          <>
            <Calendar
              bills={calendarBills}
              todayIso={today}
              selectedIso={calendarSelectedIso}
              onSelectDay={setCalendarSelectedIso}
            />
            {calendarSelectedIso ? (
              <DayPanel
                iso={calendarSelectedIso}
                bills={dayBills}
                accounts={accounts}
                today={today}
                onOpen={openDetail}
                onMarkPaid={markPaid}
                onUnmarkPaid={unmarkPaid}
                busy={busy}
                billToRowData={billToRowData}
              />
            ) : (
              <p style={{ padding: "16px 18px", color: "var(--ink-3)", fontSize: 12.5 }}>
                Pick a day to see what&apos;s due.
              </p>
            )}
          </>
        ) : null}

        {/* List mode */}
        {viewMode === "list" ? (
          searchHits ? (
            <Section
              header={`Search · ${searchHits.length} ${searchHits.length === 1 ? "match" : "matches"}`}
              color="var(--ink-3)"
              total={searchHits.reduce((s, b) => s + b.amount, 0)}
              count={searchHits.length}
            >
              {searchHits.length === 0 ? (
                <Empty text={`No bills match “${search}”.`} />
              ) : (
                searchHits.map((b) => (
                  <BillRowView
                    key={b.id}
                    bill={billToRowData(b)}
                    bucket={buckets.overdue.includes(b) ? "overdue" : buckets.this_week.includes(b) ? "this_week" : buckets.paid.includes(b) ? "paid" : "later"}
                    todayIso={today}
                    accountLabel={accountLabel(accounts, (b as unknown as { linked_account_id: string | null }).linked_account_id)}
                    onClick={() => openDetail(b.id)}
                    onMarkPaid={() => markPaid(b)}
                    onUnmarkPaid={() => unmarkPaid(b)}
                    paying={busy === b.id}
                  />
                ))
              )}
            </Section>
          ) : bills.length === 0 ? (
            <EmptyBills
              onScan={() => router.push("/bills/new?source=scan")}
              onAddManually={() => router.push("/bills/new")}
            />
          ) : (
            BUCKET_ORDER.map((bucket) => {
              const items = buckets[bucket];
              if (items.length === 0) return null;
              const total = items.reduce((s, b) => s + b.amount, 0);
              const meta = BUCKET_META[bucket];
              return (
                <Section key={bucket} header={meta.label} color={meta.color} total={total} count={items.length}>
                  {items.map((b) => (
                    <BillRowView
                      key={b.id}
                      bill={billToRowData(b)}
                      bucket={bucket}
                      todayIso={today}
                      accountLabel={accountLabel(accounts, (b as unknown as { linked_account_id: string | null }).linked_account_id)}
                      onClick={() => openDetail(b.id)}
                      onMarkPaid={() => markPaid(b)}
                      onUnmarkPaid={() => unmarkPaid(b)}
                      paying={busy === b.id}
                    />
                  ))}
                </Section>
              );
            })
          )
        ) : null}
      </div>
    </main>
  );
}

function Section({
  header,
  color,
  total,
  count,
  children,
}: {
  header: string;
  color: string;
  total: number;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <GroupHeader label={header} count={count} totalCents={total} color={color} />
      <div
        style={{
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--line-soft)",
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        {children}
      </div>
    </>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p style={{ padding: 24, margin: 0, color: "var(--ink-3)", fontSize: 13 }}>{text}</p>
  );
}

function DayPanel({
  iso,
  bills,
  accounts,
  today,
  onOpen,
  onMarkPaid,
  onUnmarkPaid,
  busy,
  billToRowData,
}: {
  iso: string;
  bills: BillRow[];
  accounts: AccountLite[];
  today: string;
  onOpen: (id: string) => void;
  onMarkPaid: (b: BillRow) => void;
  onUnmarkPaid: (b: BillRow) => void;
  busy: string | null;
  billToRowData: (b: BillRow) => BillRowData;
}) {
  const total = bills.reduce((s, b) => s + b.amount, 0);
  const date = new Date(`${iso}T00:00:00`);
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const label = `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ padding: "4px 18px 8px", display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, fontWeight: 600, color: "var(--ink-1)" }}>
          {label}
        </span>
        <span style={{ fontFamily: "var(--font-num)", fontSize: 11, color: "var(--ink-3)" }}>
          {bills.length} {bills.length === 1 ? "bill" : "bills"}
        </span>
        <span style={{ marginLeft: "auto" }}>
          <Num style={{ fontSize: 12, color: "var(--ink-2)" }}>{fmtMoneyDollars(total)}</Num>
        </span>
      </div>
      <div
        style={{
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--line-soft)",
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        {bills.length === 0 ? (
          <p style={{ padding: 18, margin: 0, color: "var(--ink-3)", fontSize: 13 }}>Nothing due that day.</p>
        ) : (
          bills.map((b) => (
            <BillRowView
              key={b.id}
              bill={billToRowData(b)}
              bucket={b.next_due_at < today ? "overdue" : "this_week"}
              todayIso={today}
              accountLabel={accountLabel(accounts, (b as unknown as { linked_account_id: string | null }).linked_account_id)}
              onClick={() => onOpen(b.id)}
              onMarkPaid={() => onMarkPaid(b)}
              onUnmarkPaid={() => onUnmarkPaid(b)}
              paying={busy === b.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SpaceSelect({
  spaces,
  activeSpaceId,
  onChange,
}: {
  spaces: Space[];
  activeSpaceId: string | null;
  onChange: (id: string) => void;
}) {
  return (
    <div style={{ marginTop: 4 }}>
      <select
        value={activeSpaceId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontFamily: "var(--font-ui)",
          fontSize: 12,
          color: "var(--ink-3)",
          background: "transparent",
          border: 0,
          padding: 0,
          cursor: "pointer",
        }}
      >
        {spaces.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function PlusIcon({ size = 18 }: { size?: number } = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={11} cy={11} r={7} />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
