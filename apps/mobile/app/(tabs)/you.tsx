import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { fonts } from "@cvc/ui";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { useAuth } from "../../hooks/useAuth";
import { useTier } from "../../hooks/useTier";
import {
  Group,
  PageHeader,
  ProChip,
  ProfileRow,
  Row,
  SectionLabel,
} from "../../components/settings/SettingsAtoms";
import { Si } from "../../components/settings/settingsGlyphs";

function initialsFor(name: string | null | undefined, email: string | null | undefined): string {
  const src = (name ?? "").trim() || (email ?? "").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function tierLabel(tier: string): string {
  if (tier === "pro") return "Clear Pro";
  if (tier === "household") return "Clear Household";
  return "Free plan";
}

export default function You() {
  const { palette, mode } = useTheme();
  const { user } = useAuth();
  const { tier } = useTier();
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    supabase
      .from("users")
      .select("display_name")
      .maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));
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
  const isPro = tier !== "starter";

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80, paddingTop: 4 }}>
        <PageHeader palette={palette} title="You" />

        {/* Identity */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
          <ProfileRow
            palette={palette}
            initials={initials}
            title={displayName || email || "Your profile"}
            sub={email}
            chip={isPro ? <ProChip palette={palette} tone="brand">CLEAR PRO</ProChip> : undefined}
            onPress={() => router.push("/settings/profile")}
          />
        </View>

        <SectionLabel palette={palette}>QUICK ACCESS</SectionLabel>
        <Group palette={palette}>
          <Row
            palette={palette}
            mode={mode}
            glyph="star"
            hue={45}
            title="Subscription & Billing"
            value={tierLabel(tier)}
            onPress={() => router.push("/settings/subscription")}
          />
          <Row
            palette={palette}
            mode={mode}
            glyph="bell"
            hue={75}
            title="Notifications"
            value="Manage"
            onPress={() => router.push("/settings/notifications")}
          />
          <Row
            palette={palette}
            mode={mode}
            glyph="shield"
            hue={155}
            title="Security"
            value="2FA, biometrics"
            last
            onPress={() => router.push("/settings/security")}
          />
        </Group>

        <SectionLabel palette={palette}>EVERYTHING ELSE</SectionLabel>
        <Group palette={palette}>
          <Row
            palette={palette}
            mode={mode}
            glyph="user"
            hue={195}
            title="All settings"
            sub="Profile, spaces, payment links, privacy, about"
            last
            onPress={() => router.push("/settings")}
          />
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
      </ScrollView>
    </View>
  );
}
