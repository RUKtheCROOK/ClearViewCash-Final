import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Card, HStack, Stack, Text, colors, space } from "@cvc/ui";
import { supabase } from "../../../lib/supabase";

interface Item {
  id: string;
  institution_name: string | null;
  status: string;
}

export default function Connected() {
  const [items, setItems] = useState<Item[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("plaid_items")
      .select("id, institution_name, status")
      .order("institution_name", { ascending: true });
    setItems((data ?? []) as Item[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh when navigating back from the manage page so a removed service
  // disappears from the list immediately.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Text variant="h2">Connected services</Text>
      <Text variant="muted">
        Plaid connections to your financial institutions. Tap to manage or remove.
      </Text>
      {items.length === 0 ? (
        <Card>
          <Text variant="muted">No connected services. Link a bank from the Accounts tab.</Text>
        </Card>
      ) : null}
      {items.map((i) => (
        <Pressable
          key={i.id}
          onPress={() => router.push({ pathname: "/settings/connected/[id]", params: { id: i.id } })}
        >
          <Card>
            <Stack gap="xs">
              <HStack justify="space-between" align="center">
                <Text variant="title">{i.institution_name ?? "Unknown bank"}</Text>
                <Text style={{ color: i.status === "good" ? colors.positive : colors.negative }}>
                  {i.status}
                </Text>
              </HStack>
              <Text variant="muted" style={{ fontSize: 12 }}>Manage accounts ›</Text>
            </Stack>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}
