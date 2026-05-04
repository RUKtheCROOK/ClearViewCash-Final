import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import { getBudgets, getTransactionsForView } from "@cvc/api-client";
import {
  computeRolloverCents,
  computeSpentByCategory,
  effectiveLimit,
  type CategorizedTxn,
} from "@cvc/domain";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useEffectiveSharedView } from "../../lib/view";
import { useSpaces } from "../../hooks/useSpaces";
import { BudgetEditSheet, type EditableBudget } from "../../components/BudgetEditSheet";

export default function Budgets() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const { activeSpace } = useSpaces();
  const { sharedView, restrictToOwnerId } = useEffectiveSharedView(activeSpace);
  const [budgets, setBudgets] = useState<EditableBudget[]>([]);
  const [spent, setSpent] = useState<Record<string, number>>({});
  const [txns60d, setTxns60d] = useState<CategorizedTxn[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<EditableBudget | null>(null);

  const load = useCallback(async () => {
    if (!activeSpaceId) return;
    const b = await getBudgets(supabase, activeSpaceId);
    setBudgets(b as never);
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 1);
    since.setUTCDate(1);
    const sinceIso = since.toISOString().slice(0, 10);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    const monthIso = monthStart.toISOString().slice(0, 10);
    const txns = (await getTransactionsForView(supabase, {
      spaceId: activeSpaceId,
      sharedView,
      restrictToOwnerId,
      since: sinceIso,
      fields: "category, amount, posted_at",
      limit: 2000,
    })) as unknown as CategorizedTxn[];
    setTxns60d(txns);
    const thisMonth = txns.filter((t) => t.posted_at >= monthIso);
    setSpent(computeSpentByCategory(thisMonth));
  }, [activeSpaceId, sharedView, restrictToOwnerId]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setSheetOpen(true);
  }

  function openEdit(b: EditableBudget) {
    setEditing(b);
    setSheetOpen(true);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <HStack justify="space-between" align="center">
        <Text variant="h2">Budgets</Text>
        <Pressable
          onPress={openCreate}
          style={{
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>+ Add</Text>
        </Pressable>
      </HStack>

      {budgets.map((b) => {
        const used = spent[b.category] ?? 0;
        const rollover = computeRolloverCents(b, txns60d);
        const cap = effectiveLimit(b, rollover);
        const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
        const over = used > cap;
        return (
          <Pressable key={b.id} onPress={() => openEdit(b)}>
            <Card>
              <Stack gap="sm">
                <HStack justify="space-between">
                  <Text variant="title">{b.category}</Text>
                  <Text variant="muted">{b.period}</Text>
                </HStack>
                {rollover > 0 ? (
                  <Text variant="muted" style={{ fontSize: 12 }}>
                    + <Money cents={rollover} /> rollover
                  </Text>
                ) : null}
                <HStack justify="space-between">
                  <Money cents={used} />
                  <Text variant="muted">of <Money cents={cap} /></Text>
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
          </Pressable>
        );
      })}

      {budgets.length === 0 ? (
        <Card>
          <Stack gap="sm" align="center">
            <Text variant="muted">No budgets set yet.</Text>
            <Pressable
              onPress={openCreate}
              style={{
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                borderRadius: radius.md,
                backgroundColor: colors.primary,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Create your first budget</Text>
            </Pressable>
          </Stack>
        </Card>
      ) : null}

      <BudgetEditSheet
        visible={sheetOpen}
        spaceId={activeSpaceId}
        budget={editing}
        recentTxns={txns60d}
        existingCategories={budgets.map((b) => b.category)}
        onClose={() => setSheetOpen(false)}
        onSaved={load}
      />
    </ScrollView>
  );
}
