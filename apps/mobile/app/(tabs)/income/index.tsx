import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
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
  getTransactionsForView,
} from "@cvc/api-client";
import type { Database } from "@cvc/types/supabase.generated";
import { fonts } from "@cvc/ui";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../lib/store";
import { useTheme } from "../../../lib/theme";
import { useEffectiveSharedView } from "../../../lib/view";
import { useSpaces } from "../../../hooks/useSpaces";
import { AddIncomeWizard } from "../../../components/AddIncomeWizard";
import { RecurringSuggestionsBanner } from "../../../components/RecurringSuggestionsBanner";
import { NextPaycheckHero } from "../../../components/income/NextPaycheckHero";
import { MonthStrip } from "../../../components/income/MonthStrip";
import { YTDCard } from "../../../components/income/YTDCard";
import { SectionLabel } from "../../../components/income/SectionLabel";
import { IncomeRow as IncomeRowView, type IncomeRowDataMobile } from "../../../components/income/IncomeRow";
import { OneTimeRow } from "../../../components/income/OneTimeRow";
import { EmptyState } from "../../../components/income/EmptyState";
import type { IncomeSourceType } from "@cvc/types";

type IncomeRow = Database["public"]["Tables"]["income_events"]["Row"];
type IncomeReceiptRow = Database["public"]["Tables"]["income_receipts"]["Row"];

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

export default function IncomeTab() {
  const router = useRouter();
  const today = todayIso();
  const { palette, mode } = useTheme();
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const { activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId } = useEffectiveSharedView(activeSpace);

  const [items, setItems] = useState<IncomeRow[]>([]);
  const [receipts, setReceipts] = useState<IncomeReceiptRow[]>([]);
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [inflowTxns, setInflowTxns] = useState<MinimalTxn[]>([]);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardSeed, setWizardSeed] = useState<IncomeSourceType | undefined>(undefined);
  const [refreshing, setRefreshing] = useState(false);

  const reload = useCallback(async () => {
    if (!activeSpaceId) return;
    await Promise.all([
      getIncomeEvents(supabase, activeSpaceId).then((rows) => setItems(rows as IncomeRow[])),
      getIncomeReceiptsForSpace(supabase, activeSpaceId).then((rows) => setReceipts(rows as IncomeReceiptRow[])),
      getAccountsForView(supabase, { spaceId: activeSpaceId, sharedView: false }).then((rows) => {
        setAccounts(
          (rows as Array<{ id: string; name: string; display_name: string | null; mask: string | null }>).map((a) => ({
            id: a.id, name: a.name, display_name: a.display_name, mask: a.mask,
          })),
        );
      }),
      getTransactionsForView(supabase, {
        spaceId: activeSpaceId,
        sharedView,
        restrictToOwnerId,
        limit: 200,
        fields: "id, merchant_name, amount, posted_at, pending, is_recurring, account_id",
      }).then((rows) => {
        const inflows = (rows as unknown as MinimalTxn[]).filter((t) => t.amount > 0);
        setInflowTxns(inflows);
      }),
    ]);
  }, [activeSpaceId, sharedView, restrictToOwnerId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);

  useEffect(() => {
    void reload();
  }, [reload, reloadCount]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setOwnerUserId(data.user?.id ?? null));
  }, []);

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

  function openWizard(seed?: IncomeSourceType) {
    setWizardSeed(seed);
    setWizardOpen(true);
  }

  const empty = items.length === 0;

  // Resolve next paycheck account for hero subtitle.
  const nextItem = next?.source ? items.find((i) => i.id === next.source.id) : null;
  const nextAccount = nextItem ? accounts.find((a) => a.id === nextItem.linked_account_id) ?? null : null;

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.ink3} />
        }
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: fonts.uiMedium,
                fontSize: 28,
                fontWeight: "500",
                letterSpacing: -0.6,
                color: palette.ink1,
              }}
            >
              Income
            </Text>
          </View>
          <Pressable
            onPress={() => openWizard()}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 999,
              backgroundColor: palette.brand,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M12 5v14M5 12h14" fill="none" stroke={palette.brandOn} strokeWidth={2.2} strokeLinecap="round" />
            </Svg>
          </Pressable>
        </View>

        {empty ? (
          <EmptyState palette={palette} mode={mode} onAdd={openWizard} />
        ) : (
          <>
            {/* Hero */}
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
                palette={palette}
                mode={mode}
                onMarkReceived={() => router.push({
                  pathname: "/income/[id]",
                  params: { id: next.source.id, action: "mark-received" },
                })}
              />
            ) : null}

            <MonthStrip
              monthLabel={monthInfo.monthLabel}
              receivedCents={monthInfo.receivedTotalCents}
              expectedCents={monthInfo.expectedTotalCents}
              ratio={monthInfo.ratio}
              todayDay={todayDay}
              daysInMonth={lastDayOfMonth}
              palette={palette}
            />

            <YTDCard
              ytdCents={ytdInfo.ytdCents}
              monthlySeries={ytdInfo.monthlySeries}
              yoyDelta={ytdInfo.yoyDelta}
              rangeLabel={ytdRangeLabel}
              palette={palette}
            />

            {/* Recurring detection */}
            <RecurringSuggestionsBanner
              txns={inflowTxns}
              accounts={accounts}
              spaceId={activeSpaceId}
              ownerUserId={ownerUserId}
              direction="inbound"
              limit={1}
              onPromoted={() => setReloadCount((c) => c + 1)}
            />

            {/* Recurring */}
            {sections.recurring.length > 0 ? (
              <>
                <SectionLabel
                  label="Recurring"
                  palette={palette}
                  right={
                    <Text style={{ fontFamily: fonts.num, fontSize: 11.5, color: palette.ink3 }}>
                      {sections.recurring.length} {sections.recurring.length === 1 ? "source" : "sources"}
                    </Text>
                  }
                />
                <View
                  style={{
                    marginHorizontal: 16,
                    backgroundColor: palette.surface,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: palette.line,
                    overflow: "hidden",
                  }}
                >
                  {sections.recurring.map((r) => {
                    const acct = items.find((i) => i.id === r.id);
                    const data: IncomeRowDataMobile = {
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
                        palette={palette}
                        mode={mode}
                        onPress={() => router.push({ pathname: "/income/[id]", params: { id: r.id } })}
                      />
                    );
                  })}
                </View>
              </>
            ) : null}

            {/* One-time */}
            {sections.oneTime.length > 0 ? (
              <>
                <SectionLabel
                  label="One-time · last 60 days"
                  palette={palette}
                  right={
                    <Text style={{ fontFamily: fonts.num, fontSize: 11.5, color: palette.ink3 }}>
                      {sections.oneTime.length} {sections.oneTime.length === 1 ? "entry" : "entries"}
                    </Text>
                  }
                />
                <View
                  style={{
                    marginHorizontal: 16,
                    backgroundColor: palette.surface,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: palette.line,
                    overflow: "hidden",
                  }}
                >
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
                        palette={palette}
                        onPress={() => router.push({ pathname: "/income/[id]", params: { id: o.id } })}
                      />
                    );
                  })}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <AddIncomeWizard
        visible={wizardOpen}
        spaceId={activeSpaceId}
        ownerUserId={ownerUserId}
        accounts={accounts}
        initialSourceType={wizardSeed}
        onClose={() => setWizardOpen(false)}
        onSaved={() => {
          setReloadCount((c) => c + 1);
          setWizardOpen(false);
        }}
        palette={palette}
        mode={mode}
      />
    </View>
  );
}
