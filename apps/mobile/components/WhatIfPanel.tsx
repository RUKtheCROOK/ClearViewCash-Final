import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import type { Bill, IncomeEvent, Cadence } from "@cvc/types";
import type { WhatIfMutation } from "@cvc/domain";

const CADENCES: Array<{ key: Cadence; label: string }> = [
  { key: "custom", label: "Once" },
  { key: "weekly", label: "Weekly" },
  { key: "biweekly", label: "Biweekly" },
  { key: "monthly", label: "Monthly" },
];

export interface WhatIfPanelProps {
  spaceId: string;
  ownerUserId: string;
  defaultFundingAccountId: string | null;
  mutations: WhatIfMutation[];
  onChange: (mutations: WhatIfMutation[]) => void;
  baselineLow: number;
  scenarioLow: number;
}

export function WhatIfPanel({
  spaceId,
  ownerUserId,
  defaultFundingAccountId,
  mutations,
  onChange,
  baselineLow,
  scenarioLow,
}: WhatIfPanelProps) {
  const [open, setOpen] = useState<"none" | "bill" | "income">("none");
  const delta = scenarioLow - baselineLow;

  const addBill = (b: Bill) => {
    onChange([...mutations, { addBill: b }]);
    setOpen("none");
  };
  const addIncome = (i: IncomeEvent) => {
    onChange([...mutations, { addIncome: i }]);
    setOpen("none");
  };
  const remove = (idx: number) => {
    onChange(mutations.filter((_, i) => i !== idx));
  };
  const clearAll = () => onChange([]);

  return (
    <Card padded={false}>
      <Stack gap="sm" style={{ padding: space.lg }}>
        <HStack justify="space-between" align="center">
          <Text variant="title">What-if scenarios</Text>
          {mutations.length > 0 ? (
            <Pressable onPress={clearAll}>
              <Text style={{ color: colors.primary, fontSize: 13 }}>Clear all</Text>
            </Pressable>
          ) : null}
        </HStack>
        <Text variant="muted">Test how a future bill or income shifts your low point.</Text>
      </Stack>

      {mutations.length > 0 ? (
        <View style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
          <HStack gap="md" align="center" style={{ paddingVertical: space.xs }}>
            <Text variant="muted" style={{ fontSize: 12 }}>Low-point change:</Text>
            <Money
              cents={delta}
              showSign
              positiveColor
              style={{ fontWeight: "600", fontSize: 14 }}
            />
          </HStack>
          {mutations.map((m, idx) => (
            <HStack
              key={idx}
              justify="space-between"
              align="center"
              style={{
                paddingVertical: space.sm,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", fontSize: 13 }}>
                  {m.addBill ? `Bill · ${m.addBill.name}` : m.addIncome ? `Income · ${m.addIncome.name}` : "Mutation"}
                </Text>
                {m.addBill ? (
                  <Text variant="muted" style={{ fontSize: 12 }}>
                    {formatCadence(m.addBill.cadence)} · starts {m.addBill.next_due_at}
                  </Text>
                ) : m.addIncome ? (
                  <Text variant="muted" style={{ fontSize: 12 }}>
                    {formatCadence(m.addIncome.cadence)} · starts {m.addIncome.next_due_at}
                  </Text>
                ) : null}
              </View>
              {m.addBill ? <Money cents={-m.addBill.amount} positiveColor /> : null}
              {m.addIncome ? <Money cents={m.addIncome.amount} positiveColor /> : null}
              <Pressable onPress={() => remove(idx)} style={{ marginLeft: space.md }}>
                <Text style={{ color: colors.negative, fontSize: 18 }}>×</Text>
              </Pressable>
            </HStack>
          ))}
        </View>
      ) : null}

      <HStack gap="sm" style={{ paddingHorizontal: space.lg, paddingBottom: space.md }}>
        <Pressable
          onPress={() => setOpen(open === "bill" ? "none" : "bill")}
          style={{
            flex: 1,
            paddingVertical: space.sm,
            paddingHorizontal: space.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: open === "bill" ? colors.primary : colors.border,
            backgroundColor: open === "bill" ? colors.primary : "transparent",
            alignItems: "center",
          }}
        >
          <Text style={{ color: open === "bill" ? colors.surface : colors.text, fontWeight: "600", fontSize: 13 }}>
            + Add bill
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setOpen(open === "income" ? "none" : "income")}
          style={{
            flex: 1,
            paddingVertical: space.sm,
            paddingHorizontal: space.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: open === "income" ? colors.positive : colors.border,
            backgroundColor: open === "income" ? colors.positive : "transparent",
            alignItems: "center",
          }}
        >
          <Text style={{ color: open === "income" ? colors.surface : colors.text, fontWeight: "600", fontSize: 13 }}>
            + Add income
          </Text>
        </Pressable>
      </HStack>

      {open === "bill" ? (
        <ScenarioForm
          mode="bill"
          spaceId={spaceId}
          ownerUserId={ownerUserId}
          defaultFundingAccountId={defaultFundingAccountId}
          onSubmit={(v) => addBill(v as Bill)}
          onCancel={() => setOpen("none")}
        />
      ) : null}
      {open === "income" ? (
        <ScenarioForm
          mode="income"
          spaceId={spaceId}
          ownerUserId={ownerUserId}
          defaultFundingAccountId={defaultFundingAccountId}
          onSubmit={(v) => addIncome(v as IncomeEvent)}
          onCancel={() => setOpen("none")}
        />
      ) : null}
    </Card>
  );
}

function ScenarioForm({
  mode,
  spaceId,
  ownerUserId,
  defaultFundingAccountId,
  onSubmit,
  onCancel,
}: {
  mode: "bill" | "income";
  spaceId: string;
  ownerUserId: string;
  defaultFundingAccountId: string | null;
  onSubmit: (v: Bill | IncomeEvent) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(mode === "bill" ? "Hypothetical bill" : "Hypothetical income");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayPlus(7));
  const [cadence, setCadence] = useState<Cadence>("custom");

  const submit = () => {
    const cents = Math.round(parseFloat(amount.replace(/[^\d.]/g, "")) * 100);
    if (!cents || cents <= 0) return;
    if (!isIsoDate(date)) return;
    const id = `whatif-${Date.now()}`;
    const due = parseInt(date.slice(8, 10), 10);
    const dueDay = isNaN(due) ? 1 : Math.min(Math.max(due, 1), 31);
    const synthetic: Bill = {
      id,
      space_id: spaceId,
      owner_user_id: ownerUserId,
      name: name.trim() || (mode === "bill" ? "Bill" : "Income"),
      amount: cents,
      due_day: dueDay,
      cadence,
      next_due_at: date,
      autopay: false,
      linked_account_id: defaultFundingAccountId,
      source: "manual",
      recurring_group_id: null,
    };
    onSubmit(synthetic);
  };

  return (
    <View
      style={{
        paddingHorizontal: space.lg,
        paddingBottom: space.lg,
        gap: space.sm,
      }}
    >
      <Field label="Name">
        <TextInput
          value={name}
          onChangeText={setName}
          style={inputStyle}
          placeholder={mode === "bill" ? "Vacation" : "Bonus"}
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      <Field label="Amount (USD)">
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={inputStyle}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      <Field label="Starts (YYYY-MM-DD)">
        <TextInput
          value={date}
          onChangeText={setDate}
          style={inputStyle}
          autoCapitalize="none"
          placeholderTextColor={colors.textMuted}
        />
      </Field>
      <Field label="Cadence">
        <HStack gap="xs" wrap>
          {CADENCES.map((c) => {
            const active = c.key === cadence;
            return (
              <Pressable
                key={c.key}
                onPress={() => setCadence(c.key)}
                style={{
                  paddingHorizontal: space.md,
                  paddingVertical: space.xs,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : "transparent",
                }}
              >
                <Text style={{ fontSize: 12, color: active ? colors.surface : colors.text }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </HStack>
      </Field>

      <HStack gap="sm" style={{ marginTop: space.sm }}>
        <Pressable
          onPress={onCancel}
          style={{
            flex: 1,
            paddingVertical: space.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: "center",
          }}
        >
          <Text>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          style={{
            flex: 1,
            paddingVertical: space.sm,
            borderRadius: radius.md,
            backgroundColor: mode === "bill" ? colors.primary : colors.positive,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.surface, fontWeight: "600" }}>Add</Text>
        </Pressable>
      </HStack>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text variant="muted" style={{ fontSize: 11, marginBottom: 4 }}>{label}</Text>
      {children}
    </View>
  );
}

const inputStyle = {
  backgroundColor: colors.bg,
  borderColor: colors.border,
  borderWidth: 1,
  borderRadius: radius.sm,
  paddingHorizontal: space.md,
  paddingVertical: space.sm,
  color: colors.text,
  fontSize: 14,
};

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function formatCadence(c: Cadence): string {
  if (c === "custom") return "Once";
  return c.charAt(0).toUpperCase() + c.slice(1);
}
