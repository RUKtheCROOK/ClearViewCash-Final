import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import { getBudgets, getTransactionsForView } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";

interface BudgetRow {
  id: string;
  category: string;
  limit_amount: number;
  period: "monthly" | "weekly";
}

export default function Budgets() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const sharedView = useApp((s) => s.sharedView);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [spent, setSpent] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!activeSpaceId) return;
    (async () => {
      const b = await getBudgets(supabase, activeSpaceId);
      setBudgets(b as never);
      const monthStart = new Date();
      monthStart.setDate(1);
      const since = monthStart.toISOString().slice(0, 10);
      const txns = await getTransactionsForView(supabase, {
        spaceId: activeSpaceId,
        sharedView,
        since,
        fields: "category, amount",
        limit: 1000,
      });
      const totals: Record<string, number> = {};
      for (const t of txns as unknown as Array<{ category: string | null; amount: number }>) {
        if (t.amount >= 0) continue;
        const cat = t.category ?? "Uncategorized";
        totals[cat] = (totals[cat] ?? 0) + Math.abs(t.amount);
      }
      setSpent(totals);
    })();
  }, [activeSpaceId, sharedView]);

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Text variant="h2">Budgets</Text>
      {budgets.map((b) => {
        const used = spent[b.category] ?? 0;
        const pct = b.limit_amount > 0 ? Math.min(100, (used / b.limit_amount) * 100) : 0;
        const over = used > b.limit_amount;
        return (
          <Card key={b.id}>
            <Stack gap="sm">
              <HStack justify="space-between">
                <Text variant="title">{b.category}</Text>
                <Text variant="muted">{b.period}</Text>
              </HStack>
              <HStack justify="space-between">
                <Money cents={used} />
                <Text variant="muted">of <Money cents={b.limit_amount} /></Text>
              </HStack>
              <View
                style={{
                  height: 8,
                  backgroundColor: colors.border,
                  borderRadius: radius.pill,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    backgroundColor: over ? colors.negative : colors.primary,
                  }}
                />
              </View>
            </Stack>
          </Card>
        );
      })}
      {budgets.length === 0 ? <Text variant="muted">No budgets set yet.</Text> : null}
    </ScrollView>
  );
}
