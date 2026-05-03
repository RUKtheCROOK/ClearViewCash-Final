import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Stack, Text, colors, space } from "@cvc/ui";
import { supabase } from "../../lib/supabase";
import { openPlaidLink } from "../../lib/plaid";

export default function LinkBank() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/plaid-link-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      if (json.link_token) setToken(json.link_token);
      else setError(json.error ?? "Could not start Plaid Link");
    })();
  }, []);

  async function onLink() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const publicToken = await openPlaidLink(token);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/plaid-exchange`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ public_token: publicToken }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "exchange_failed");
      router.replace("/(onboarding)/tour");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, padding: space.lg, justifyContent: "center", backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="lg">
          <Text variant="h1">Link your first account</Text>
          <Text variant="muted">
            We use Plaid to securely connect to thousands of banks. Your credentials are never seen by
            ClearViewCash. We only receive read-only access to balances and transactions.
          </Text>
          <Button label={loading ? "Connecting…" : "Connect with Plaid"} onPress={onLink} disabled={!token || loading} />
          {error ? <Text style={{ color: colors.negative }}>{error}</Text> : null}
          <Button label="Skip for now" variant="ghost" onPress={() => router.replace("/(tabs)/dashboard")} />
        </Stack>
      </Card>
    </View>
  );
}
