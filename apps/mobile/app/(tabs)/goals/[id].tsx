import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { fonts } from "@cvc/ui";
import {
  getSharesForGoal,
  removeGoalShare,
  setGoalShare,
} from "@cvc/api-client";
import { goalProgressFraction, projectMonthsToGoal } from "@cvc/domain";
import { haptics } from "../../../lib/haptics";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../lib/store";
import { useTheme } from "../../../lib/theme";
import { useSpaces } from "../../../hooks/useSpaces";
import {
  GoalEditSheet,
  type AccountOption,
  type EditableGoal,
} from "../../../components/GoalEditSheet";
import { AddMoneySheet } from "../../../components/AddMoneySheet";
import { GoalIcon } from "../../../components/goals/GoalIcon";
import { ProgressArc } from "../../../components/goals/ProgressArc";
import { resolveBranding } from "../../../components/goals/goalGlyphs";
import {
  StatusPill,
  classifyStatus,
  projectionLabel,
  statusTone,
} from "../../../components/goals/StatusPill";
import { Num, fmtMoneyShort } from "../../../components/goals/Num";

interface ContribTxn {
  id: string;
  posted_at: string;
  amount: number;
  display_name: string | null;
  merchant_name: string | null;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function targetMonthYear(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export default function GoalDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, mode } = useTheme();
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const { spaces } = useSpaces();

  const [goal, setGoal] = useState<EditableGoal | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [shares, setShares] = useState<Set<string>>(new Set());
  const [contribs, setContribs] = useState<ContribTxn[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const shareableSpaces = useMemo(
    () => spaces.filter((s) => s.id !== activeSpaceId),
    [spaces, activeSpaceId],
  );

  const reload = useCallback(async () => {
    if (!id) return;
    const [goalRes, accountsRes, sharesList] = await Promise.all([
      supabase.from("goals").select("*").eq("id", id).single(),
      supabase.from("accounts").select("id, name, type, current_balance"),
      getSharesForGoal(supabase, id),
    ]);
    setGoal((goalRes.data as unknown as EditableGoal) ?? null);
    setAccounts((accountsRes.data ?? []) as AccountOption[]);
    setShares(new Set(sharesList));
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const linked = useMemo(
    () => (goal?.linked_account_id ? accounts.find((a) => a.id === goal.linked_account_id) ?? null : null),
    [goal?.linked_account_id, accounts],
  );

  // Recent contributions on the linked account, sign-filtered.
  useEffect(() => {
    const accountId = goal?.linked_account_id;
    const kind = goal?.kind;
    if (!accountId || !kind) {
      setContribs([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id, posted_at, amount, display_name, merchant_name")
        .eq("account_id", accountId)
        .order("posted_at", { ascending: false })
        .limit(30);
      if (cancelled) return;
      const sign = kind === "save" ? 1 : -1;
      const rows = ((data ?? []) as ContribTxn[]).filter((t) =>
        sign === 1 ? t.amount > 0 : t.amount < 0,
      );
      setContribs(rows.slice(0, 6));
    })();
    return () => {
      cancelled = true;
    };
  }, [goal?.linked_account_id, goal?.kind]);

  const derived = useMemo(() => {
    if (!goal) return null;
    const linkedBalance = linked?.current_balance ?? 0;
    const savedCents =
      goal.kind === "save"
        ? linkedBalance > 0
          ? linkedBalance
          : 0
        : Math.max(0, (goal.starting_amount ?? 0) - (linkedBalance > 0 ? linkedBalance : 0));
    const targetCents = goal.kind === "save" ? goal.target_amount : goal.starting_amount ?? goal.target_amount;
    const remainingCents =
      goal.kind === "save"
        ? Math.max(0, goal.target_amount - savedCents)
        : Math.max(0, linkedBalance > 0 ? linkedBalance : goal.target_amount);
    const fraction = goalProgressFraction({
      kind: goal.kind,
      current: linkedBalance,
      target: goal.target_amount,
      starting: goal.starting_amount,
    });
    const monthsLeft = projectMonthsToGoal({
      kind: goal.kind,
      current: linkedBalance,
      target: goal.target_amount,
      monthlyContribution: goal.monthly_contribution,
      aprBps: goal.apr_bps ?? 0,
    });
    const status = classifyStatus({
      fraction,
      monthsLeft,
      targetDate: goal.target_date,
      monthlyContribution: goal.monthly_contribution,
    });
    const branding = resolveBranding(goal.kind, goal.name);
    return { savedCents, targetCents, remainingCents, fraction, monthsLeft, status, branding };
  }, [goal, linked]);

  async function toggleShare(spaceId: string) {
    if (!goal) return;
    try {
      if (shares.has(spaceId)) {
        await removeGoalShare(supabase, { goal_id: goal.id, space_id: spaceId });
      } else {
        await setGoalShare(supabase, { goal_id: goal.id, space_id: spaceId });
      }
      await reload();
    } catch {
      // best-effort; surfaced as no UI change
    }
  }

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.canvas }}>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailHeader palette={palette} onBack={() => router.back()} title="" rightDisabled />
      </View>
    );
  }

  if (!goal || !derived) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.canvas }}>
        <Stack.Screen options={{ headerShown: false }} />
        <DetailHeader palette={palette} onBack={() => router.back()} title="Not found" rightDisabled />
        <View style={{ padding: 20 }}>
          <Text style={{ fontFamily: fonts.ui, fontSize: 13.5, color: palette.ink2 }}>
            This goal could not be loaded.
          </Text>
        </View>
      </View>
    );
  }

  const readOnly = goal.space_id !== activeSpaceId;
  const tone = statusTone(palette, derived.status);
  const isSavings = goal.kind === "save";
  const dateLabel = targetMonthYear(goal.target_date);
  const projection = projectionLabel(derived.status, derived.monthsLeft, goal.target_date);
  const canAddMoney = !!goal.linked_account_id && !readOnly;

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <Stack.Screen options={{ headerShown: false }} />
      <DetailHeader
        palette={palette}
        onBack={() => router.back()}
        title="Goal"
        rightLabel={readOnly ? undefined : "Edit"}
        onRight={readOnly ? undefined : () => setEditOpen(true)}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}>
        {/* Hero */}
        <View style={{ alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 18 }}>
          <View
            style={{
              width: 196,
              height: 196,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <ProgressArc
              palette={palette}
              fraction={derived.fraction}
              size={196}
              thickness={10}
              color={tone.fg}
            />
            <View style={{ position: "absolute", alignItems: "center", justifyContent: "center" }}>
              <GoalIcon glyph={derived.branding.glyph} hue={derived.branding.hue} mode={mode} size={64} radius={16} />
            </View>
          </View>

          <Text
            numberOfLines={2}
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 22,
              fontWeight: "500",
              color: palette.ink1,
              letterSpacing: -0.4,
              textAlign: "center",
            }}
          >
            {goal.name}
          </Text>

          <View style={{ marginTop: 8 }}>
            <StatusPill palette={palette} status={derived.status} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 14 }}>
            {isSavings ? (
              <>
                <Num style={{ fontSize: 28, fontWeight: "600", color: palette.ink1, letterSpacing: -0.6 }}>
                  {fmtMoneyShort(derived.savedCents)}
                </Num>
                <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink3 }}>
                  of <Num style={{ color: palette.ink2, fontWeight: "500" }}>{fmtMoneyShort(derived.targetCents)}</Num>
                </Text>
              </>
            ) : (
              <>
                <Num style={{ fontSize: 28, fontWeight: "600", color: palette.ink1, letterSpacing: -0.6 }}>
                  {fmtMoneyShort(derived.remainingCents)}
                </Num>
                <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink3 }}>
                  left of <Num style={{ color: palette.ink2, fontWeight: "500" }}>{fmtMoneyShort(derived.targetCents)}</Num>
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Stats strip */}
        <View
          style={{
            marginHorizontal: 16,
            paddingVertical: 14,
            borderRadius: 14,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.line,
            flexDirection: "row",
          }}
        >
          <Stat
            palette={palette}
            label={isSavings ? "Saved" : "Paid down"}
            value={fmtMoneyShort(derived.savedCents)}
          />
          <StatDivider palette={palette} />
          <Stat
            palette={palette}
            label={dateLabel ? "Target" : "Date"}
            value={dateLabel ?? "—"}
          />
          <StatDivider palette={palette} />
          <Stat
            palette={palette}
            label="Monthly"
            value={
              goal.monthly_contribution
                ? `${fmtMoneyShort(goal.monthly_contribution)}`
                : "—"
            }
          />
        </View>

        {/* Projection one-liner */}
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            backgroundColor: tone.bg,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, fontWeight: "600", color: tone.fg }}>
            {projection}
          </Text>
        </View>

        {/* Primary action */}
        {canAddMoney && goal.linked_account_id ? (
          <View style={{ paddingHorizontal: 16, marginTop: 18 }}>
            <Pressable
              onPress={() => {
                haptics.selection();
                setAddOpen(true);
              }}
              style={({ pressed }) => ({
                height: 54,
                borderRadius: 14,
                backgroundColor: palette.brand,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 8,
                opacity: pressed ? 0.9 : 1,
                shadowColor: palette.brand,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 4,
              })}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d="M12 5v14M5 12h14"
                  fill="none"
                  stroke={palette.brandOn}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                />
              </Svg>
              <Text
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 15,
                  fontWeight: "500",
                  color: palette.brandOn,
                }}
              >
                {isSavings ? "Add money" : "Log payment"}
              </Text>
            </Pressable>
            {linked ? (
              <Text
                style={{
                  marginTop: 8,
                  fontFamily: fonts.ui,
                  fontSize: 11.5,
                  color: palette.ink3,
                  textAlign: "center",
                }}
              >
                {isSavings ? "Into " : "Against "}
                <Text style={{ color: palette.ink2, fontWeight: "500" }}>{linked.name}</Text>
              </Text>
            ) : null}
          </View>
        ) : !readOnly && !goal.linked_account_id ? (
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 18,
              padding: 14,
              borderRadius: 14,
              backgroundColor: palette.tinted,
              borderWidth: 1,
              borderColor: palette.line,
            }}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink1 }}>
              Link an account to track contributions
            </Text>
            <Text style={{ marginTop: 4, fontFamily: fonts.ui, fontSize: 12, color: palette.ink3, lineHeight: 17 }}>
              {isSavings
                ? "Pick a savings account in Edit and we'll show every deposit here."
                : "Pick the card or loan in Edit so payments count against the balance."}
            </Text>
            <Pressable
              onPress={() => setEditOpen(true)}
              style={({ pressed }) => ({
                marginTop: 10,
                alignSelf: "flex-start",
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: palette.brand,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 12,
                  fontWeight: "500",
                  color: palette.brandOn,
                }}
              >
                Edit goal
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Recent contributions */}
        {linked ? (
          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                marginHorizontal: 16,
                marginBottom: 8,
                fontFamily: fonts.uiMedium,
                fontSize: 13,
                fontWeight: "500",
                color: palette.ink2,
              }}
            >
              Recent {isSavings ? "deposits" : "payments"}
            </Text>
            {contribs.length === 0 ? (
              <View
                style={{
                  marginHorizontal: 16,
                  padding: 16,
                  borderRadius: 14,
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.line,
                }}
              >
                <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink3 }}>
                  Nothing yet. {isSavings ? "Your next deposit will show here." : "Your next payment will show here."}
                </Text>
              </View>
            ) : (
              <View
                style={{
                  marginHorizontal: 16,
                  borderRadius: 14,
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.line,
                  overflow: "hidden",
                }}
              >
                {contribs.map((t, i) => (
                  <View
                    key={t.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: palette.line,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontFamily: fonts.uiMedium,
                          fontSize: 13.5,
                          fontWeight: "500",
                          color: palette.ink1,
                        }}
                      >
                        {t.display_name || t.merchant_name || (isSavings ? "Deposit" : "Payment")}
                      </Text>
                      <Text style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>
                        {shortDate(t.posted_at)}
                      </Text>
                    </View>
                    <Num
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: isSavings ? palette.pos : palette.ink1,
                      }}
                    >
                      {fmtMoneyShort(Math.abs(t.amount))}
                    </Num>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {/* Share controls */}
        {!readOnly && shareableSpaces.length > 0 ? (
          <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
            <Text
              style={{
                marginBottom: 8,
                fontFamily: fonts.uiMedium,
                fontSize: 13,
                fontWeight: "500",
                color: palette.ink2,
              }}
            >
              Share with
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {shareableSpaces.map((s) => {
                const on = shares.has(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      haptics.selection();
                      toggleShare(s.id);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: on ? palette.brand : palette.surface,
                      borderWidth: 1,
                      borderColor: on ? palette.brand : palette.line,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.uiMedium,
                        fontSize: 12,
                        fontWeight: "500",
                        color: on ? palette.brandOn : palette.ink2,
                      }}
                    >
                      {s.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {readOnly ? (
          <View
            style={{
              marginTop: 24,
              marginHorizontal: 16,
              padding: 12,
              borderRadius: 14,
              backgroundColor: palette.tinted,
            }}
          >
            <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink2 }}>
              Shared from another space — read-only here.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <GoalEditSheet
        visible={editOpen}
        spaceId={activeSpaceId}
        goal={editOpen ? goal : null}
        accounts={accounts}
        shareableSpaces={shareableSpaces}
        currentShares={shares}
        onToggleShare={toggleShare}
        onClose={() => setEditOpen(false)}
        onSaved={reload}
      />

      {goal.linked_account_id ? (
        <AddMoneySheet
          visible={addOpen}
          goalName={goal.name}
          goalKind={goal.kind}
          linkedAccountId={goal.linked_account_id}
          linkedAccountName={linked?.name ?? null}
          onClose={() => setAddOpen(false)}
          onSaved={reload}
        />
      ) : null}
    </View>
  );
}

function DetailHeader({
  palette,
  onBack,
  title,
  rightLabel,
  onRight,
  rightDisabled,
}: {
  palette: ReturnType<typeof useTheme>["palette"];
  onBack: () => void;
  title: string;
  rightLabel?: string;
  onRight?: () => void;
  rightDisabled?: boolean;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingTop: 8,
        paddingBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      <Pressable
        onPress={onBack}
        style={({ pressed }) => ({
          width: 38,
          height: 38,
          borderRadius: 999,
          backgroundColor: palette.tinted,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
        })}
        accessibilityLabel="Back"
      >
        <Svg width={20} height={20} viewBox="0 0 24 24">
          <Path d="M15 6l-6 6 6 6" fill="none" stroke={palette.ink2} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: fonts.uiMedium,
            fontSize: 14,
            fontWeight: "500",
            color: palette.ink2,
          }}
        >
          {title}
        </Text>
      </View>
      {rightLabel && onRight && !rightDisabled ? (
        <Pressable
          onPress={onRight}
          style={({ pressed }) => ({
            paddingHorizontal: 14,
            height: 36,
            borderRadius: 999,
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.line,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 12.5,
              fontWeight: "500",
              color: palette.ink1,
            }}
          >
            {rightLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Stat({
  palette,
  label,
  value,
}: {
  palette: ReturnType<typeof useTheme>["palette"];
  label: string;
  value: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
      <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>{label}</Text>
      <Num style={{ marginTop: 4, fontSize: 15, fontWeight: "600", color: palette.ink1 }}>{value}</Num>
    </View>
  );
}

function StatDivider({ palette }: { palette: ReturnType<typeof useTheme>["palette"] }) {
  return <View style={{ width: 1, backgroundColor: palette.line, marginVertical: 4 }} />;
}
