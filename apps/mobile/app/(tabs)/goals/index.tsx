import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { fonts } from "@cvc/ui";
import { getGoalsForView } from "@cvc/api-client";
import { goalProgressFraction, projectMonthsToGoal } from "@cvc/domain";
import { haptics } from "../../../lib/haptics";
import { supabase } from "../../../lib/supabase";
import { useApp } from "../../../lib/store";
import { useTheme } from "../../../lib/theme";
import { useEffectiveSharedView } from "../../../lib/view";
import { useSpaces } from "../../../hooks/useSpaces";
import {
  GoalEditSheet,
  type AccountOption,
  type EditableGoal,
} from "../../../components/GoalEditSheet";
import { SpaceSwitcherSheet } from "../../../components/SpaceSwitcherSheet";
import { AggregateStrip } from "../../../components/goals/AggregateStrip";
import { JustReachedBanner } from "../../../components/goals/JustReachedBanner";
import { GoalCard, type GoalCardData } from "../../../components/goals/GoalCard";
import { AddGoalCard } from "../../../components/goals/AddGoalCard";
import { resolveBranding } from "../../../components/goals/goalGlyphs";
import { classifyStatus, type GoalStatus } from "../../../components/goals/StatusPill";
import { fmtMoneyShort } from "../../../components/goals/Num";

export default function Goals() {
  const router = useRouter();
  const { palette, mode } = useTheme();
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const pendingGoalDraft = useApp((s) => s.pendingGoalDraft);
  const setPendingGoalDraft = useApp((s) => s.setPendingGoalDraft);
  const { activeSpace } = useSpaces();
  const { sharedView, toggleVisible } = useEffectiveSharedView(activeSpace);
  const toggleView = useApp((s) => s.toggleView);

  const [goals, setGoals] = useState<EditableGoal[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [prefillAccount, setPrefillAccount] = useState<AccountOption | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [spaceSwitcherOpen, setSpaceSwitcherOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>("");

  const balanceById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.current_balance ?? 0])),
    [accounts],
  );

  const reload = useCallback(async () => {
    if (!activeSpaceId) {
      setLoaded(true);
      return;
    }
    const [g, accs] = await Promise.all([
      getGoalsForView(supabase, { spaceId: activeSpaceId, includeShared: sharedView }),
      supabase.from("accounts").select("id, name, type, current_balance"),
    ]);
    const goalRows = g as unknown as EditableGoal[];
    setGoals(goalRows);
    setAccounts((accs.data ?? []) as AccountOption[]);
    setLoaded(true);
  }, [activeSpaceId, sharedView]);

  // Reset loaded when the active space changes so we don't briefly show
  // another space's goals while the new reload is in flight.
  useEffect(() => {
    setLoaded(false);
  }, [activeSpaceId, sharedView]);

  useEffect(() => {
    reload();
  }, [reload]);

  // One-shot prefill from accounts tab "Track as goal".
  useEffect(() => {
    if (!pendingGoalDraft) return;
    setError("");
    setPrefillAccount({
      id: pendingGoalDraft.account_id,
      name: pendingGoalDraft.account_name,
      type: "credit",
      current_balance: pendingGoalDraft.balance_cents,
    });
    setSheetOpen(true);
    setPendingGoalDraft(null);
  }, [pendingGoalDraft, setPendingGoalDraft]);

  const cards = useMemo<{ data: GoalCardData; raw: EditableGoal }[]>(() => {
    return goals.map((g) => {
      const linkedBalance = g.linked_account_id ? balanceById.get(g.linked_account_id) ?? 0 : 0;
      const savedCents =
        g.kind === "save"
          ? linkedBalance > 0
            ? linkedBalance
            : 0
          : Math.max(0, (g.starting_amount ?? 0) - (linkedBalance > 0 ? linkedBalance : 0));
      const targetCents = g.kind === "save" ? g.target_amount : g.starting_amount ?? g.target_amount;
      const remainingCents =
        g.kind === "save"
          ? Math.max(0, g.target_amount - savedCents)
          : Math.max(0, linkedBalance > 0 ? linkedBalance : g.target_amount);
      const fraction = goalProgressFraction({
        kind: g.kind,
        current: linkedBalance,
        target: g.target_amount,
        starting: g.starting_amount,
      });
      const monthsLeft = projectMonthsToGoal({
        kind: g.kind,
        current: linkedBalance,
        target: g.target_amount,
        monthlyContribution: g.monthly_contribution,
        aprBps: g.apr_bps ?? 0,
      });
      const status: GoalStatus = classifyStatus({
        fraction,
        monthsLeft,
        targetDate: g.target_date,
        monthlyContribution: g.monthly_contribution,
      });
      const branding = resolveBranding(g.kind, g.name);
      return {
        raw: g,
        data: {
          id: g.id,
          kind: g.kind,
          name: g.name,
          glyph: branding.glyph,
          hue: branding.hue,
          savedCents,
          targetCents,
          remainingCents,
          status,
          monthsLeft,
          targetDate: g.target_date,
          readOnly: g.space_id !== activeSpaceId,
        },
      };
    });
  }, [goals, balanceById, activeSpaceId]);

  const aggregate = useMemo(() => {
    let savedCents = 0;
    let savedGoalCount = 0;
    let paidDownCents = 0;
    let monthlyTotalCents = 0;
    for (const c of cards) {
      if (c.data.kind === "save") {
        savedCents += c.data.savedCents;
        if (c.data.savedCents > 0) savedGoalCount += 1;
      } else {
        paidDownCents += c.data.savedCents;
      }
      if (c.raw.monthly_contribution) {
        monthlyTotalCents += c.raw.monthly_contribution;
      }
    }
    return { savedCents, savedGoalCount, paidDownCents, monthlyTotalCents };
  }, [cards]);

  const reachedCards = useMemo(() => cards.filter((c) => c.data.status === "done"), [cards]);

  function startNew() {
    haptics.selection();
    setPrefillAccount(null);
    setSheetOpen(true);
  }

  function openGoal(g: EditableGoal) {
    router.push({ pathname: "/goals/[id]", params: { id: g.id } });
  }

  const spaceTintHex = activeSpace?.tint ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 14,
            paddingBottom: 10,
            flexDirection: "row",
            alignItems: "flex-start",
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
              Goals
            </Text>
            {activeSpace ? (
              <SpacePill
                name={activeSpace.name}
                tintHex={spaceTintHex}
                onPress={() => setSpaceSwitcherOpen(true)}
              />
            ) : null}
            {loaded && cards.length > 0 ? (
              <Text
                style={{
                  marginTop: 6,
                  fontFamily: fonts.ui,
                  fontSize: 12,
                  color: palette.ink3,
                }}
              >
                {cards.length} goal{cards.length === 1 ? "" : "s"}
                {aggregate.savedCents > 0 ? ` · ${fmtMoneyShort(aggregate.savedCents)} saved` : ""}
                {aggregate.monthlyTotalCents > 0
                  ? ` · ${fmtMoneyShort(aggregate.monthlyTotalCents)}/mo`
                  : ""}
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {toggleVisible ? (
              <Pressable
                onPress={toggleView}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: palette.line,
                  backgroundColor: sharedView ? palette.brandTint : palette.surface,
                }}
              >
                <Text
                  style={{
                    fontFamily: fonts.uiMedium,
                    fontSize: 13,
                    color: sharedView ? palette.brand : palette.ink2,
                  }}
                >
                  {sharedView ? "Shared" : "My view"}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={startNew}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                borderRadius: 999,
                backgroundColor: palette.brand,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.9 : 1,
                shadowColor: palette.brand,
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.18,
                shadowRadius: 6,
                elevation: 3,
              })}
              accessibilityLabel="New goal"
            >
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M12 5v14M5 12h14" fill="none" stroke={palette.brandOn} strokeWidth={2.2} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>
        </View>

        {error ? (
          <View
            style={{
              marginHorizontal: 16,
              marginBottom: 12,
              padding: 10,
              borderRadius: 14,
              backgroundColor: palette.warnTint,
            }}
          >
            <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.warn }}>{error}</Text>
          </View>
        ) : null}

        {!loaded ? null : cards.length === 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            <View
              style={{
                padding: 28,
                borderRadius: 14,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.line,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 18,
                  fontWeight: "500",
                  color: palette.ink1,
                  textAlign: "center",
                  letterSpacing: -0.3,
                }}
              >
                Pick something to work toward
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  fontFamily: fonts.ui,
                  fontSize: 13,
                  color: palette.ink2,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                A fund, a thing, a debt to clear. We&apos;ll track the pace and tell you if you&apos;re ahead or behind.
              </Text>
              <Text
                style={{
                  marginTop: 14,
                  fontFamily: fonts.ui,
                  fontSize: 12,
                  color: palette.ink3,
                  textAlign: "center",
                }}
              >
                Tap <Text style={{ fontFamily: fonts.uiMedium, fontWeight: "600", color: palette.brand }}>+</Text> above to start your first.
              </Text>
            </View>
          </View>
        ) : (
          <>
            <AggregateStrip
              palette={palette}
              savedCents={aggregate.savedCents}
              savedGoalCount={aggregate.savedGoalCount}
              paidDownCents={aggregate.paidDownCents}
              monthlyTotalCents={aggregate.monthlyTotalCents}
            />

            {reachedCards.map((c) => (
              <JustReachedBanner
                key={c.data.id}
                palette={palette}
                name={c.data.name}
                detail={`${c.data.kind === "save" ? "Saved" : "Cleared"} $${(c.data.targetCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
                onView={() => openGoal(c.raw)}
              />
            ))}

            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {cards.map((c) => (
                <GoalCard
                  key={c.data.id}
                  palette={palette}
                  mode={mode}
                  goal={c.data}
                  onPress={() => openGoal(c.raw)}
                />
              ))}
            </View>

            <AddGoalCard palette={palette} onPress={startNew} />
          </>
        )}
      </ScrollView>

      <GoalEditSheet
        visible={sheetOpen}
        spaceId={activeSpaceId}
        goal={null}
        prefillAccount={prefillAccount}
        accounts={accounts}
        onClose={() => {
          setSheetOpen(false);
          setPrefillAccount(null);
        }}
        onSaved={reload}
      />

      <SpaceSwitcherSheet
        visible={spaceSwitcherOpen}
        onClose={() => setSpaceSwitcherOpen(false)}
      />
    </View>
  );
}

function SpacePill({
  name,
  tintHex,
  onPress,
}: {
  name: string;
  tintHex: string | null | undefined;
  onPress: () => void;
}) {
  const { palette, mode } = useTheme(tintHex);
  const wash = mode === "dark" ? palette.brandTint : palette.brandTint;
  const fg = palette.brand;
  return (
    <Pressable
      onPress={onPress}
      style={{
        marginTop: 6,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: wash,
        alignSelf: "flex-start",
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: fg }} />
      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 11.5, fontWeight: "500", color: fg }}>
        {name}
      </Text>
      <Svg width={11} height={11} viewBox="0 0 24 24">
        <Path
          d="M7 7h12l-3-3M17 17H5l3 3"
          fill="none"
          stroke={fg}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

