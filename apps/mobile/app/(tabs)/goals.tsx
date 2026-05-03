import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { differenceInMonths, parseISO } from "date-fns";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import { getGoals } from "@cvc/api-client";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";

interface Goal {
  id: string;
  name: string;
  kind: "save" | "payoff";
  target_amount: number;
  target_date: string | null;
  monthly_contribution: number | null;
  linked_account_id: string | null;
}

export default function Goals() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!activeSpaceId) return;
    (async () => {
      const g = await getGoals(supabase, activeSpaceId);
      setGoals(g as never);
      const { data: accs } = await supabase.from("accounts").select("id, current_balance");
      const map: Record<string, number> = {};
      for (const a of accs ?? []) map[a.id] = a.current_balance ?? 0;
      setAccountBalances(map);
    })();
  }, [activeSpaceId]);

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Text variant="h2">Goals</Text>
      {goals.map((g) => {
        const current = g.linked_account_id ? accountBalances[g.linked_account_id] ?? 0 : 0;
        const pct = g.target_amount > 0 ? Math.min(100, (current / g.target_amount) * 100) : 0;
        const monthsLeft = g.target_date ? differenceInMonths(parseISO(g.target_date), new Date()) : null;
        return (
          <Card key={g.id}>
            <Stack gap="sm">
              <HStack justify="space-between">
                <Text variant="title">{g.name}</Text>
                <Text variant="muted">{g.kind}</Text>
              </HStack>
              <HStack justify="space-between">
                <Money cents={current} />
                <Text variant="muted">of <Money cents={g.target_amount} /></Text>
              </HStack>
              <View
                style={{
                  height: 8,
                  backgroundColor: colors.border,
                  borderRadius: radius.pill,
                  overflow: "hidden",
                }}
              >
                <View style={{ width: `${pct}%`, height: "100%", backgroundColor: colors.positive }} />
              </View>
              {monthsLeft !== null ? <Text variant="muted">{monthsLeft} months remaining</Text> : null}
              {g.monthly_contribution ? (
                <Text variant="muted">
                  Adding <Money cents={g.monthly_contribution} /> per month
                </Text>
              ) : null}
            </Stack>
          </Card>
        );
      })}
      {goals.length === 0 ? <Text variant="muted">Nothing yet — set your first savings or payoff goal.</Text> : null}
    </ScrollView>
  );
}
