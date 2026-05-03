import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { Card, HStack, Stack, Text, colors, space } from "@cvc/ui";
import { supabase } from "../../lib/supabase";

interface Notif {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export default function Notifications() {
  const [items, setItems] = useState<Notif[]>([]);
  useEffect(() => {
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setItems((data ?? []) as Notif[]));
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Text variant="h2">Notifications</Text>
      {items.map((n) => (
        <Card key={n.id}>
          <Stack gap="xs">
            <HStack justify="space-between">
              <Text variant="title">{n.kind.replace(/_/g, " ")}</Text>
              {!n.read_at ? <Text style={{ color: colors.primary }}>•</Text> : null}
            </HStack>
            <Text variant="muted">{new Date(n.created_at).toLocaleString()}</Text>
            <Text variant="muted">{JSON.stringify(n.payload)}</Text>
          </Stack>
        </Card>
      ))}
      {items.length === 0 ? <Text variant="muted">All caught up.</Text> : null}
    </ScrollView>
  );
}
