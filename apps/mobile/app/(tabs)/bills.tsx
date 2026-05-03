import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { Card, HStack, Money, Stack, Text, colors, space } from "@cvc/ui";
import { getBills } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";

interface Bill {
  id: string;
  name: string;
  amount: number;
  next_due_at: string;
  cadence: string;
  autopay: boolean;
  source: "detected" | "manual";
}

export default function Bills() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const [bills, setBills] = useState<Bill[]>([]);

  useEffect(() => {
    if (!activeSpaceId) return;
    getBills(supabase, activeSpaceId).then((rows) => setBills(rows as never));
  }, [activeSpaceId]);

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Text variant="h2">Bills</Text>
      <Text variant="muted">Recurring obligations are auto-detected from your transactions. Manual bills are also welcome.</Text>
      {bills.map((b) => (
        <Card key={b.id}>
          <HStack justify="space-between" align="center">
            <Stack gap="xs">
              <Text variant="title">{b.name}</Text>
              <Text variant="muted">
                Due {b.next_due_at} · {b.cadence} {b.autopay ? "· autopay" : ""} {b.source === "detected" ? "· auto-detected" : ""}
              </Text>
            </Stack>
            <Money cents={b.amount} />
          </HStack>
        </Card>
      ))}
      {bills.length === 0 ? <Text variant="muted">No bills yet. They'll appear here as we detect them from your transactions.</Text> : null}
    </ScrollView>
  );
}
