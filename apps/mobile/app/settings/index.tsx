import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { fonts } from "@cvc/ui";
import { getPlaidItemsStatus } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { useAuth } from "../../hooks/useAuth";
import { useSpaces } from "../../hooks/useSpaces";
import { useTier } from "../../hooks/useTier";
import { Group, PageHeader, ProChip, Row, SectionLabel } from "../../components/settings/SettingsAtoms";
import { Si } from "../../components/settings/settingsGlyphs";

const VERSION = (Constants.expoConfig?.version as string | undefined) ?? "2.4.1";

function initialsFor(name: string | null | undefined, email: string | null | undefined): string {
  const src = (name ?? "").trim() || (email ?? "").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function tierLabel(tier: string): string {
  if (tier === "pro") return "Pro · $9.99/mo";
  if (tier === "household") return "Household · $14.99/mo";
  return "Free";
}

export default function SettingsHome() {
  const { palette, mode } = useTheme();
  const { user } = useAuth();
  const { spaces } = useSpaces();
  const { tier } = useTier();

  const [displayName, setDisplayName] = useState<string>("");
  const [has2fa, setHas2fa] = useState<boolean | null>(null);
  const [plaidCount, setPlaidCount] = useState<number | null>(null);
  const [biometricsEnabled, setBiometricsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    supabase
      .from("users")
      .select("display_name")
      .maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (error || !data) return setHas2fa(false);
      setHas2fa((data.totp ?? []).some((f) => f.status === "verified"));
    });
    getPlaidItemsStatus(supabase)
      .then((rows) => setPlaidCount(rows.length))
      .catch(() => setPlaidCount(0));
    // Biometrics availability is a heavier check; we keep the row purely informational
    // and resolve it lazily in the security page.
    setBiometricsEnabled(null);
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/(auth)/sign-in");
  }

  const email = user?.email ?? "";
  const initials = initialsFor(displayName, email);
  const securitySub = has2fa === null ? "Loading…" : `2FA ${has2fa ? "on" : "off"}${biometricsEnabled === true ? " · biometrics on" : ""}`;
  const isPro = tier !== "starter";

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: 50 }}>
        {/* Header */}
        <PageHeader palette={palette} title="Settings" />

        {/* Profile card */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 }}>
          <Pressable
            onPress={() => router.push("/settings/profile")}
            android_ripple={{ color: palette.tinted }}
            style={({ pressed }) => ({
              padding: 14,
              borderRadius: 16,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.line,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                backgroundColor: "oklch(85% 0.060 30)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 20, fontWeight: "500", color: "oklch(30% 0.060 30)" }}>
                {initials}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 16, fontWeight: "500", color: palette.ink1 }} numberOfLines={1}>
                {displayName || email || "Your profile"}
              </Text>
              <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3, marginTop: 2 }} numberOfLines={1}>
                {email}
              </Text>
              {isPro ? (
                <View style={{ marginTop: 6, flexDirection: "row" }}>
                  <ProChip palette={palette} tone="brand">CLEAR PRO</ProChip>
                </View>
              ) : null}
            </View>
            {Si.chevR(palette.ink3)}
          </Pressable>
        </View>

        {/* Promoted: 2FA — only when not enrolled */}
        {has2fa === false ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
            <Pressable
              onPress={() => router.push("/settings/security")}
              android_ripple={{ color: palette.tinted }}
              style={({ pressed }) => ({
                padding: 14,
                borderRadius: 14,
                backgroundColor: palette.warnTint,
                borderWidth: 1,
                borderColor: mode === "dark" ? "oklch(40% 0.080 65)" : "oklch(88% 0.040 65)",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: palette.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {Si.shield(palette.warn)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
                  Turn on two-factor auth
                </Text>
                <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink2, marginTop: 2, lineHeight: 16 }}>
                  30 seconds. Adds a second check at login — strongly recommended.
                </Text>
              </View>
              {Si.chevR(palette.ink2)}
            </Pressable>
          </View>
        ) : null}

        {/* ACCOUNT */}
        <SectionLabel palette={palette}>ACCOUNT</SectionLabel>
        <Group palette={palette}>
          <Row palette={palette} mode={mode} glyph="user" hue={195} title="Profile" sub="Name, email, photo, password" onPress={() => router.push("/settings/profile")} />
          <Row palette={palette} mode={mode} glyph="spaces" hue={30} title="Spaces & Members" value={`${spaces.length} ${spaces.length === 1 ? "space" : "spaces"}`} onPress={() => router.push("/settings/spaces")} />
          <Row palette={palette} mode={mode} glyph="bell" hue={75} title="Notifications" value="Manage" onPress={() => router.push("/settings/notifications")} />
          <Row palette={palette} mode={mode} glyph="shield" hue={155} title="Security" sub={securitySub} onPress={() => router.push("/settings/security")} />
          <Row palette={palette} mode={mode} glyph="card" hue={35} title="Payment Links" sub="Auto-pay credit cards from depository" last onPress={() => router.push("/settings/payment-links")} />
        </Group>

        {/* PLAN */}
        <SectionLabel palette={palette}>PLAN</SectionLabel>
        <Group palette={palette}>
          <Row palette={palette} mode={mode} glyph="star" hue={45} title="Subscription & Billing" value={tierLabel(tier)} onPress={() => router.push("/settings/subscription")} />
          <Row
            palette={palette}
            mode={mode}
            glyph="plug"
            hue={220}
            title="Connected Services"
            sub={plaidCount === null ? "Loading…" : `Plaid · ${plaidCount} ${plaidCount === 1 ? "institution" : "institutions"}`}
            last
            onPress={() => router.push("/settings/connected")}
          />
        </Group>

        {/* PRIVACY & DATA */}
        <SectionLabel palette={palette}>PRIVACY &amp; DATA</SectionLabel>
        <Group palette={palette}>
          <Row palette={palette} mode={mode} glyph="lock" hue={240} title="Privacy & Data" sub="Export, retention, delete account" last onPress={() => router.push("/settings/privacy")} />
        </Group>

        {/* SUPPORT */}
        <SectionLabel palette={palette}>SUPPORT</SectionLabel>
        <Group palette={palette}>
          <Row palette={palette} mode={mode} glyph="help" hue={195} title="Help & Support" sub="FAQ, contact, feedback" onPress={() => router.push("/settings/help")} />
          <Row palette={palette} mode={mode} glyph="info" hue={220} title="About" sub={`Version ${VERSION} · Terms · Privacy`} last onPress={() => router.push("/settings/about")} />
        </Group>

        {/* Sign out */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <Pressable
            onPress={signOut}
            android_ripple={{ color: palette.tinted }}
            style={({ pressed }) => ({
              height: 48,
              borderRadius: 12,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.line,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.neg }}>Sign out</Text>
          </Pressable>
        </View>

        <View style={{ paddingTop: 16, alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.numMedium, fontSize: 10, color: palette.ink4, letterSpacing: 0.6 }}>
            CLEAR VIEW CASH · v{VERSION}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
