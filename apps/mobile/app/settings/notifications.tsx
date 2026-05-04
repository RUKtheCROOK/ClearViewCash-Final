import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView } from "react-native";
import { Button, Card, HStack, Stack, Text, colors, space } from "@cvc/ui";
import {
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationRow,
} from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";

function summarize(n: NotificationRow): string {
  const p = n.payload ?? {};
  switch (n.kind) {
    case "low_balance":
      return `Low balance on ${(p.account_name as string) ?? "an account"}`;
    case "payment_failed":
      return `Card payment failed${p.amount_due ? ` ($${((p.amount_due as number) / 100).toFixed(2)})` : ""}`;
    case "invitation_received":
      return `Invitation to ${(p.space_name as string) ?? "a space"}`;
    default:
      return n.kind.replace(/_/g, " ");
  }
}

export default function Notifications() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const bump = useApp((s) => s.bumpNotifications);

  const load = useCallback(async () => {
    const rows = await getMyNotifications(supabase);
    setItems(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleMarkOne(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    try {
      await markNotificationRead(supabase, id);
      bump();
    } catch {
      load();
    }
  }

  async function handleMarkAll() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    try {
      await markAllNotificationsRead(supabase);
      bump();
    } catch {
      load();
    }
  }

  const hasUnread = items.some((n) => !n.read_at);

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <HStack justify="space-between" align="center">
        <Text variant="h2">Notifications</Text>
        {hasUnread ? <Button label="Mark all read" variant="ghost" onPress={handleMarkAll} /> : null}
      </HStack>
      {items.map((n) => (
        <Pressable key={n.id} onPress={() => (n.read_at ? null : handleMarkOne(n.id))}>
          <Card>
            <Stack gap="xs">
              <HStack justify="space-between">
                <Text variant="title">{summarize(n)}</Text>
                {!n.read_at ? <Text style={{ color: colors.primary }}>•</Text> : null}
              </HStack>
              <Text variant="muted">{new Date(n.created_at).toLocaleString()}</Text>
            </Stack>
          </Card>
        </Pressable>
      ))}
      {!loading && items.length === 0 ? <Text variant="muted">All caught up.</Text> : null}
    </ScrollView>
  );
}
