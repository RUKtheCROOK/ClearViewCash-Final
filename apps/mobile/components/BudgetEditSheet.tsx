import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fonts } from "@cvc/ui";
import { deleteBudget, upsertBudget } from "@cvc/api-client";
import { suggestBudgets, type CategorizedTxn } from "@cvc/domain";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme";
import { BudgetCategoryIcon } from "./budgets/BudgetCategoryIcon";
import { resolveCategoryBranding } from "./budgets/budgetGlyphs";
import { Num, fmtMoneyShort } from "./budgets/Num";

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
  seedCategory?: string | null;
  recentTxns?: ReadonlyArray<CategorizedTxn>;
  existingCategories?: ReadonlyArray<string>;
  onClose: () => void;
  onSaved: () => void;
}

export function BudgetEditSheet({
  visible,
  spaceId,
  budget,
  seedCategory,
  recentTxns,
  existingCategories,
  onClose,
  onSaved,
}: Props) {
  const { palette, mode } = useTheme();
  const [category, setCategory] = useState("");
  const [limitDollars, setLimitDollars] = useState("");
  const [period, setPeriod] = useState<BudgetPeriod>("monthly");
  const [rollover, setRollover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const branding = useMemo(() => resolveCategoryBranding(category || "Food & dining"), [category]);

  const suggestions = useMemo(() => {
    if (budget) return [];
    if (!recentTxns || recentTxns.length === 0) return [];
    const existing = new Set(existingCategories ?? []);
    return suggestBudgets(recentTxns, existing).slice(0, 4);
  }, [budget, recentTxns, existingCategories]);

  const avgFromSuggest = useMemo(() => {
    if (!recentTxns) return null;
    const trimmed = category.trim();
    if (!trimmed) return null;
    let total = 0;
    let count = 0;
    for (const t of recentTxns) {
      if (t.amount >= 0) continue;
      if ((t.category ?? "") !== trimmed) continue;
      total += Math.abs(t.amount);
      count += 1;
    }
    if (count === 0) return null;
    return Math.round(total / 3);
  }, [recentTxns, category]);

  useEffect(() => {
    if (!visible) return;
    if (budget) {
      setCategory(budget.category);
      setLimitDollars((budget.limit_amount / 100).toFixed(0));
      setPeriod(budget.period);
      setRollover(budget.rollover);
    } else {
      setCategory(seedCategory ?? "");
      setLimitDollars("");
      setPeriod("monthly");
      setRollover(false);
    }
    setError(null);
  }, [visible, budget, seedCategory]);

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
            backgroundColor: palette.canvas,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "92%",
          }}
        >
          {/* Top nav */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Pressable
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: palette.tinted,
                alignItems: "center",
                justifyContent: "center",
              }}
              hitSlop={6}
            >
              <CloseIcon color={palette.ink2} />
            </Pressable>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                {budget ? "Edit budget" : "New budget"}
              </Text>
            </View>
            <Pressable
              onPress={save}
              disabled={saving}
              style={({ pressed }) => ({
                paddingHorizontal: 13,
                paddingVertical: 7,
                borderRadius: 999,
                backgroundColor: palette.brand,
                opacity: saving ? 0.6 : pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: palette.brandOn }}>
                {saving ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
            {/* Hero icon + name */}
            <View style={{ paddingHorizontal: 24, paddingTop: 18, alignItems: "center" }}>
              <BudgetCategoryIcon hue={branding.hue} glyph={branding.glyph} mode={mode} size={64} radius={16} />
              <View
                style={{
                  marginTop: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 12,
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.line,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  maxWidth: 320,
                }}
              >
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  placeholder="e.g. Groceries"
                  placeholderTextColor={palette.ink4}
                  autoCapitalize="words"
                  style={{
                    flex: 1,
                    fontFamily: fonts.uiMedium,
                    fontSize: 16,
                    fontWeight: "500",
                    color: palette.ink1,
                    textAlign: "center",
                    paddingVertical: 0,
                  }}
                />
              </View>
            </View>

            {/* Suggestions */}
            {!budget && suggestions.length > 0 ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <Text
                  style={{
                    fontFamily: fonts.uiMedium,
                    fontSize: 11,
                    fontWeight: "600",
                    color: palette.ink3,
                    textTransform: "uppercase",
                    letterSpacing: 0.7,
                    marginBottom: 6,
                  }}
                >
                  Suggested
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {suggestions.map((s) => (
                    <Pressable
                      key={s.category}
                      onPress={() => {
                        setCategory(s.category);
                        setLimitDollars((s.suggested_cents / 100).toFixed(0));
                      }}
                      style={({ pressed }) => ({
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: palette.surface,
                        borderWidth: 1,
                        borderColor: palette.line,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink2 }}>
                        {s.category} · <Num style={{ color: palette.ink2, fontWeight: "500" }}>{fmtMoneyShort(s.suggested_cents)}</Num>
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Limit input — large, central */}
            <View style={{ paddingHorizontal: 24, paddingTop: 24, alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.num, fontSize: 10.5, color: palette.ink3, letterSpacing: 0.8, fontWeight: "600" }}>
                {period === "monthly" ? "MONTHLY LIMIT" : "WEEKLY LIMIT"}
              </Text>
              <View
                style={{
                  marginTop: 8,
                  flexDirection: "row",
                  alignItems: "baseline",
                  gap: 4,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: palette.surface,
                  borderWidth: 1.5,
                  borderColor: palette.brand,
                }}
              >
                <Text style={{ fontFamily: fonts.num, fontSize: 22, fontWeight: "600", color: palette.ink3 }}>$</Text>
                <TextInput
                  value={limitDollars}
                  onChangeText={(t) => setLimitDollars(t.replace(/[^0-9.]/g, ""))}
                  placeholder="500"
                  placeholderTextColor={palette.ink4}
                  keyboardType="decimal-pad"
                  style={{
                    minWidth: 120,
                    fontFamily: fonts.num,
                    fontSize: 36,
                    fontWeight: "600",
                    color: palette.ink1,
                    letterSpacing: -0.6,
                    textAlign: "center",
                    paddingVertical: 0,
                  }}
                />
              </View>
              {avgFromSuggest != null ? (
                <Text style={{ marginTop: 8, fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>
                  Avg over last 3 months ·{" "}
                  <Num style={{ color: palette.ink2, fontWeight: "500" }}>{fmtMoneyShort(avgFromSuggest)}</Num>
                </Text>
              ) : null}
            </View>

            {/* Settings */}
            <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
              <Text
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 11.5,
                  fontWeight: "600",
                  color: palette.ink2,
                  textTransform: "uppercase",
                  letterSpacing: 0.7,
                  marginBottom: 8,
                  paddingLeft: 4,
                }}
              >
                Settings
              </Text>
              <View
                style={{
                  backgroundColor: palette.surface,
                  borderWidth: 1,
                  borderColor: palette.line,
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <View style={{ paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
                      Rollover unspent
                    </Text>
                    <Text style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
                      Carry leftover into next month
                    </Text>
                  </View>
                  <Switch
                    value={rollover}
                    onValueChange={setRollover}
                    trackColor={{ false: palette.lineFirm, true: palette.brand }}
                    thumbColor={palette.surface}
                  />
                </View>
                <View style={{ height: 1, backgroundColor: palette.line }} />
                <View style={{ paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
                      Period
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", borderRadius: 999, backgroundColor: palette.tinted, padding: 2 }}>
                    {(["monthly", "weekly"] as BudgetPeriod[]).map((p) => {
                      const active = period === p;
                      return (
                        <Pressable
                          key={p}
                          onPress={() => setPeriod(p)}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 999,
                            backgroundColor: active ? palette.surface : "transparent",
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: fonts.uiMedium,
                              fontSize: 12,
                              fontWeight: "500",
                              color: active ? palette.ink1 : palette.ink3,
                            }}
                          >
                            {p === "monthly" ? "Monthly" : "Weekly"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>

            {/* Rollover explainer */}
            {rollover ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: palette.brandTint,
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 8,
                      backgroundColor: palette.surface,
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <RolloverIcon color={palette.brand} />
                  </View>
                  <Text style={{ flex: 1, fontFamily: fonts.ui, fontSize: 12, color: palette.ink2, lineHeight: 18 }}>
                    <Text style={{ color: palette.ink1, fontWeight: "500" }}>How rollover works.</Text> Spend less than your
                    limit? The leftover is added to next month. Go over? Nothing carries — your next month stays at the same
                    limit.
                  </Text>
                </View>
              </View>
            ) : null}

            {error ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <Text style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.warn }}>{error}</Text>
              </View>
            ) : null}

            {/* Destructive */}
            {budget ? (
              <View style={{ paddingHorizontal: 16, paddingTop: 18 }}>
                <Pressable
                  onPress={remove}
                  disabled={deleting}
                  style={({ pressed }) => ({
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: "transparent",
                    borderWidth: 1,
                    borderColor: palette.lineFirm,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 8,
                    opacity: deleting ? 0.6 : pressed ? 0.85 : 1,
                  })}
                >
                  <TrashIcon color={palette.warn} />
                  <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.warn }}>
                    {deleting ? "Removing…" : "Remove this category"}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function RolloverIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d="M3 12c0-5 4-9 9-9s9 4 9 9" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 12v6h-6" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 12a9 9 0 01-9 9" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TrashIcon({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24">
      <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
