import { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { differenceInDays, parseISO } from "date-fns";
import { Card, HStack, Money, Stack, Text, colors, space } from "@cvc/ui";
import { getIncomeEvents } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";

interface Income {
  id: string;
  name: string;
  amount: number;
  next_due_at: string;
  cadence: string;
  source: "detected" | "manual";
}

export default function IncomeTab() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const [items, setItems] = useState<Income[]>([]);

  useEffect(() => {
    if (!activeSpaceId) return;
    getIncomeEvents(supabase, activeSpaceId).then((rows) => setItems(rows as never));
  }, [activeSpaceId]);

  const next = items[0];
  const daysUntilNext = next ? differenceInDays(parseISO(next.next_due_at), new Date()) : null;

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="sm">
          <Text variant="label">Next payday</Text>
          {next ? (
            <>
              <Text variant="h2">{next.name}</Text>
              <Text variant="muted">in {daysUntilNext ?? 0} days</Text>
              <Money cents={next.amount} positiveColor />
            </>
          ) : (
            <Text variant="muted">No income detected yet.</Text>
          )}
        </Stack>
      </Card>
      {items.map((i) => (
        <Card key={i.id}>
          <HStack justify="space-between" align="center">
            <Stack gap="xs">
              <Text variant="title">{i.name}</Text>
              <Text variant="muted">
                {i.cadence} · next {i.next_due_at} {i.source === "detected" ? "· auto-detected" : ""}
              </Text>
            </Stack>
            <Money cents={i.amount} positiveColor />
          </HStack>
        </Card>
      ))}
    </ScrollView>
  );
}
