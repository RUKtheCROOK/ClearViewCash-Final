import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { fonts } from "@cvc/ui";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { Group, PageHeader, SectionLabel } from "../../components/settings/SettingsAtoms";

/**
 * Account deletion is required by Apple App Store guidelines for any app
 * that supports account creation. This route must work end-to-end before
 * App Store submission.
 */
export default function DeleteAccount() {
  const { palette } = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function performDelete() {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
      await supabase.auth.signOut();
      router.replace("/(auth)/sign-in");
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <PageHeader palette={palette} title="Delete account" onBack={() => router.back()} />

        <SectionLabel palette={palette}>WHAT THIS DOES</SectionLabel>
        <Group palette={palette}>
          <View style={{ padding: 18, gap: 8 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
              This permanently deletes your account.
            </Text>
            <Text style={{ fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink2, lineHeight: 18 }}>
              All linked institutions, all transactions, and all spaces you own will be removed. Members of shared spaces you co-own will lose access. There is no recovery.
            </Text>
          </View>
        </Group>

        <View style={{ padding: 16, gap: 8 }}>
          {error ? (
            <View style={{ padding: 12, borderRadius: 12, backgroundColor: palette.negTint }}>
              <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.neg }}>{error}</Text>
            </View>
          ) : null}
          {!confirming ? (
            <Pressable
              onPress={() => setConfirming(true)}
              style={({ pressed }) => ({
                height: 48,
                borderRadius: 12,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.line,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.neg }}>
                I understand, continue
              </Text>
            </Pressable>
          ) : (
            <>
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "600", color: palette.neg }}>
                Final confirmation. There is no recovery after this.
              </Text>
              <Pressable
                onPress={performDelete}
                disabled={loading}
                style={{ height: 48, borderRadius: 12, backgroundColor: palette.neg, alignItems: "center", justifyContent: "center", opacity: loading ? 0.5 : 1 }}
              >
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: "white" }}>
                  {loading ? "Deleting…" : "Delete my account"}
                </Text>
              </Pressable>
              <Pressable onPress={() => setConfirming(false)} style={{ height: 48, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink2 }}>Cancel</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
