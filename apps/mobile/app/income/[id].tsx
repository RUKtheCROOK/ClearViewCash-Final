import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  computeVariability,
  forecastAmount,
  incomeLabelForType,
  isPaused,
  isVariable,
  todayIso,
} from "@cvc/domain";
import {
  deleteIncomeEvent,
  getAccountsForView,
  getIncomeEventById,
  getIncomeReceipts,
  pauseIncomeEvent,
  resumeIncomeEvent,
} from "@cvc/api-client";
import type { Database } from "@cvc/types/supabase.generated";
import { fonts } from "@cvc/ui";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { IncomeIcon } from "../../components/income/IncomeIcon";
import { Num, fmtMoneyShort, fmtMoneyDollars, fmtMoneyRange } from "../../components/income/Num";
import { VariabilityChart } from "../../components/income/VariabilityChart";
import { IncomeEditSheet, type EditableIncome } from "../../components/IncomeEditSheet";

type IncomeRow = Database["public"]["Tables"]["income_events"]["Row"];
type IncomeReceiptRow = Database["public"]["Tables"]["income_receipts"]["Row"];

interface AccountLite {
  id: string;
  name: string;
  display_name: string | null;
  mask: string | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function depositDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function approxDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function cadenceLabel(c: string): string {
  switch (c) {
    case "weekly":   return "weekly";
    case "biweekly": return "bi-weekly";
    case "monthly":  return "monthly";
    case "yearly":   return "yearly";
    case "custom":   return "custom";
    case "once":     return "one-time";
    default:         return c;
  }
}

export default function IncomeDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const today = todayIso();
  const { palette, mode } = useTheme();

  const [item, setItem] = useState<IncomeRow | null>(null);
  const [receipts, setReceipts] = useState<IncomeReceiptRow[]>([]);
  const [account, setAccount] = useState<AccountLite | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    const it = await getIncomeEventById(supabase, id);
    setItem(it as IncomeRow | null);
    if (it) {
      const list = await getIncomeReceipts(supabase, id, { limit: 50 });
      setReceipts(list as IncomeReceiptRow[]);
      if (it.linked_account_id) {
        const accts = await getAccountsForView(supabase, { spaceId: it.space_id, sharedView: false });
        const found = (accts as Array<AccountLite>).find((a) => a.id === it.linked_account_id);
        setAccount(found ?? null);
      } else {
        setAccount(null);
      }
    }
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const variability = useMemo(() => {
    if (receipts.length === 0) return null;
    return computeVariability(
      receipts.map((r) => ({ income_event_id: r.income_event_id, amount: r.amount, received_at: r.received_at })),
      6,
    );
  }, [receipts]);

  const daysUntil = useMemo(() => {
    if (!item) return 0;
    const next = new Date(`${item.next_due_at}T00:00:00`).getTime();
    const now = new Date(`${today}T00:00:00`).getTime();
    return Math.round((next - now) / 86_400_000);
  }, [item, today]);

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.canvas, paddingTop: 50 }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable
          onPress={() => router.back()}
          style={{
            margin: 16,
            width: 36,
            height: 36,
            borderRadius: 999,
            backgroundColor: palette.tinted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M15 6l-6 6 6 6" fill="none" stroke={palette.ink2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text style={{ paddingHorizontal: 18, fontFamily: fonts.ui, color: palette.ink3, fontSize: 13 }}>Loading…</Text>
      </View>
    );
  }

  const paused = isPaused(item);
  const variable = isVariable(item);
  const forecastCents = forecastAmount({
    id: item.id,
    name: item.name,
    amount: item.amount,
    amount_low: item.amount_low,
    amount_high: item.amount_high,
    cadence: item.cadence,
    next_due_at: item.next_due_at,
    source_type: item.source_type,
    paused_at: item.paused_at,
    received_at: item.received_at,
    actual_amount: item.actual_amount,
  });

  async function togglePause() {
    if (!item) return;
    setBusy("pause");
    setError(null);
    try {
      if (paused) await resumeIncomeEvent(supabase, item.id);
      else await pauseIncomeEvent(supabase, item.id);
      await reload();
    } catch (e) {
      setError((e as Error).message ?? "Could not update.");
    } finally {
      setBusy(null);
    }
  }

  function confirmDelete() {
    Alert.alert("Delete income source?", "This removes the source and its receipt history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!item) return;
          setBusy("delete");
          try {
            await deleteIncomeEvent(supabase, item.id);
            router.back();
          } catch (e) {
            setError((e as Error).message ?? "Could not delete.");
            setBusy(null);
          }
        },
      },
    ]);
  }

  const accountText = account ? `${account.display_name ?? account.name}${account.mask ? ` ··${account.mask}` : ""}` : null;
  const typeLabel = `${incomeLabelForType(item.source_type)} · ${cadenceLabel(item.cadence)}${variable ? " · variable" : ""}`;
  const expectedAmount = variable && item.amount_low != null && item.amount_high != null
    ? fmtMoneyRange(item.amount_low, item.amount_high)
    : fmtMoneyShort(forecastCents);
  const editableIncome: EditableIncome = {
    id: item.id,
    space_id: item.space_id,
    owner_user_id: item.owner_user_id,
    name: item.name,
    amount: item.amount,
    cadence: item.cadence,
    next_due_at: item.next_due_at,
    autopay: item.autopay,
    source: item.source,
    recurring_group_id: item.recurring_group_id,
    category: item.category,
    actual_amount: item.actual_amount,
    received_at: item.received_at,
    source_type: item.source_type,
    amount_low: item.amount_low,
    amount_high: item.amount_high,
    paused_at: item.paused_at,
    linked_account_id: item.linked_account_id,
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingTop: 50, paddingBottom: 28 }}>
        {/* Top nav */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 36, height: 36, borderRadius: 999, backgroundColor: palette.tinted,
              alignItems: "center", justifyContent: "center",
            }}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M15 6l-6 6 6 6" fill="none" stroke={palette.ink2} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>

        {/* Hero */}
        <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 18, alignItems: "center" }}>
          <View style={{ marginBottom: 14 }}>
            <IncomeIcon sourceType={item.source_type} mode={mode} size={64} radius={16} dim={paused} />
          </View>
          <Text
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 22,
              fontWeight: "500",
              color: palette.ink1,
              letterSpacing: -0.3,
              textAlign: "center",
            }}
          >
            {item.name}
          </Text>
          <Text style={{ marginTop: 4, fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink3, textAlign: "center" }}>
            {typeLabel}
          </Text>

          {item.cadence !== "once" || !item.received_at ? (
            <>
              <Text
                style={{
                  marginTop: 18,
                  fontFamily: fonts.ui,
                  fontSize: 11,
                  color: palette.ink3,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {item.cadence === "once" ? "Expected" : "Next expected"}
              </Text>
              <Num style={{ marginTop: 4, fontSize: 30, fontWeight: "600", color: palette.ink1, letterSpacing: -0.5 }}>
                {expectedAmount}
              </Num>
              <View style={{ marginTop: 4, flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink2 }}>
                  ~{approxDateLabel(item.next_due_at)}
                </Text>
                <Text style={{ color: palette.ink4 }}>·</Text>
                <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink2 }}>
                  {paused ? "paused" : daysUntil < 0 ? `${-daysUntil} days late` : daysUntil === 0 ? "today" : `${daysUntil} days`}
                </Text>
                {accountText ? (
                  <>
                    <Text style={{ color: palette.ink4 }}>·</Text>
                    <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.pos }}>
                      lands in {accountText}
                    </Text>
                  </>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <Text
                style={{
                  marginTop: 18,
                  fontFamily: fonts.ui,
                  fontSize: 11,
                  color: palette.ink3,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                Received
              </Text>
              <Num style={{ marginTop: 4, fontSize: 30, fontWeight: "600", color: palette.pos, letterSpacing: -0.5 }}>
                +{fmtMoneyDollars(item.actual_amount ?? item.amount)}
              </Num>
              <Text style={{ marginTop: 4, fontFamily: fonts.ui, fontSize: 13, color: palette.ink2 }}>
                on {depositDateLabel(item.received_at!)}
              </Text>
            </>
          )}
        </View>

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 18, flexDirection: "row", gap: 8 }}>
          <ActionButton
            label="Edit"
            tinted={false}
            onPress={() => setEditVisible(true)}
            palette={palette}
            iconColor={palette.ink1}
            renderIcon={(c) => (
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )}
          />
          <ActionButton
            label={paused ? "Resume" : "Pause"}
            tinted={false}
            onPress={togglePause}
            disabled={busy === "pause"}
            palette={palette}
            iconColor={palette.ink1}
            renderIcon={(c) => (
              <Svg width={16} height={16} viewBox="0 0 24 24">
                {paused ? (
                  <Path d="M8 5l11 7-11 7V5z" fill={c} />
                ) : (
                  <Path d="M9 5v14M15 5v14" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                )}
              </Svg>
            )}
          />
          <ActionButton
            label={paused ? "Paused" : "Active"}
            tinted
            onPress={() => undefined}
            palette={palette}
            iconColor={palette.pos}
            renderIcon={(c) => (
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path d="M21 12a9 9 0 11-3-6.7" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M21 4v5h-5" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            )}
          />
        </View>

        {/* Variability chart */}
        {variability ? (
          <>
            <View style={{ paddingHorizontal: 18, paddingBottom: 8, flexDirection: "row", alignItems: "baseline", gap: 8 }}>
              <Text
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 12,
                  fontWeight: "600",
                  color: palette.ink1,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Variability
              </Text>
              <Text style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink3 }}>
                last {variability.recent.length}
              </Text>
              <View style={{ flex: 1 }} />
              <Text style={{ fontFamily: fonts.num, fontSize: 11.5, color: palette.ink2 }}>
                avg <Num style={{ color: palette.ink1 }}>{fmtMoneyShort(variability.averageCents)}</Num>
              </Text>
            </View>
            <VariabilityChart
              receipts={variability.recent.map((r) => ({ iso: r.received_at, amount: r.amount }))}
              averageCents={variability.averageCents}
              palette={palette}
            />
          </>
        ) : null}

        {/* Deposits list */}
        <View
          style={{
            marginTop: 14,
            backgroundColor: palette.surface,
            borderTopWidth: 1,
            borderTopColor: palette.line,
            borderBottomWidth: 1,
            borderBottomColor: palette.line,
          }}
        >
          {receipts.length === 0 ? (
            <Text style={{ padding: 18, fontFamily: fonts.ui, fontSize: 13, color: palette.ink3 }}>
              No deposits recorded yet.
            </Text>
          ) : (
            receipts.map((r, i) => (
              <View
                key={r.id}
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  borderBottomWidth: i === receipts.length - 1 ? 0 : 1,
                  borderBottomColor: palette.line,
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    backgroundColor: palette.posTint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Path d="M12 5v14M5 12l7 7 7-7" fill="none" stroke={palette.pos} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
                    {depositDateLabel(r.received_at)}
                  </Text>
                  {accountText ? (
                    <Text style={{ marginTop: 1, fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
                      Direct deposit · {accountText}
                    </Text>
                  ) : null}
                </View>
                <Num style={{ fontSize: 13.5, fontWeight: "500", color: palette.pos }}>+{fmtMoneyDollars(r.amount)}</Num>
              </View>
            ))
          )}
        </View>

        {error ? (
          <Text style={{ paddingHorizontal: 16, paddingTop: 12, fontFamily: fonts.ui, fontSize: 12, color: palette.neg }}>{error}</Text>
        ) : null}

        {/* Destructive */}
        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          <Pressable
            onPress={confirmDelete}
            disabled={busy === "delete"}
            style={({ pressed }) => ({
              height: 48,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: palette.lineFirm,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke={palette.warn} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.warn }}>
              {busy === "delete" ? "Deleting…" : "Delete income source"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <IncomeEditSheet
        visible={editVisible}
        income={editableIncome}
        spaceId={item.space_id}
        ownerUserId={item.owner_user_id}
        categorySuggestions={[]}
        onClose={() => setEditVisible(false)}
        onSaved={() => {
          setEditVisible(false);
          void reload();
        }}
      />
    </View>
  );
}

function ActionButton({
  label,
  tinted,
  onPress,
  disabled,
  palette,
  renderIcon,
  iconColor,
}: {
  label: string;
  tinted: boolean;
  onPress: () => void;
  disabled?: boolean;
  palette: ReturnType<typeof useTheme>["palette"];
  renderIcon: (color: string) => React.ReactNode;
  iconColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: tinted ? palette.posTint : palette.tinted,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 6,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {renderIcon(iconColor)}
      <Text
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 12,
          fontWeight: "500",
          color: tinted ? palette.pos : palette.ink1,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
