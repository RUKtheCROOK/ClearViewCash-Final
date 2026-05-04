import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { HStack, Stack, Text, colors, radius, space } from "@cvc/ui";
import { deleteBudget, upsertBudget } from "@cvc/api-client";
import { suggestBudgets, type CategorizedTxn } from "@cvc/domain";
import { supabase } from "../lib/supabase";

export type BudgetPeriod = "monthly" | "weekly";

export interface EditableBudget {
  id: string;
  category: string;
  limit_amount: number;
  period: BudgetPeriod;
  rollover: boolean;
}

interface Props {
  visible: boolean;
  spaceId: string | null;
  budget: EditableBudget | null;
  recentTxns?: ReadonlyArray<CategorizedTxn>;
  existingCategories?: ReadonlyArray<string>;
  onClose: () => void;
  onSaved: () => void;
}

export function BudgetEditSheet({
  visible,
  spaceId,
  budget,
  recentTxns,
  existingCategories,
  onClose,
  onSaved,
}: Props) {
  const [category, setCategory] = useState("");
  const [limitDollars, setLimitDollars] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [rollover, setRollover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    if (budget) return [];
    if (!recentTxns || recentTxns.length === 0) return [];
    const existing = new Set(existingCategories ?? []);
    return suggestBudgets(recentTxns, existing);
  }, [budget, recentTxns, existingCategories]);

  useEffect(() => {
    if (!visible) return;
    if (budget) {
      setCategory(budget.category);
      setLimitDollars((budget.limit_amount / 100).toFixed(2));
      setPeriod(budget.period);
      setRollover(budget.rollover);
    } else {
      setCategory("");
      setLimitDollars("");
      setPeriod("monthly");
      setRollover(false);
    }
    setError(null);
  }, [visible, budget]);

  async function save() {
    if (!spaceId) {
      setError("Switch to a space first.");
      return;
    }
    const trimmed = category.trim();
    if (!trimmed) {
      setError("Category is required.");
      return;
    }
    const dollars = parseFloat(limitDollars);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("Enter a positive dollar amount.");
      return;
    }
    const limit_amount = Math.round(dollars * 100);
    setSaving(true);
    setError(null);
    try {
      await upsertBudget(supabase, {
        ...(budget ? { id: budget.id } : {}),
        space_id: spaceId,
        category: trimmed,
        limit_amount,
        period,
        rollover,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save budget.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!budget) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteBudget(supabase, budget.id);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not delete budget.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: space.lg,
            maxHeight: "85%",
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Stack gap="md">
              <Text variant="title">{budget ? "Edit budget" : "New budget"}</Text>

              {suggestions.length > 0 ? (
                <Stack gap="sm">
                  <Text variant="muted" style={{ fontSize: 12 }}>
                    Suggested from your spending
                  </Text>
                  <HStack gap="sm" style={{ flexWrap: "wrap" }}>
                    {suggestions.map((s) => (
                      <Pressable
                        key={s.category}
                        onPress={() => {
                          setCategory(s.category);
                          setLimitDollars((s.suggested_cents / 100).toFixed(2));
                        }}
                        style={{
                          paddingHorizontal: space.md,
                          paddingVertical: space.sm,
                          borderRadius: radius.pill,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.surface,
                        }}
                      >
                        <Text variant="muted" style={{ fontSize: 12 }}>
                          {s.category} · ${(s.suggested_cents / 100).toFixed(0)}/mo
                        </Text>
                      </Pressable>
                    ))}
                  </HStack>
                </Stack>
              ) : null}

              <Stack gap="sm">
                <Text variant="muted" style={{ fontSize: 12 }}>
                  Category
                </Text>
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  placeholder="e.g. groceries"
                  autoCapitalize="none"
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: space.md,
                    backgroundColor: colors.surface,
                  }}
                />
              </Stack>

              <Stack gap="sm">
                <Text variant="muted" style={{ fontSize: 12 }}>
                  Monthly limit (USD)
                </Text>
                <TextInput
                  value={limitDollars}
                  onChangeText={setLimitDollars}
                  placeholder="500.00"
                  keyboardType="decimal-pad"
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: space.md,
                    backgroundColor: colors.surface,
                  }}
                />
              </Stack>

              <Stack gap="sm">
                <Text variant="muted" style={{ fontSize: 12 }}>
                  Period
                </Text>
                <HStack gap="sm">
                  {(["monthly", "weekly"] as BudgetPeriod[]).map((p) => {
                    const active = period === p;
                    return (
                      <Pressable
                        key={p}
                        onPress={() => setPeriod(p)}
                        style={{
                          flex: 1,
                          paddingVertical: space.md,
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primary : colors.surface,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: active ? "#fff" : colors.textMuted, fontWeight: "600" }}>
                          {p === "monthly" ? "Monthly" : "Weekly"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </HStack>
              </Stack>

              <HStack justify="space-between" align="center">
                <Stack gap="xs" style={{ flex: 1, marginRight: space.md }}>
                  <Text>Roll over unused</Text>
                  <Text variant="muted" style={{ fontSize: 12 }}>
                    Carry leftover budget into next month.
                  </Text>
                </Stack>
                <Switch value={rollover} onValueChange={setRollover} />
              </HStack>

              {error ? <Text style={{ color: colors.negative }}>{error}</Text> : null}

              <HStack gap="sm">
                <Pressable
                  onPress={onClose}
                  style={{
                    flex: 1,
                    padding: space.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                  }}
                >
                  <Text>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={save}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: space.md,
                    borderRadius: radius.md,
                    backgroundColor: saving ? colors.textMuted : colors.primary,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    {saving ? "Saving…" : "Save"}
                  </Text>
                </Pressable>
              </HStack>

              {budget ? (
                <Pressable
                  onPress={remove}
                  disabled={deleting}
                  style={{
                    padding: space.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.negative,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.negative, fontWeight: "600" }}>
                    {deleting ? "Deleting…" : "Delete budget"}
                  </Text>
                </Pressable>
              ) : null}
            </Stack>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
