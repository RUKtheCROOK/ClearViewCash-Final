import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { format, parseISO } from "date-fns";
import { Button, Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import { deleteGoal, getGoals, upsertGoal } from "@cvc/api-client";
import { goalProgressFraction, projectGoalDate, projectMonthsToGoal } from "@cvc/domain";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";

interface Goal {
  id: string;
  name: string;
  kind: "save" | "payoff";
  target_amount: number;
  starting_amount: number | null;
  target_date: string | null;
  monthly_contribution: number | null;
  linked_account_id: string | null;
}

interface AccountRow {
  id: string;
  name: string;
  type: "depository" | "credit" | "loan" | "investment" | "other";
  current_balance: number | null;
}

interface Draft {
  id?: string;
  kind: "save" | "payoff";
  name: string;
  target: string;
  starting: string;
  target_date: string;
  monthly_contribution: string;
  linked_account_id: string | null;
}

const EMPTY_DRAFT: Draft = {
  kind: "save",
  name: "",
  target: "",
  starting: "",
  target_date: "",
  monthly_contribution: "",
  linked_account_id: null,
};

function dollarsToCents(input: string): number {
  const parsed = Number.parseFloat(input.replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * 100);
}

function centsToDollars(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export default function Goals() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const balanceById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.current_balance ?? 0])),
    [accounts],
  );

  const reload = useCallback(async () => {
    if (!activeSpaceId) return;
    const [g, accs] = await Promise.all([
      getGoals(supabase, activeSpaceId),
      supabase.from("accounts").select("id, name, type, current_balance"),
    ]);
    setGoals(g as never);
    setAccounts((accs.data ?? []) as AccountRow[]);
  }, [activeSpaceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  function startNew() {
    setError("");
    setDraft({ ...EMPTY_DRAFT });
  }

  function startEdit(g: Goal) {
    setError("");
    setDraft({
      id: g.id,
      kind: g.kind,
      name: g.name,
      target: centsToDollars(g.target_amount),
      starting: centsToDollars(g.starting_amount),
      target_date: g.target_date ?? "",
      monthly_contribution: centsToDollars(g.monthly_contribution),
      linked_account_id: g.linked_account_id,
    });
  }

  async function save() {
    if (!draft || !activeSpaceId) return;
    if (!draft.name.trim()) {
      setError("Give the goal a name.");
      return;
    }
    const target = dollarsToCents(draft.target);
    if (target <= 0 && draft.kind === "save") {
      setError("Target amount must be greater than 0.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const starting = draft.starting.trim() ? dollarsToCents(draft.starting) : null;
      const monthly = draft.monthly_contribution.trim()
        ? dollarsToCents(draft.monthly_contribution)
        : null;
      await upsertGoal(supabase, {
        ...(draft.id ? { id: draft.id } : {}),
        space_id: activeSpaceId,
        kind: draft.kind,
        name: draft.name.trim(),
        target_amount: target,
        starting_amount: starting,
        target_date: draft.target_date.trim() || null,
        monthly_contribution: monthly,
        linked_account_id: draft.linked_account_id,
      });
      setDraft(null);
      await reload();
    } catch (e) {
      setError((e as Error).message ?? "Could not save the goal.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await deleteGoal(supabase, id);
      setDraft(null);
      await reload();
    } catch (e) {
      setError((e as Error).message ?? "Could not delete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <HStack justify="space-between" align="center">
        <Text variant="h2">Goals</Text>
        {!draft ? <Button label="+ New goal" onPress={startNew} variant="secondary" /> : null}
      </HStack>

      {draft ? (
        <Card>
          <Stack gap="md">
            <Text variant="title">{draft.id ? "Edit goal" : "New goal"}</Text>
            <KindToggle
              value={draft.kind}
              onChange={(kind) => setDraft({ ...draft, kind })}
            />
            <Field
              label="Name"
              value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })}
              placeholder={draft.kind === "save" ? "Emergency fund" : "Pay off Citi card"}
            />
            <Field
              label={draft.kind === "save" ? "Target amount" : "Target balance (usually 0)"}
              value={draft.target}
              onChangeText={(target) => setDraft({ ...draft, target })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            {draft.kind === "payoff" ? (
              <Field
                label="Starting debt"
                value={draft.starting}
                onChangeText={(starting) => setDraft({ ...draft, starting })}
                placeholder="The balance the day you set this goal"
                keyboardType="decimal-pad"
              />
            ) : null}
            <Field
              label="Monthly contribution (optional)"
              value={draft.monthly_contribution}
              onChangeText={(monthly_contribution) =>
                setDraft({ ...draft, monthly_contribution })
              }
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            <Field
              label="Target date (optional)"
              value={draft.target_date}
              onChangeText={(target_date) => setDraft({ ...draft, target_date })}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
            <Stack gap="xs">
              <Text variant="label">Linked account (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <HStack gap="sm">
                  <Chip
                    active={draft.linked_account_id === null}
                    label="None"
                    onPress={() => setDraft({ ...draft, linked_account_id: null })}
                  />
                  {accounts.map((a) => (
                    <Chip
                      key={a.id}
                      active={draft.linked_account_id === a.id}
                      label={a.name}
                      onPress={() => setDraft({ ...draft, linked_account_id: a.id })}
                    />
                  ))}
                </HStack>
              </ScrollView>
            </Stack>
            {error ? <Text style={{ color: colors.negative }}>{error}</Text> : null}
            <HStack gap="sm">
              <Button
                label="Save"
                onPress={save}
                loading={busy}
                style={{ flex: 1 }}
              />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => {
                  setDraft(null);
                  setError("");
                }}
                style={{ flex: 1 }}
              />
              {draft.id ? (
                <Button
                  label="Delete"
                  variant="destructive"
                  onPress={() => remove(draft.id!)}
                  style={{ flex: 1 }}
                />
              ) : null}
            </HStack>
          </Stack>
        </Card>
      ) : null}

      {goals.map((g) => {
        const current = g.linked_account_id ? balanceById.get(g.linked_account_id) ?? 0 : 0;
        const fraction = goalProgressFraction({
          kind: g.kind,
          current,
          target: g.target_amount,
          starting: g.starting_amount,
        });
        const projected = projectGoalDate({
          kind: g.kind,
          current,
          target: g.target_amount,
          monthlyContribution: g.monthly_contribution,
        });
        const monthsLeft = projectMonthsToGoal({
          kind: g.kind,
          current,
          target: g.target_amount,
          monthlyContribution: g.monthly_contribution,
        });
        return (
          <Pressable key={g.id} onPress={() => startEdit(g)}>
            <Card>
              <Stack gap="sm">
                <HStack justify="space-between">
                  <Text variant="title">{g.name}</Text>
                  <Text variant="muted">{g.kind === "save" ? "Save" : "Payoff"}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Money cents={current} />
                  <Text variant="muted">
                    {g.kind === "save" ? "of " : "→ "}
                    <Money cents={g.target_amount} />
                  </Text>
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
                      width: `${Math.round(fraction * 100)}%`,
                      height: "100%",
                      backgroundColor: g.kind === "save" ? colors.positive : colors.primary,
                    }}
                  />
                </View>
                {projected ? (
                  <Text variant="muted">
                    {g.kind === "save" ? "Funded" : "Paid off"} by{" "}
                    {format(projected, "MMM yyyy")}
                    {monthsLeft != null ? ` · ${monthsLeft} mo` : ""}
                  </Text>
                ) : g.target_date ? (
                  <Text variant="muted">Target: {format(parseISO(g.target_date), "MMM d, yyyy")}</Text>
                ) : null}
                {g.monthly_contribution ? (
                  <Text variant="muted">
                    <Money cents={g.monthly_contribution} /> per month
                  </Text>
                ) : null}
              </Stack>
            </Card>
          </Pressable>
        );
      })}
      {goals.length === 0 && !draft ? (
        <Text variant="muted">Nothing yet — set your first savings or payoff goal.</Text>
      ) : null}
    </ScrollView>
  );
}

function KindToggle({ value, onChange }: { value: "save" | "payoff"; onChange: (k: "save" | "payoff") => void }) {
  return (
    <HStack gap="sm">
      <Chip active={value === "save"} label="Save toward" onPress={() => onChange("save")} />
      <Chip active={value === "payoff"} label="Pay off debt" onPress={() => onChange("payoff")} />
    </HStack>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600", fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "decimal-pad";
  autoCapitalize?: "none" | "sentences";
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }: FieldProps) {
  return (
    <Stack gap="xs">
      <Text variant="label">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
          color: colors.text,
          backgroundColor: colors.surface,
        }}
      />
    </Stack>
  );
}
