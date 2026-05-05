import { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { I, Money, Text } from "@cvc/ui";
import { useSpaces } from "../hooks/useSpaces";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";
import { useTier } from "../hooks/useTier";
import { useTheme } from "../lib/theme";
import { useDashboardHeader } from "./DashboardHeaderContext";
import { SpaceSwitcherSheet } from "./SpaceSwitcherSheet";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { PremiumModal } from "./PremiumModal";
import { QuickActionsMenu } from "./QuickActionsMenu";

interface Props {
  onAddTransaction?: () => void;
}

/**
 * Sticky header — shown across every tab. Renders the active-space pill,
 * a premium/quick-actions button, the notification bell + drawer, and the
 * gear (→ settings). On the dashboard tab a hero balance section is rendered
 * below; other tabs render only the row.
 *
 * The hero data is supplied by `DashboardHeaderContext` so any tab that wants
 * to populate it can do so without prop-drilling through the tab layout.
 *
 * The premium button to the left of the bell behaves differently per tier:
 *   - Free (starter): opens the Premium upsell modal with a 14-day trial CTA.
 *   - Pro / Household: opens a quick-actions popover with hub link, manual
 *     transaction add, and dark mode toggle.
 */
export function SpaceHeader({ onAddTransaction }: Props = {}) {
  const { activeSpace } = useSpaces();
  const { palette, sp } = useTheme(activeSpace?.tint);
  const unread = useUnreadNotifications();
  const { tier, canForecast } = useTier();
  const isPremium = tier !== "starter" || canForecast;
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const { hero } = useDashboardHeader();

  function handlePremiumButton() {
    if (isPremium) setQuickOpen(true);
    else setPremiumOpen(true);
  }

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

        <View style={{ flexDirection: "row", gap: 4 }}>
          <Pressable
            onPress={handlePremiumButton}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={6}
            accessibilityLabel={isPremium ? "Quick actions" : "Premium features"}
          >
            <I.gem color={isPremium ? palette.brand : palette.ink1} />
          </Pressable>
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
          <Pressable
            onPress={() => router.push("/settings")}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
            hitSlop={6}
          >
            <I.gear color={palette.ink1} />
          </Pressable>
        </View>
      </View>

      {hero ? (
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
          if (onAddTransaction) onAddTransaction();
          else router.push("/(tabs)/transactions");
        }}
      />
    </View>
  );
}
