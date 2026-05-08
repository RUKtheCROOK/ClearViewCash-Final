import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fonts } from "@cvc/ui";
import {
  getAccountsForView,
  getBillsWithLatestPayment,
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
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useTheme } from "../../lib/theme";
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces } from "../../hooks/useSpaces";
import { BillEditSheet, type EditableBill } from "../../components/BillEditSheet";
import { BillDetailSheet } from "../../components/BillDetailSheet";
import { RecurringSuggestionsBanner } from "../../components/RecurringSuggestionsBanner";
import { BillsCalendar, type CalendarBill } from "../../components/BillsCalendar";
import { BillRow as BillRowView, type BillRowDataMobile } from "../../components/bills/BillRow";
import { GroupHeader } from "../../components/bills/GroupHeader";
import { UpcomingStrip } from "../../components/bills/UpcomingStrip";
import { ViewToggle, type BillsViewMode } from "../../components/bills/ViewToggle";
import { Num, fmtMoneyDollars } from "../../components/bills/Num";

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

const BUCKET_ORDER: BillBucket[] = ["overdue", "this_week", "later", "paid"];

function bucketColor(palette: ReturnType<typeof useTheme>["palette"], b: BillBucket): string {
  switch (b) {
    case "overdue": return palette.warn;
    case "this_week": return palette.brand;
    case "later": return palette.ink3;
    case "paid": return palette.pos;
  }
}

function bucketLabel(b: BillBucket): string {
  switch (b) {
    case "overdue": return "Overdue";
    case "this_week": return "Due this week";
    case "later": return "Due later this month";
    case "paid": return "Paid recently";
  }
}

function accountLabel(accounts: AccountLite[], id: string | null): string | null {
  if (!id) return null;
  const a = accounts.find((x) => x.id === id);
  if (!a) return null;
  const name = a.display_name ?? a.name;
  const short = name.split(/\s+/).slice(0, 2).join(" ");
  return a.mask ? `${short} ··${a.mask}` : short;
}

export default function BillsScreen() {
  const today = todayIso();
  const { palette, mode } = useTheme();
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const { activeSpace } = useSpaces();
  const { sharedView } = useEffectiveSharedView(activeSpace);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [outflowTxns, setOutflowTxns] = useState<MinimalTxn[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<BillsViewMode>("list");
  const [calendarSelectedIso, setCalendarSelectedIso] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Sheet state: detail vs add/edit
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditableBill | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setOwnerUserId(data.session?.user?.id ?? null);
    });
  }, []);

  const reload = useCallback(() => {
    if (!activeSpaceId) return;
    getBillsWithLatestPayment(supabase, activeSpaceId).then((rows) => setBills(rows as unknown as BillRow[]));
    getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView: false }).then((rows) => {
      setAccounts(
        (rows as Array<{ id: string; name: string; display_name: string | null; mask: string | null }>).map((a) => ({
          id: a.id, name: a.name, display_name: a.display_name, mask: a.mask,
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
    reload();
  }, [reload, reloadCount]);

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

  function billToRowData(b: BillRow): BillRowDataMobile {
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
    setEditing(null);
    setEditVisible(true);
  }

  function openDetail(billId: string) {
    setDetailId(billId);
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
      category: b.category,
      payee_hue: (b as unknown as { payee_hue?: number | null }).payee_hue ?? null,
      payee_glyph: (b as unknown as { payee_glyph?: string | null }).payee_glyph ?? null,
      notes: (b as unknown as { notes?: string | null }).notes ?? null,
      linked_account_id: (b as unknown as { linked_account_id?: string | null }).linked_account_id ?? null,
    });
    setEditVisible(true);
    setDetailId(null);
  }

  const dayBills = viewMode === "calendar" && calendarSelectedIso
    ? bills.filter((b) => b.next_due_at === calendarSelectedIso)
    : [];

  const searchHits = search.trim()
    ? bills.filter((b) => b.name.toLowerCase().includes(search.trim().toLowerCase()))
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 28, fontWeight: "500", letterSpacing: -0.6, color: palette.ink1 }}>
              Bills
            </Text>
          </View>
          <Pressable
            onPress={openCreate}
            style={{
              width: 38,
              height: 38,
              borderRadius: 999,
              backgroundColor: palette.brand,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" fill="none" stroke={palette.brandOn} strokeWidth={2.2} strokeLinecap="round" /></Svg>
          </Pressable>
        </View>

        {/* View toggle + search */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <ViewToggle value={viewMode} onChange={setViewMode} palette={palette} />
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => setSearchOpen((s) => !s)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              backgroundColor: searchOpen ? palette.brandTint : palette.tinted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path d="M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-4.3-4.3" fill="none" stroke={searchOpen ? palette.brand : palette.ink2} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
        </View>

        {searchOpen ? (
          <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder="Search bills by name…"
              placeholderTextColor={palette.ink3}
              style={{
                paddingHorizontal: 14,
                height: 44,
                borderRadius: 12,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.lineFirm,
                fontFamily: fonts.ui,
                fontSize: 14,
                color: palette.ink1,
              }}
            />
          </View>
        ) : null}

        {/* Upcoming summary */}
        <UpcomingStrip summary={summary} palette={palette} />

        {/* Recurring detection */}
        {viewMode === "list" && !searchHits ? (
          <RecurringSuggestionsBanner
            txns={outflowTxns}
            accounts={accounts}
            spaceId={activeSpaceId}
            ownerUserId={ownerUserId}
            limit={1}
            onPromoted={() => setReloadCount((c) => c + 1)}
          />
        ) : null}

        {error ? (
          <Text style={{ color: palette.neg, paddingHorizontal: 16, paddingBottom: 8, fontSize: 12 }}>{error}</Text>
        ) : null}

        {/* Calendar mode */}
        {viewMode === "calendar" ? (
          <>
            <BillsCalendar
              bills={calendarBills}
              todayIso={today}
              selectedIso={calendarSelectedIso}
              onSelectDay={setCalendarSelectedIso}
              palette={palette}
            />
            {calendarSelectedIso ? (
              <DayPanel
                iso={calendarSelectedIso}
                bills={dayBills}
                accounts={accounts}
                today={today}
                palette={palette}
                mode={mode}
                onPress={openDetail}
                onMarkPaid={markPaid}
                onUnmarkPaid={unmarkPaid}
                busy={busy}
                billToRowData={billToRowData}
              />
            ) : (
              <Text style={{ paddingHorizontal: 18, paddingTop: 16, color: palette.ink3, fontSize: 12.5 }}>
                Pick a day to see what&apos;s due.
              </Text>
            )}
          </>
        ) : null}

        {/* List mode */}
        {viewMode === "list" ? (
          searchHits ? (
            <Section
              header={`Search · ${searchHits.length} ${searchHits.length === 1 ? "match" : "matches"}`}
              count={searchHits.length}
              total={searchHits.reduce((s, b) => s + b.amount, 0)}
              color={palette.ink3}
              palette={palette}
            >
              {searchHits.length === 0 ? (
                <Text style={{ padding: 24, color: palette.ink3, fontSize: 13 }}>No bills match “{search}”.</Text>
              ) : (
                searchHits.map((b) => {
                  const bucket = buckets.overdue.includes(b)
                    ? ("overdue" as const)
                    : buckets.this_week.includes(b)
                      ? ("this_week" as const)
                      : buckets.paid.includes(b)
                        ? ("paid" as const)
                        : ("later" as const);
                  return (
                    <BillRowView
                      key={b.id}
                      bill={billToRowData(b)}
                      bucket={bucket}
                      todayIso={today}
                      accountLabel={accountLabel(accounts, (b as unknown as { linked_account_id: string | null }).linked_account_id)}
                      palette={palette}
                      mode={mode}
                      onPress={() => openDetail(b.id)}
                      onMarkPaid={() => markPaid(b)}
                      onUnmarkPaid={() => unmarkPaid(b)}
                      paying={busy === b.id}
                    />
                  );
                })
              )}
            </Section>
          ) : bills.length === 0 ? (
            <View
              style={{
                marginHorizontal: 16,
                padding: 24,
                borderRadius: 14,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.line,
              }}
            >
              <Text style={{ color: palette.ink2, fontSize: 14, fontFamily: fonts.ui, textAlign: "center" }}>
                No bills yet. Tap + to add one, or wait for us to detect repeat charges.
              </Text>
            </View>
          ) : (
            BUCKET_ORDER.map((bucket) => {
              const items = buckets[bucket];
              if (items.length === 0) return null;
              return (
                <Section
                  key={bucket}
                  header={bucketLabel(bucket)}
                  count={items.length}
                  total={items.reduce((s, b) => s + b.amount, 0)}
                  color={bucketColor(palette, bucket)}
                  palette={palette}
                >
                  {items.map((b) => (
                    <BillRowView
                      key={b.id}
                      bill={billToRowData(b)}
                      bucket={bucket}
                      todayIso={today}
                      accountLabel={accountLabel(accounts, (b as unknown as { linked_account_id: string | null }).linked_account_id)}
                      palette={palette}
                      mode={mode}
                      onPress={() => openDetail(b.id)}
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
      </ScrollView>

      <BillDetailSheet
        visible={!!detailId}
        billId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={() => setReloadCount((c) => c + 1)}
        onEdit={() => {
          const b = bills.find((x) => x.id === detailId);
          if (b) openEdit(b);
        }}
      />

      <BillEditSheet
        visible={editVisible}
        bill={editing}
        spaceId={activeSpaceId ?? null}
        ownerUserId={ownerUserId}
        onClose={() => setEditVisible(false)}
        onSaved={() => {
          setReloadCount((c) => c + 1);
          setEditVisible(false);
        }}
      />
    </View>
  );
}

function Section({
  header,
  count,
  total,
  color,
  palette,
  children,
}: {
  header: string;
  count: number;
  total: number;
  color: string;
  palette: ReturnType<typeof useTheme>["palette"];
  children: React.ReactNode;
}) {
  return (
    <>
      <GroupHeader label={header} count={count} totalCents={total} color={color} palette={palette} />
      <View
        style={{
          backgroundColor: palette.surface,
          borderTopWidth: 1,
          borderTopColor: palette.line,
          borderBottomWidth: 1,
          borderBottomColor: palette.line,
        }}
      >
        {children}
      </View>
    </>
  );
}

function DayPanel({
  iso,
  bills,
  accounts,
  today,
  palette,
  mode,
  onPress,
  onMarkPaid,
  onUnmarkPaid,
  busy,
  billToRowData,
}: {
  iso: string;
  bills: BillRow[];
  accounts: AccountLite[];
  today: string;
  palette: ReturnType<typeof useTheme>["palette"];
  mode: "light" | "dark";
  onPress: (id: string) => void;
  onMarkPaid: (b: BillRow) => void;
  onUnmarkPaid: (b: BillRow) => void;
  busy: string | null;
  billToRowData: (b: BillRow) => BillRowDataMobile;
}) {
  const total = bills.reduce((s, b) => s + b.amount, 0);
  const date = new Date(`${iso}T00:00:00`);
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const label = `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  return (
    <View style={{ marginTop: 14 }}>
      <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8, flexDirection: "row", alignItems: "baseline", gap: 8 }}>
        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "600", color: palette.ink1 }}>{label}</Text>
        <Text style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink3 }}>
          {bills.length} {bills.length === 1 ? "bill" : "bills"}
        </Text>
        <View style={{ flex: 1 }} />
        <Num style={{ fontSize: 12, color: palette.ink2 }}>{fmtMoneyDollars(total)}</Num>
      </View>
      <View
        style={{
          backgroundColor: palette.surface,
          borderTopWidth: 1,
          borderTopColor: palette.line,
          borderBottomWidth: 1,
          borderBottomColor: palette.line,
        }}
      >
        {bills.length === 0 ? (
          <Text style={{ padding: 18, color: palette.ink3, fontSize: 13, fontFamily: fonts.ui }}>Nothing due that day.</Text>
        ) : (
          bills.map((b) => (
            <BillRowView
              key={b.id}
              bill={billToRowData(b)}
              bucket={b.next_due_at < today ? "overdue" : "this_week"}
              todayIso={today}
              accountLabel={accountLabel(accounts, (b as unknown as { linked_account_id: string | null }).linked_account_id)}
              palette={palette}
              mode={mode}
              onPress={() => onPress(b.id)}
              onMarkPaid={() => onMarkPaid(b)}
              onUnmarkPaid={() => onUnmarkPaid(b)}
              paying={busy === b.id}
            />
          ))
        )}
      </View>
    </View>
  );
}
