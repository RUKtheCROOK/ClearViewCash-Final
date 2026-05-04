import { useState } from "react";
import { ScrollView } from "react-native";
import { router } from "expo-router";
import { Button, Card, Stack, Text, colors, space } from "@cvc/ui";
import { supabase } from "../../lib/supabase";

/**
 * Account deletion is required by Apple App Store guidelines for any app
 * that supports account creation. This route must work end-to-end before
 * App Store submission.
 */
export default function DeleteAccount() {
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
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="md">
          <Text variant="h2">Delete account</Text>
          <Text variant="muted">
            This permanently deletes your account, all linked institutions, all transactions, and all spaces you own.
            Members of shared spaces you co-own will lose access. This cannot be undone.
          </Text>
          {!confirming ? (
            <Button label="I understand, continue" variant="destructive" onPress={() => setConfirming(true)} />
          ) : (
            <Stack gap="sm">
              <Text style={{ color: colors.negative, fontWeight: "600" }}>
                Final confirmation. There is no recovery after this.
              </Text>
              <Button label="Delete my account" variant="destructive" onPress={performDelete} loading={loading} />
              <Button label="Cancel" variant="ghost" onPress={() => setConfirming(false)} />
              {error ? <Text style={{ color: colors.negative }}>{error}</Text> : null}
            </Stack>
          )}
        </Stack>
      </Card>
    </ScrollView>
  );
}
