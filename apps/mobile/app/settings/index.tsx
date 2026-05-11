import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { fonts } from "@cvc/ui";
import { getPlaidItemsStatus } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { useAuth } from "../../hooks/useAuth";
import { useSpaces } from "../../hooks/useSpaces";
import { useTier } from "../../hooks/useTier";
import { Group, PageHeader, ProChip, ProfileRow, PromotedCard, Row, SectionLabel } from "../../components/settings/SettingsAtoms";
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

  function confirmSignOut() {
    Alert.alert(
      "Sign out?",
      "You'll need your password to sign back in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace("/(auth)/sign-in");
          },
        },
      ],
    );
  }

  const email = user?.email ?? "";
  const initials = initialsFor(displayName, email);
  const securitySub =
    has2fa === null
      ? undefined
      : `2FA ${has2fa ? "on" : "off"}${biometricsEnabled === true ? " · biometrics on" : ""}`;
  const isPro = tier !== "starter";

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: 4 }}>
        {/* Header */}
        <PageHeader palette={palette} title="Settings" />

        {/* Profile card */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 }}>
          <ProfileRow
            palette={palette}
            initials={initials}
            title={displayName || email || "Your profile"}
            sub={email}
            chip={isPro ? <ProChip palette={palette} tone="brand">CLEAR PRO</ProChip> : undefined}
            onPress={() => router.push("/settings/profile")}
          />
        </View>

        {/* Promoted: 2FA — only when not enrolled */}
        {has2fa === false ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
            <PromotedCard
              palette={palette}
              glyph="shield"
              title="Turn on two-factor auth"
              body="30 seconds. Adds a second check at login — strongly recommended."
              onPress={() => router.push("/settings/security")}
            />
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
          <Row
            palette={palette}
            mode={mode}
            glyph="star"
            hue={45}
            title="Subscription & Billing"
            sub={isPro ? "Manage plan, payment, invoices" : undefined}
            value={tierLabel(tier)}
            onPress={() => router.push("/settings/subscription")}
          />
          <Row
            palette={palette}
            mode={mode}
            glyph="plug"
            hue={220}
            title="Connected Services"
            sub={plaidCount === null ? undefined : `Plaid · ${plaidCount} ${plaidCount === 1 ? "institution" : "institutions"}`}
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
            onPress={confirmSignOut}
            android_ripple={{ color: palette.negTint }}
            style={({ pressed }) => ({
              height: 48,
              borderRadius: 12,
              backgroundColor: palette.surface,
              borderWidth: 1,
              borderColor: palette.negTint,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 8,
                backgroundColor: palette.negTint,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {Si.signOut(palette.neg, 14)}
            </View>
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
