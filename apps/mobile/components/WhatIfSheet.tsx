import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { Text, I, fonts, type Palette } from "@cvc/ui";
import type { Bill, Cadence, IncomeEvent } from "@cvc/types";
import type { WhatIfMutation } from "@cvc/domain";

type Kind = "expense" | "income";

const EXPENSE_CATEGORIES = ["Vet", "Travel", "Repair", "Gift", "Subscription", "Custom"] as const;
const INCOME_CATEGORIES = ["Paycheck", "Bonus", "Freelance", "Refund", "Gift", "Custom"] as const;
type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

export interface WhatIfSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (mutation: WhatIfMutation) => void;
  onDiscard: () => void;
  impactText: string | null;
  spaceId: string;
  ownerUserId: string;
  defaultFundingAccountId: string | null;
  /** ISO date selected for the scenario (yyyy-mm-dd). */
  selectedDate: string;
  palette: Palette;
}

export function WhatIfSheet({
  open,
  onClose,
  onSave,
  onDiscard,
  impactText,
  spaceId,
  ownerUserId,
  defaultFundingAccountId,
  selectedDate,
  palette: p,
}: WhatIfSheetProps) {
  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>("Custom");
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>("Custom");

  // Reset form whenever the sheet opens.
  useEffect(() => {
    if (open) {
      setKind("expense");
      setAmount("");
      setLabel("");
      setExpenseCategory("Custom");
      setIncomeCategory("Custom");
    }
  }, [open]);

  const category = kind === "expense" ? expenseCategory : incomeCategory;
  const categories = kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const dateLabel = useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    if (!y || !m || !d) return selectedDate;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }, [selectedDate]);

  const amountCents = useMemo(() => {
    const cleaned = amount.replace(/[^\d.]/g, "");
    if (!cleaned) return 0;
    const num = parseFloat(cleaned);
    if (!Number.isFinite(num) || num <= 0) return 0;
    return Math.round(num * 100);
  }, [amount]);

  const canSave = amountCents > 0;

  const handleSave = () => {
    if (!canSave) return;
    const dueDay = Math.max(1, Math.min(31, parseInt(selectedDate.slice(8, 10), 10) || 1));
    const recordName = label.trim() || category;
    if (kind === "expense") {
      const synthetic: Bill = {
        id: `whatif-${Date.now()}`,
        space_id: spaceId,
        owner_user_id: ownerUserId,
        name: recordName,
        amount: amountCents,
        due_day: dueDay,
        cadence: "once" as Cadence,
        next_due_at: selectedDate,
        autopay: false,
        linked_account_id: defaultFundingAccountId,
        source: "manual",
        recurring_group_id: null,
        category: null,
        payee_hue: null,
        payee_glyph: null,
        notes: null,
      };
      onSave({ addBill: synthetic });
    } else {
      const synthetic: IncomeEvent = {
        id: `whatif-${Date.now()}`,
        space_id: spaceId,
        owner_user_id: ownerUserId,
        name: recordName,
        amount: amountCents,
        due_day: dueDay,
        cadence: "once" as Cadence,
        next_due_at: selectedDate,
        autopay: false,
        linked_account_id: defaultFundingAccountId,
        source: "manual",
        recurring_group_id: null,
        category: null,
        actual_amount: null,
        received_at: null,
        source_type: "one_time",
        amount_low: null,
        amount_high: null,
        paused_at: null,
      };
      onSave({ addIncome: synthetic });
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(20,24,28,0.34)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: p.surface,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            shadowColor: "#000",
            shadowOpacity: 0.16,
            shadowOffset: { width: 0, height: -10 },
            shadowRadius: 30,
            elevation: 10,
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 22,
            borderTopWidth: 1,
            borderTopColor: p.line,
            maxWidth: 600,
            alignSelf: "center",
            width: "100%",
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 14,
              marginBottom: 4,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: fonts.num,
                  fontSize: 10,
                  color: p.brand,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                What-if
              </Text>
              <Text
                style={{
                  fontFamily: fonts.uiMedium,
                  fontSize: 15,
                  fontWeight: "500",
                  color: p.ink1,
                  marginTop: 2,
                }}
              >
                {kind === "expense" ? "Add expense" : "Add income"} on {dateLabel}
              </Text>
              <Text style={{ fontSize: 11, color: p.ink3, marginTop: 2 }}>
                Tap a different day on the chart to change the date.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                backgroundColor: p.tinted,
                width: 32,
                height: 32,
                borderRadius: 999,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              {I.close({ color: p.ink2, size: 16 })}
            </Pressable>
          </View>

          {/* Kind toggle */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: p.tinted,
              padding: 3,
              borderRadius: 9,
              gap: 2,
              marginTop: 12,
            }}
          >
            {(["expense", "income"] as const).map((k) => {
              const active = k === kind;
              return (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  style={{
                    flex: 1,
                    height: 30,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: active ? p.surface : "transparent",
                    borderRadius: 7,
                    ...(active
                      ? {
                          shadowColor: "#000",
                          shadowOpacity: 0.06,
                          shadowOffset: { width: 0, height: 1 },
                          shadowRadius: 2,
                          elevation: 1,
                        }
                      : {}),
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: "500",
                      color: active ? p.ink1 : p.ink3,
                    }}
                  >
                    {k === "expense" ? "Add expense" : "Add income"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Amount input */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: p.sunken,
              marginTop: 14,
            }}
          >
            <Text style={{ fontFamily: fonts.num, fontSize: 18, color: p.ink3 }}>$</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={p.ink4}
              style={{
                flex: 1,
                fontFamily: fonts.num,
                fontSize: 22,
                fontWeight: "500",
                color: p.ink1,
                paddingVertical: 0,
              }}
            />
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder={category.toLowerCase()}
              placeholderTextColor={p.ink4}
              style={{
                fontSize: 12,
                color: p.ink2,
                width: 110,
                textAlign: "right",
                paddingVertical: 0,
              }}
            />
          </View>

          {/* Category pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 6, marginTop: 12, paddingRight: 4 }}
          >
            {categories.map((k) => {
              const active = k === category;
              return (
                <Pressable
                  key={k}
                  onPress={() => {
                    if (kind === "expense") setExpenseCategory(k as ExpenseCategory);
                    else setIncomeCategory(k as IncomeCategory);
                  }}
                  style={({ pressed }) => ({
                    height: 30,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor: active ? p.ink1 : p.surface,
                    borderWidth: 1,
                    borderColor: active ? p.ink1 : p.line,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: "500",
                      color: active ? p.canvas : p.ink2,
                    }}
                  >
                    {k}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Impact callout */}
          {impactText && (
            <View
              style={{
                marginTop: 14,
                padding: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: p.brandTint,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  backgroundColor: p.brand,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {kind === "income"
                  ? I.arrowUp({ color: p.brandOn, size: 12 })
                  : I.arrowDown({ color: p.brandOn, size: 12 })}
              </View>
              <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: p.brand }}>
                {impactText}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              style={({ pressed }) => ({
                flex: 1,
                height: 44,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: p.brand,
                alignItems: "center",
                justifyContent: "center",
                opacity: !canSave ? 0.45 : pressed ? 0.9 : 1,
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: "500", color: p.brandOn }}>
                Save scenario
              </Text>
            </Pressable>
            <Pressable
              onPress={onDiscard}
              style={({ pressed }) => ({
                height: 44,
                paddingHorizontal: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: p.lineFirm,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: "500", color: p.ink1 }}>Discard</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
