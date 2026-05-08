import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { fonts } from "@cvc/ui";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { useTier } from "../../hooks/useTier";
import {
  Group,
  PageHeader,
  Row,
  SectionLabel,
} from "../../components/settings/SettingsAtoms";
import { PlanCard } from "../../components/settings/PlanCard";
import { Si } from "../../components/settings/settingsGlyphs";

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? "http://localhost:3000";

interface SubscriptionSummary {
  tier: string;
  next_charge: string | null;
  next_charge_amount_cents: number | null;
  payment_method_last4: string | null;
  payment_method_brand: string | null;
  cancel_at_period_end: boolean;
}

function tierTitle(tier: string): string {
  if (tier === "pro") return "Clear Pro";
  if (tier === "household") return "Clear Household";
  return "Free";
}

function tierMonthlyPrice(tier: string): string {
  if (tier === "pro") return "$9.99";
  if (tier === "household") return "$14.99";
  return "$0";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function Subscription() {
  const { palette } = useTheme();
  const { tier } = useTier();
  const [loading, setLoading] = useState<string | null>(null);
  const [summary, setSummary] = useState<SubscriptionSummary | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${APP_URL}/api/stripe/subscription-summary`, {
          headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        });
        const json = (await res.json()) as SubscriptionSummary;
        setSummary(json);
      } catch {
        setSummary(null);
      }
    })();
  }, [tier]);

  async function startCheckout(plan: "pro" | "household") {
    setLoading(plan);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${APP_URL}/api/stripe/checkout`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ plan }),
    });
    const json = await res.json();
    setLoading(null);
    if (json.url) Linking.openURL(json.url);
  }

  async function openPortal() {
    setLoading("portal");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${APP_URL}/api/stripe/portal`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    const json = await res.json();
    setLoading(null);
    if (json.url) Linking.openURL(json.url);
  }

  const isPaid = tier !== "starter";
  const pmLine = summary?.payment_method_last4
    ? `${summary.payment_method_brand?.toUpperCase() ?? "Card"} ··${summary.payment_method_last4}`
    : "Set in portal";

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: 4 }}>
        <PageHeader palette={palette} title="Subscription & Billing" onBack={() => router.back()} />

        {/* Hero card */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View
            style={{
              padding: 18,
              borderRadius: 18,
              backgroundColor: palette.brand,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <View style={{ position: "absolute", right: -20, top: -20, opacity: 0.18 }}>
              <Svg width={120} height={120} viewBox="0 0 120 120">
                <Circle cx={60} cy={60} r={50} fill="none" stroke={palette.brandOn} strokeWidth={0.6} />
                <Circle cx={60} cy={60} r={30} fill="none" stroke={palette.brandOn} strokeWidth={0.6} />
                <Circle cx={60} cy={60} r={10} fill={palette.brandOn} />
              </Svg>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: palette.pos }} />
              <Text
                style={{
                  fontFamily: fonts.numMedium,
                  fontSize: 10,
                  color: palette.brandOn,
                  letterSpacing: 1,
                  fontWeight: "600",
                  opacity: 0.85,
                }}
              >
                CURRENT PLAN · {isPaid ? "ACTIVE" : "FREE"}
              </Text>
            </View>
            <Text
              style={{
                marginTop: 10,
                marginBottom: 4,
                fontFamily: fonts.uiMedium,
                fontSize: 30,
                fontWeight: "500",
                letterSpacing: -0.6,
                color: palette.brandOn,
              }}
            >
              {tierTitle(tier)}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
              <Text style={{ fontFamily: fonts.numMedium, fontSize: 22, fontWeight: "600", color: palette.brandOn }}>
                {tierMonthlyPrice(tier)}
              </Text>
              <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.brandOn, opacity: 0.85 }}>
                / month{isPaid ? " · billed monthly" : ""}
              </Text>
            </View>
            {isPaid ? (
              <>
                <View
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTopWidth: 1,
                    borderTopColor: palette.brandOn + "22",
                    flexDirection: "row",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: fonts.numMedium,
                        fontSize: 9,
                        color: palette.brandOn,
                        opacity: 0.7,
                        letterSpacing: 0.8,
                        fontWeight: "600",
                      }}
                    >
                      NEXT CHARGE
                    </Text>
                    <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.brandOn, marginTop: 2 }}>
                      {fmtDate(summary?.next_charge ?? null)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: fonts.numMedium,
                        fontSize: 9,
                        color: palette.brandOn,
                        opacity: 0.7,
                        letterSpacing: 0.8,
                        fontWeight: "600",
                      }}
                    >
                      METHOD
                    </Text>
                    <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.brandOn, marginTop: 2 }}>
                      {pmLine}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={openPortal}
                  disabled={loading === "portal"}
                  style={({ pressed }) => ({
                    marginTop: 14,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: palette.brandOn,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed || loading === "portal" ? 0.85 : 1,
                  })}
                >
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.brand }}>
                    {loading === "portal" ? "Opening…" : "Manage plan"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Text style={{ marginTop: 12, fontFamily: fonts.ui, fontSize: 12, color: palette.brandOn, opacity: 0.85 }}>
                Pick a plan below to unlock everything.
              </Text>
            )}
          </View>
        </View>

        {/* Compare plans */}
        <SectionLabel palette={palette}>COMPARE PLANS</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          <PlanCard
            palette={palette}
            name="Free"
            price="$0"
            cadence="/mo"
            features={["1 space", "2 connected accounts", "Basic bills + budgets"]}
            outline
            cta={isPaid ? "Downgrade" : "Current"}
            disabled={!isPaid}
            onPress={isPaid ? openPortal : undefined}
          />
          <PlanCard
            palette={palette}
            name="Pro"
            price="$9.99"
            cadence="/mo"
            current={tier === "pro"}
            features={["Unlimited spaces", "Unlimited accounts", "Forecast + Reports", "Goals + Plaid"]}
            cta={loading === "pro" ? "Opening…" : "Upgrade to Pro"}
            disabled={loading === "pro"}
            onPress={() => startCheckout("pro")}
          />
          <PlanCard
            palette={palette}
            name="Household"
            price="$14.99"
            cadence="/mo"
            current={tier === "household"}
            upsell={tier !== "household"}
            features={["Everything in Pro", "Up to 5 members per space", "Advanced sharing", "Priority support"]}
            cta={loading === "household" ? "Opening…" : "Switch to Household"}
            disabled={loading === "household"}
            onPress={() => startCheckout("household")}
          />
        </ScrollView>

        {/* Payment method */}
        <SectionLabel palette={palette}>PAYMENT METHOD</SectionLabel>
        <Group palette={palette}>
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: palette.line,
            }}
          >
            <View
              style={{
                width: 44,
                height: 30,
                borderRadius: 6,
                backgroundColor: "oklch(28% 0.080 260)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 9.5, fontWeight: "700", letterSpacing: 0.5, color: "white" }}>
                {summary?.payment_method_brand?.toUpperCase().slice(0, 4) ?? "CARD"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
                {summary?.payment_method_last4 ? `${summary.payment_method_brand ?? "Card"} ending in ${summary.payment_method_last4}` : "No payment method"}
              </Text>
              <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, marginTop: 2 }}>
                {summary?.payment_method_last4 ? "default" : "Add one in the billing portal"}
              </Text>
            </View>
            <Pressable
              onPress={openPortal}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 999,
                backgroundColor: palette.tinted,
              }}
            >
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 11, fontWeight: "500", color: palette.ink2 }}>Edit</Text>
            </Pressable>
          </View>
          <Row palette={palette} title="Add payment method" right={Si.plus(palette.ink2)} onPress={openPortal} last />
        </Group>

        {/* Invoices */}
        <SectionLabel palette={palette}>INVOICES</SectionLabel>
        <Group palette={palette}>
          <Row
            palette={palette}
            title="View invoices in billing portal"
            sub="Stripe lists every charge with downloadable PDFs."
            onPress={openPortal}
            last
          />
        </Group>

        {/* Plan changes */}
        {isPaid ? (
          <>
            <SectionLabel palette={palette}>PLAN CHANGES</SectionLabel>
            <Group palette={palette}>
              <Row
                palette={palette}
                title="Cancel subscription"
                sub={summary?.next_charge ? `You'll keep ${tierTitle(tier)} until ${fmtDate(summary.next_charge)}, then move to Free.` : "Manage cancellation in the billing portal."}
                danger
                onPress={openPortal}
                last
              />
            </Group>
          </>
        ) : null}

        <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
          <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3, lineHeight: 17, textAlign: "center" }}>
            Need a receipt for your accountant? Tap any invoice to download a PDF.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
