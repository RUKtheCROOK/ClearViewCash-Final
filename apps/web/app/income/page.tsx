"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";
import {
  findNextPaycheck,
  forecastAmount,
  groupIncomeBySection,
  summariseMonth,
  summariseYtd,
  todayIso,
  type IncomeForRollup,
} from "@cvc/domain";
import {
  getAccountsForView,
  getIncomeEvents,
  getIncomeReceiptsForSpace,
  getMySpaces,
  getTransactionsForView,
} from "@cvc/api-client";
import { NextPaycheckHero } from "./_components/NextPaycheckHero";
import { MonthStrip } from "./_components/MonthStrip";
import { YTDCard } from "./_components/YTDCard";
import { SectionLabel } from "./_components/SectionLabel";
import { IncomeRow as IncomeRowView, type IncomeRowData } from "./_components/IncomeRow";
import { OneTimeRow } from "./_components/OneTimeRow";
import { EmptyState } from "./_components/EmptyState";
import { Num } from "./_components/Num";

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

interface Space {
  id: string;
  name: string;
  tint: string;
}

const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function accountLabel(accounts: AccountLite[], id: string | null): string | null {
  if (!id) return null;
  const a = accounts.find((x) => x.id === id);
  if (!a) return null;
  const name = a.display_name ?? a.name;
  const short = name.split(/\s+/).slice(0, 2).join(" ");
  return a.mask ? `${short} ··${a.mask}` : short;
}

function deliveryLine(account: AccountLite | null): string | null {
  if (!account) return null;
  const name = account.display_name ?? account.name;
  return account.mask ? `direct deposit · ${name} ··${account.mask}` : `direct deposit · ${name}`;
}

export default function IncomePage() {
  const router = useRouter();
  const today = todayIso();

  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [items, setItems] = useState<IncomeRow[]>([]);
  const [receipts, setReceipts] = useState<IncomeReceiptRow[]>([]);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);

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
        const stored = typeof window !== "undefined" ? localStorage.getItem("cvc-active-space") : null;
        const found = stored ? list.find((s) => s.id === stored) : null;
        setActiveSpaceId(found ? found.id : first.id);
      }
    });
  }, [signedIn, activeSpaceId]);

  const reload = useCallback(() => {
    if (!activeSpaceId) return;
    getIncomeEvents(supabase, activeSpaceId).then((rows) => setItems(rows as IncomeRow[]));
    getIncomeReceiptsForSpace(supabase, activeSpaceId).then((rows) => setReceipts(rows as IncomeReceiptRow[]));
    getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView: false }).then((rows) => {
      setAccounts(
        (rows as Array<{ id: string; name: string; display_name: string | null; mask: string | null }>).map((a) => ({
          id: a.id, name: a.name, display_name: a.display_name, mask: a.mask,
        })),
      );
    });
    // Pull recent inflows so the future "auto-detect" affordance can light up;
    // unused right now but mirrors the bills page's structure.
    void getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView: false,
      limit: 200,
      fields: "id, merchant_name, amount, posted_at, pending, is_recurring, account_id",
    });
  }, [activeSpaceId]);

  useEffect(() => {
    if (!signedIn) return;
    reload();
  }, [signedIn, reload]);

  const todayDate = useMemo(() => new Date(`${today}T00:00:00Z`), [today]);
  const rolloverItems: IncomeForRollup[] = useMemo(
    () =>
      items.map((i) => ({
        id: i.id,
        name: i.name,
        amount: i.amount,
        amount_low: i.amount_low,
        amount_high: i.amount_high,
        cadence: i.cadence,
        next_due_at: i.next_due_at,
        source_type: i.source_type,
        paused_at: i.paused_at,
        received_at: i.received_at,
        actual_amount: i.actual_amount,
      })),
    [items],
  );

  const next = useMemo(() => findNextPaycheck(rolloverItems, today), [rolloverItems, today]);
  const monthInfo = useMemo(() => summariseMonth(rolloverItems, receipts, todayDate), [rolloverItems, receipts, todayDate]);
  const ytdInfo = useMemo(() => summariseYtd(receipts, todayDate), [receipts, todayDate]);
  const sections = useMemo(() => groupIncomeBySection(rolloverItems), [rolloverItems]);

  const monthIdx = todayDate.getUTCMonth();
  const lastDayOfMonth = new Date(Date.UTC(todayDate.getUTCFullYear(), monthIdx + 1, 0)).getUTCDate();
  const todayDay = todayDate.getUTCDate();
  const ytdRangeLabel = `Jan – ${MONTHS_FULL[monthIdx]?.slice(0, 3)} ${todayDay}`;

  const empty = items.length === 0;
  const nextItem = next?.source ? items.find((i) => i.id === next.source.id) : null;
  const nextAccount = nextItem ? accounts.find((a) => a.id === nextItem.linked_account_id) ?? null : null;

  if (!authReady) {
    return (
      <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", padding: "40px 24px" }}>
        <p style={{ color: "var(--ink-3)" }}>Loading…</p>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", padding: "80px 24px", maxWidth: 460, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "var(--font-ui)", fontSize: 28, color: "var(--ink-1)" }}>Income</h1>
        <p style={{ color: "var(--ink-3)", marginTop: 16 }}>Sign in to view your income.</p>
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
    <main style={{ background: "var(--bg-canvas)", minHeight: "100vh", paddingBottom: 80 }}>
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
              Income
            </h1>
            {spaces.length > 1 ? (
              <select
                value={activeSpaceId ?? ""}
                onChange={(e) => {
                  setActiveSpaceId(e.target.value);
                  if (typeof window !== "undefined") localStorage.setItem("cvc-active-space", e.target.value);
                }}
                style={{
                  marginTop: 4,
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
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : null}
          </div>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: 12,
              color: "var(--ink-3)",
              textDecoration: "none",
              padding: "8px 12px",
            }}
          >
            ← Home
          </Link>
          <button
            type="button"
            onClick={() => router.push("/income/new")}
            aria-label="Add income"
            style={{
              width: 38, height: 38, borderRadius: 999,
              background: "var(--brand)", color: "var(--brand-on)",
              border: 0, cursor: "pointer",
              display: "grid", placeItems: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            }}
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>

        {empty ? (
          <EmptyState
            onAdd={(seed) => {
              const url = seed ? `/income/new?type=${seed}` : "/income/new";
              router.push(url);
            }}
          />
        ) : (
          <>
            {next ? (
              <NextPaycheckHero
                name={next.source.name}
                sourceType={next.source.source_type}
                amountCents={next.forecastCents}
                isRange={next.source.amount_low != null && next.source.amount_high != null}
                amountLow={next.source.amount_low}
                amountHigh={next.source.amount_high}
                nextDueIso={next.source.next_due_at}
                daysUntil={next.daysUntil}
                accountLabel={deliveryLine(nextAccount)}
              />
            ) : null}

            <MonthStrip
              monthLabel={monthInfo.monthLabel}
              receivedCents={monthInfo.receivedTotalCents}
              expectedCents={monthInfo.expectedTotalCents}
              ratio={monthInfo.ratio}
              todayDay={todayDay}
              daysInMonth={lastDayOfMonth}
            />

            <YTDCard
              ytdCents={ytdInfo.ytdCents}
              monthlySeries={ytdInfo.monthlySeries}
              yoyDelta={ytdInfo.yoyDelta}
              rangeLabel={ytdRangeLabel}
            />

            {sections.recurring.length > 0 ? (
              <>
                <SectionLabel
                  label="Recurring"
                  right={
                    <Num style={{ fontFamily: "var(--font-num)", fontSize: 11.5, color: "var(--ink-3)" }}>
                      {sections.recurring.length} {sections.recurring.length === 1 ? "source" : "sources"}
                    </Num>
                  }
                />
                <div style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
                  {sections.recurring.map((r) => {
                    const acct = items.find((i) => i.id === r.id);
                    const data: IncomeRowData = {
                      id: r.id,
                      name: r.name,
                      amount: r.amount,
                      amount_low: r.amount_low,
                      amount_high: r.amount_high,
                      cadence: r.cadence,
                      next_due_at: r.next_due_at,
                      source_type: r.source_type,
                      paused_at: r.paused_at,
                    };
                    return (
                      <IncomeRowView
                        key={r.id}
                        income={data}
                        accountLabel={accountLabel(accounts, acct?.linked_account_id ?? null)}
                        todayIso={today}
                        onClick={() => router.push(`/income/${r.id}`)}
                      />
                    );
                  })}
                </div>
              </>
            ) : null}

            {sections.oneTime.length > 0 ? (
              <>
                <SectionLabel
                  label="One-time · last 60 days"
                  right={
                    <Num style={{ fontFamily: "var(--font-num)", fontSize: 11.5, color: "var(--ink-3)" }}>
                      {sections.oneTime.length} {sections.oneTime.length === 1 ? "entry" : "entries"}
                    </Num>
                  }
                />
                <div style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
                  {sections.oneTime.map((o, i) => {
                    const acct = items.find((it) => it.id === o.id);
                    return (
                      <OneTimeRow
                        key={o.id}
                        item={{
                          id: o.id,
                          name: o.name,
                          amount: o.actual_amount ?? forecastAmount(o),
                          date: o.received_at ?? o.next_due_at,
                          accountLabel: accountLabel(accounts, acct?.linked_account_id ?? null),
                          received: o.received_at != null,
                        }}
                        isLast={i === sections.oneTime.length - 1}
                        onClick={() => router.push(`/income/${o.id}`)}
                      />
                    );
                  })}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
