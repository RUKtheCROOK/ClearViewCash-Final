import { useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { Button, Card, HStack, Stack, Text, colors, space } from "@cvc/ui";
import { supabase } from "../../lib/supabase";
import { useTier } from "../../hooks/useTier";

const APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function Subscription() {
  const { tier } = useTier();
  const [loading, setLoading] = useState<string | null>(null);

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

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="sm">
          <Text variant="label">Current plan</Text>
          <Text variant="h2">{tier === "starter" ? "Starter (free)" : tier === "pro" ? "Personal Pro" : "Household"}</Text>
        </Stack>
      </Card>

      <Plan title="Personal Pro" price="$9.99 / mo" features={["Unlimited accounts", "3 spaces", "Cash Flow Forecast", "Goals, Bills, Budgets, Reports", "Alerts"]} cta={tier === "pro" ? "Current plan" : "Upgrade to Pro"} disabled={tier === "pro"} loading={loading === "pro"} onPress={() => startCheckout("pro")} />
      <Plan title="Household" price="$14.99 / mo" features={["Everything in Pro", "Unlimited spaces", "Up to 5 members per space", "Advanced sharing", "Priority support"]} cta={tier === "household" ? "Current plan" : "Upgrade to Household"} disabled={tier === "household"} loading={loading === "household"} onPress={() => startCheckout("household")} />

      {tier !== "starter" ? (
        <Button label="Manage billing" variant="secondary" onPress={openPortal} loading={loading === "portal"} />
      ) : null}
    </ScrollView>
  );
}

function Plan({ title, price, features, cta, disabled, loading, onPress }: {
  title: string; price: string; features: string[]; cta: string; disabled?: boolean; loading?: boolean; onPress: () => void;
}) {
  return (
    <Card>
      <Stack gap="md">
        <HStack justify="space-between">
          <Text variant="title">{title}</Text>
          <Text variant="muted">{price}</Text>
        </HStack>
        <View>
          {features.map((f) => (
            <Text key={f} variant="muted">• {f}</Text>
          ))}
        </View>
        <Button label={cta} disabled={disabled} loading={loading} onPress={onPress} />
      </Stack>
    </Card>
  );
}
