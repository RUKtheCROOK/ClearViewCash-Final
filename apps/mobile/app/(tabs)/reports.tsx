import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Button, Card, HStack, Money, Stack, Text, colors, space } from "@cvc/ui";
import { getTransactionsForView } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useTier } from "../../hooks/useTier";

export default function Reports() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const sharedView = useApp((s) => s.sharedView);
  const { canReports, tier } = useTier();
  const [byCategory, setByCategory] = useState<Array<{ category: string; total: number }>>([]);

  useEffect(() => {
    if (!canReports) return;
    const start = new Date();
    start.setDate(1);
    getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView,
      since: start.toISOString().slice(0, 10),
      fields: "category, amount",
      limit: 5000,
    }).then((data) => {
      const totals: Record<string, number> = {};
      for (const t of data as unknown as Array<{ category: string | null; amount: number }>) {
        if (t.amount >= 0) continue;
        const c = t.category ?? "Uncategorized";
        totals[c] = (totals[c] ?? 0) + Math.abs(t.amount);
      }
      setByCategory(
        Object.entries(totals)
          .map(([category, total]) => ({ category, total }))
          .sort((a, b) => b.total - a.total),
      );
    });
  }, [canReports, activeSpaceId, sharedView]);

  if (!canReports) {
    return (
      <View style={{ flex: 1, padding: space.lg, justifyContent: "center", backgroundColor: colors.bg }}>
        <Card>
          <Stack gap="md">
            <Text variant="h2">Reports require Pro</Text>
            <Text variant="muted">You're on {tier}. Upgrade for date-range reports, PDF and CSV export.</Text>
          </Stack>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Text variant="h2">Reports</Text>
      <Card>
        <Stack gap="sm">
          <Text variant="title">This month — spending by category</Text>
          {byCategory.map((row) => (
            <HStack key={row.category} justify="space-between">
              <Text>{row.category}</Text>
              <Money cents={row.total} />
            </HStack>
          ))}
        </Stack>
      </Card>
      <HStack gap="md">
        <Button label="Export PDF" variant="secondary" style={{ flex: 1 }} onPress={() => alert("PDF export — coming in M4")} />
        <Button label="Export CSV" variant="secondary" style={{ flex: 1 }} onPress={() => alert("CSV export — coming in M4")} />
      </HStack>
    </ScrollView>
  );
}
