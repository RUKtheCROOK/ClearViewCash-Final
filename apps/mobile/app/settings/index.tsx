import { Pressable, ScrollView } from "react-native";
import { router, type Href } from "expo-router";
import { Card, Stack, Text, colors, space } from "@cvc/ui";
import { supabase } from "../../lib/supabase";

const items: Array<{ key: string; title: string; href: Href }> = [
  { key: "profile", title: "Profile", href: "/settings/profile" },
  { key: "spaces", title: "Spaces & Members", href: "/settings/spaces" },
  { key: "payment-links", title: "Payment Links", href: "/settings/payment-links" },
  { key: "notifications", title: "Notifications", href: "/settings/notifications" },
  { key: "security", title: "Security (2FA, biometrics)", href: "/settings/security" },
  { key: "subscription", title: "Subscription & Billing", href: "/settings/subscription" },
  { key: "connected", title: "Connected Services", href: "/settings/connected" },
  { key: "delete-account", title: "Delete account", href: "/settings/delete-account" },
];

export default function SettingsHome() {
  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/(auth)/sign-in");
  }
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Card padded={false}>
        <Stack>
          {items.map((it) => (
            <Pressable
              key={it.key}
              onPress={() => router.push(it.href)}
              style={{
                paddingHorizontal: space.lg,
                paddingVertical: space.lg,
                borderBottomWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text>{it.title}</Text>
            </Pressable>
          ))}
        </Stack>
      </Card>
      <Pressable onPress={signOut} style={{ padding: space.md }}>
        <Text style={{ color: colors.negative, textAlign: "center" }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
