import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { Card, HStack, Stack, Text, colors, space } from "@cvc/ui";
import { supabase } from "../../lib/supabase";

interface Item {
  id: string;
  institution_name: string | null;
  status: string;
}

export default function Connected() {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    supabase.from("plaid_items").select("id, institution_name, status").then(({ data }) => setItems((data ?? []) as Item[]));
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Text variant="h2">Connected services</Text>
      <Text variant="muted">Plaid connections to your financial institutions.</Text>
      {items.map((i) => (
        <Card key={i.id}>
          <HStack justify="space-between" align="center">
            <Text variant="title">{i.institution_name ?? "Unknown bank"}</Text>
            <Text style={{ color: i.status === "good" ? colors.positive : colors.negative }}>{i.status}</Text>
          </HStack>
        </Card>
      ))}
    </ScrollView>
  );
}
