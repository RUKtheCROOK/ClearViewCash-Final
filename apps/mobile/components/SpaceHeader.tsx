import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, usePathname } from "expo-router";
import { I, Money, Text } from "@cvc/ui";
import { useSpaces } from "../hooks/useSpaces";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";
import { useTier } from "../hooks/useTier";
import { useTheme } from "../lib/theme";
import { useApp } from "../lib/store";
import { useDashboardHeader } from "./DashboardHeaderContext";
import { SpaceSwitcherSheet } from "./SpaceSwitcherSheet";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { PremiumModal } from "./PremiumModal";
import { QuickActionsMenu } from "./QuickActionsMenu";

interface Props {
  onAddTransaction?: () => void;
}

/**
 * Sticky header — shown across every tab. Renders the active-space pill, a
 * universal "+" quick-actions button, an upgrade gem (Free users only), and
 * the notification bell + drawer. On the dashboard tab a hero balance section
 * is rendered below; other tabs render only the row.
 *
 * The hero data is supplied by `DashboardHeaderContext`. Two affordances are
 * deliberately kept distinct so the verb stays stable across tiers:
 *   - "+" always opens the quick-actions popover (Add transaction, theme,
 *     premium-hub link). Same meaning for every tier.
 *   - Gem only appears for Free (starter) users and opens the Premium upsell.
 *     It disappears once the user is on Pro/Household.
 */
export function SpaceHeader({ onAddTransaction }: Props = {}) {
  const { activeSpace } = useSpaces();
  const { palette, sp } = useTheme(activeSpace?.tint);
  const unread = useUnreadNotifications();
  const { tier, canForecast } = useTier();
  const requestAddTransaction = useApp((s) => s.requestAddTransaction);
  const isPremium = tier !== "starter" || canForecast;
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const { hero } = useDashboardHeader();
  const pathname = usePathname();
  const showHero = pathname === "/dashboard";

  return (
    <View
      style={{
        backgroundColor: sp.wash,
        paddingTop: 56,
        paddingBottom: 14,
        borderBottomColor: sp.edge,
        borderBottomWidth: 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
        }}
      >
        <Pressable
          onPress={() => setSwitcherOpen(true)}
          style={{
            backgroundColor: sp.pillBg,
            height: 36,
            paddingLeft: 10,
            paddingRight: 6,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
          <I.spaces color={sp.pillFg} size={16} />
          <Text style={{ color: sp.pillFg, fontWeight: "500", fontSize: 14 }}>
            {activeSpace?.name ?? "Personal"}
          </Text>
          <I.chev color={sp.pillFg} />
        </Pressable>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => setQuickOpen(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={6}
            accessibilityLabel="Quick actions"
          >
            <I.plus color={palette.ink1} />
          </Pressable>
          {!isPremium ? (
            <Pressable
              onPress={() => setPremiumOpen(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
              }}
              hitSlop={6}
              accessibilityLabel="Upgrade to Pro"
            >
              <I.gem color={palette.brand} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => setDrawerOpen(true)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={6}
            accessibilityLabel="Notifications"
          >
            <View>
              <I.bell color={palette.ink1} />
              {unread > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -2,
                    minWidth: 14,
                    height: 14,
                    paddingHorizontal: 3,
                    borderRadius: 999,
                    backgroundColor: palette.neg,
                    borderColor: sp.wash,
                    borderWidth: 1.5,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{ color: "white", fontSize: 9, fontWeight: "700" }}
                  >
                    {unread > 99 ? "99+" : unread}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </View>
      </View>

      {hero && showHero ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Text variant="eyebrow" style={{ color: palette.ink2 }}>
              Effective available cash
            </Text>
            <I.info color={palette.ink3} />
          </View>
          <Money
            cents={hero.effectiveCents}
            splitCents
            style={{
              fontSize: 44,
              lineHeight: 46,
              fontWeight: "500",
              letterSpacing: -1.1,
              color: palette.ink1,
            }}
            centsStyle={{ color: palette.ink3 }}
          />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <Text style={{ fontSize: 13, color: palette.ink2 }}>Total balance</Text>
            <Money
              cents={hero.totalCashCents}
              style={{ fontSize: 13, color: palette.ink1, fontWeight: "500" }}
            />
            {hero.linkedCardDebtCents > 0 ? (
              <>
                <Text style={{ fontSize: 13, color: palette.ink3 }}>·</Text>
                <Text style={{ fontSize: 13, color: palette.ink3 }}>
                  after −${(hero.linkedCardDebtCents / 100).toFixed(0)} linked card debt
                </Text>
              </>
            ) : null}
            {hero.upcomingBillsCents > 0 ? (
              <>
                <Text style={{ fontSize: 13, color: palette.ink3 }}>·</Text>
                <Text style={{ fontSize: 13, color: palette.ink3 }}>
                  −${(hero.upcomingBillsCents / 100).toFixed(0)} upcoming bills
                </Text>
              </>
            ) : null}
          </View>
        </View>
      ) : null}

      <SpaceSwitcherSheet visible={switcherOpen} onClose={() => setSwitcherOpen(false)} />
      <NotificationsDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <PremiumModal
        visible={premiumOpen}
        onClose={() => setPremiumOpen(false)}
        onStartTrial={() => {
          setPremiumOpen(false);
          router.push("/settings");
        }}
      />
      <QuickActionsMenu
        visible={quickOpen}
        onClose={() => setQuickOpen(false)}
        onAddTransaction={() => {
          setQuickOpen(false);
          if (onAddTransaction) {
            onAddTransaction();
          } else {
            // Signal the Activity tab to open the AddTransactionSheet on mount,
            // then route there. Activity clears the flag once it consumes it.
            requestAddTransaction(true);
            router.push("/(tabs)/transactions");
          }
        }}
      />
    </View>
  );
}
