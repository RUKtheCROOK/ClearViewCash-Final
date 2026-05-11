import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { fonts, I, iconDiscTint, type IconKey, type Palette, type ThemeMode } from "@cvc/ui";
import { useSpaces } from "../../hooks/useSpaces";
import { useTier } from "../../hooks/useTier";
import { useTheme } from "../../lib/theme";
import { ProChip, SectionLabel } from "../../components/settings/SettingsAtoms";

interface PlanItem {
  key: string;
  title: string;
  sub: string;
  icon: IconKey;
  hue: number;
  href: string;
  proGated?: boolean;
}

const EVERYDAY: PlanItem[] = [
  { key: "bills", title: "Bills", sub: "What's due, what's paid, what's recurring", icon: "bill", hue: 35, href: "/bills" },
  { key: "income", title: "Income", sub: "Paychecks, deposits, and variability", icon: "bolt", hue: 75, href: "/income" },
  { key: "budgets", title: "Budgets", sub: "Limits by category, monthly or pay-cycle", icon: "cart", hue: 195, href: "/budgets" },
  { key: "goals", title: "Goals", sub: "Save toward targets and pay down debt", icon: "star", hue: 45, href: "/goals" },
];

const PRO: PlanItem[] = [
  { key: "forecast", title: "Forecast", sub: "30/90-day cash flow and what-if scenarios", icon: "spark", hue: 220, href: "/forecast", proGated: true },
  { key: "reports", title: "Reports", sub: "Cash flow, spending, net worth", icon: "summary", hue: 270, href: "/reports", proGated: true },
];

export default function Plan() {
  const { palette, mode } = useTheme();
  const { activeSpace } = useSpaces();
  const { tier, canForecast } = useTier();
  const isPro = tier !== "starter" || canForecast;
  const spaceName = activeSpace?.name ?? "Personal";

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 }}>
          <Text
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 28,
              fontWeight: "500",
              letterSpacing: -0.6,
              color: palette.ink1,
            }}
          >
            Plan
          </Text>
          <Text
            style={{
              marginTop: 2,
              fontFamily: fonts.ui,
              fontSize: 12,
              color: palette.ink3,
            }}
          >
            Tools for {spaceName} — bills, budgets, goals, and the longer view.
          </Text>
        </View>

        <SectionLabel palette={palette}>EVERYDAY</SectionLabel>
        <PlanGroup palette={palette} mode={mode}>
          {EVERYDAY.map((item, i) => (
            <PlanRow
              key={item.key}
              item={item}
              palette={palette}
              mode={mode}
              isPro={isPro}
              last={i === EVERYDAY.length - 1}
            />
          ))}
        </PlanGroup>

        <SectionLabel palette={palette}>THE LONGER VIEW</SectionLabel>
        <PlanGroup palette={palette} mode={mode}>
          {PRO.map((item, i) => (
            <PlanRow
              key={item.key}
              item={item}
              palette={palette}
              mode={mode}
              isPro={isPro}
              last={i === PRO.length - 1}
            />
          ))}
        </PlanGroup>
      </ScrollView>
    </View>
  );
}

interface PlanGroupProps {
  children: React.ReactNode;
  palette: Palette;
  mode: ThemeMode;
}

function PlanGroup({ children, palette }: PlanGroupProps) {
  return (
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
  );
}

interface PlanRowProps {
  item: PlanItem;
  palette: Palette;
  mode: ThemeMode;
  isPro: boolean;
  last: boolean;
}

function PlanRow({ item, palette, mode, isPro, last }: PlanRowProps) {
  const Icon = I[item.icon];
  const tint = iconDiscTint(item.hue, mode);
  const locked = item.proGated && !isPro;
  return (
    <Pressable
      onPress={() => router.push(item.href as never)}
      android_ripple={{ color: palette.tinted }}
    >
      {({ pressed }) => (
        <View
          style={{
            paddingHorizontal: 18,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderBottomWidth: last ? 0 : 1,
            borderBottomColor: palette.line,
            opacity: pressed ? 0.85 : 1,
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              backgroundColor: tint.wash,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon color={tint.fg} size={20} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 15,
                  fontWeight: "500",
                  color: palette.ink1,
                  lineHeight: 18,
                }}
              >
                {item.title}
              </Text>
              {locked ? <ProChip palette={palette} tone="brand">PRO</ProChip> : null}
            </View>
            <Text
              style={{
                fontFamily: fonts.ui,
                fontSize: 12,
                color: palette.ink3,
                marginTop: 2,
                lineHeight: 16,
              }}
            >
              {item.sub}
            </Text>
          </View>
          <I.chevR color={palette.ink3} />
        </View>
      )}
    </Pressable>
  );
}
