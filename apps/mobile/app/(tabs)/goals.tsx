import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { format, parseISO } from "date-fns";
import { Button, Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  deleteGoal,
  getGoalsForView,
  getSharesForGoal,
  removeGoalShare,
  setGoalShare,
  upsertGoal,
} from "@cvc/api-client";
import {
  goalProgressFraction,
  projectGoalDate,
  projectMonthsToGoal,
  requiredMonthlyPayment,
} from "@cvc/domain";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../lib/store";
import { useSpaces } from "../../hooks/useSpaces";

interface Goal {
  id: string;
  space_id: string;
  name: string;
  kind: "save" | "payoff";
  target_amount: number;
  starting_amount: number | null;
  target_date: string | null;
  monthly_contribution: number | null;
  linked_account_id: string | null;
  apr_bps: number | null;
  term_months: number | null;
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
  apr: string;
  term_months: string;
}

const EMPTY_DRAFT: Draft = {
  kind: "save",
  name: "",
  target: "",
  starting: "",
  target_date: "",
  monthly_contribution: "",
  linked_account_id: null,
  apr: "",
  term_months: "",
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

function aprBpsToPercentString(bps: number | null | undefined): string {
  if (bps == null) return "";
  return (bps / 100).toFixed(2);
}

export default function Goals() {
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const pendingGoalDraft = useApp((s) => s.pendingGoalDraft);
  const setPendingGoalDraft = useApp((s) => s.setPendingGoalDraft);
  const { spaces } = useSpaces();
  const [includeShared, setIncludeShared] = useState(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [sharesByGoal, setSharesByGoal] = useState<Record<string, Set<string>>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const [draftReadOnly, setDraftReadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const balanceById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.current_balance ?? 0])),
    [accounts],
  );

  const debtAccounts = useMemo(
    () => accounts.filter((a) => a.type === "credit" || a.type === "loan"),
    [accounts],
  );

  const shareableSpaces = useMemo(
    () => spaces.filter((s) => s.id !== activeSpaceId),
    [spaces, activeSpaceId],
  );

  const reload = useCallback(async () => {
    if (!activeSpaceId) return;
    const [g, accs] = await Promise.all([
      getGoalsForView(supabase, { spaceId: activeSpaceId, includeShared }),
      supabase.from("accounts").select("id, name, type, current_balance"),
    ]);
    const goalRows = g as unknown as Goal[];
    setGoals(goalRows);
    setAccounts((accs.data ?? []) as AccountRow[]);
    // Fetch share sets only for goals owned by the active space (so user can
    // toggle which other spaces they're shared into).
    const ownGoalIds = goalRows.filter((row) => row.space_id === activeSpaceId).map((r) => r.id);
    if (ownGoalIds.length === 0) {
      setSharesByGoal({});
      return;
    }
    const shareLists = await Promise.all(ownGoalIds.map((id) => getSharesForGoal(supabase, id)));
    const map: Record<string, Set<string>> = {};
    ownGoalIds.forEach((id, i) => {
      map[id] = new Set(shareLists[i]);
    });
    setSharesByGoal(map);
  }, [activeSpaceId, includeShared]);

  useEffect(() => {
    reload();
  }, [reload]);

  // One-shot prefill when arriving from the accounts tab via "Track as goal".
  useEffect(() => {
    if (!pendingGoalDraft) return;
    setError("");
    setDraft({
      ...EMPTY_DRAFT,
      kind: "payoff",
      name: `Pay off ${pendingGoalDraft.account_name}`,
      target: "0",
      starting: centsToDollars(pendingGoalDraft.balance_cents),
      linked_account_id: pendingGoalDraft.account_id,
    });
    setPendingGoalDraft(null);
  }, [pendingGoalDraft, setPendingGoalDraft]);

  function startNew() {
    setError("");
    setDraftReadOnly(false);
    setDraft({ ...EMPTY_DRAFT });
  }

  function startEdit(g: Goal, opts: { readOnly: boolean } = { readOnly: false }) {
    setError("");
    setDraftReadOnly(opts.readOnly);
    setDraft({
      id: g.id,
      kind: g.kind,
      name: g.name,
      target: centsToDollars(g.target_amount),
      starting: centsToDollars(g.starting_amount),
      target_date: g.target_date ?? "",
      monthly_contribution: centsToDollars(g.monthly_contribution),
      linked_account_id: g.linked_account_id,
      apr: aprBpsToPercentString(g.apr_bps),
      term_months: g.term_months != null ? String(g.term_months) : "",
    });
  }

  function pickDebt(account: AccountRow) {
    if (!draft) return;
    setDraft({
      ...draft,
      linked_account_id: account.id,
      name: draft.name.trim() ? draft.name : `Pay off ${account.name}`,
      starting: centsToDollars(Math.abs(account.current_balance ?? 0)),
      target: draft.target.trim() ? draft.target : "0",
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
    let aprBps: number | null = null;
    if (draft.kind === "payoff" && draft.apr.trim()) {
      const aprPct = Number.parseFloat(draft.apr);
      if (!Number.isFinite(aprPct) || aprPct < 0) {
        setError("APR must be a non-negative number.");
        return;
      }
      aprBps = Math.round(aprPct * 100);
    }
    let termMonths: number | null = null;
    if (draft.kind === "payoff" && draft.term_months.trim()) {
      const t = Number.parseInt(draft.term_months, 10);
      if (!Number.isFinite(t) || t <= 0) {
        setError("Term must be a positive whole number of months.");
        return;
      }
      termMonths = t;
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
        apr_bps: aprBps,
        term_months: termMonths,
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

  async function toggleShare(goalId: string, spaceId: string) {
    setBusy(true);
    try {
      const current = sharesByGoal[goalId] ?? new Set<string>();
      if (current.has(spaceId)) {
        await removeGoalShare(supabase, { goal_id: goalId, space_id: spaceId });
      } else {
        await setGoalShare(supabase, { goal_id: goalId, space_id: spaceId });
      }
      await reload();
    } catch (e) {
      setError((e as Error).message ?? "Could not update share.");
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

      <HStack gap="sm">
        <Chip
          active={!includeShared}
          label="This space"
          onPress={() => setIncludeShared(false)}
        />
        <Chip
          active={includeShared}
          label="Include shared"
          onPress={() => setIncludeShared(true)}
        />
      </HStack>

      {error && !draft ? (
        <Card>
          <Text style={{ color: colors.negative }}>{error}</Text>
        </Card>
      ) : null}

      {draft ? (
        <Card>
          <Stack gap="md">
            <Text variant="title">
              {draftReadOnly ? "Goal details" : draft.id ? "Edit goal" : "New goal"}
            </Text>
            {draftReadOnly ? (
              <Text variant="muted">Read-only — owned by another space.</Text>
            ) : null}
            <KindToggle
              value={draft.kind}
              onChange={(kind) => setDraft({ ...draft, kind })}
              disabled={draftReadOnly}
            />
            <Field
              label="Name"
              value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })}
              placeholder={draft.kind === "save" ? "Emergency fund" : "Pay off Citi card"}
              editable={!draftReadOnly}
            />
            {draft.kind === "payoff" && !draft.id && !draftReadOnly && debtAccounts.length > 0 ? (
              <Stack gap="xs">
                <Text variant="label">Pick a debt to track (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <HStack gap="sm">
                    {debtAccounts.map((a) => (
                      <Chip
                        key={a.id}
                        active={draft.linked_account_id === a.id}
                        label={a.name}
                        onPress={() => pickDebt(a)}
                      />
                    ))}
                  </HStack>
                </ScrollView>
              </Stack>
            ) : null}
            <Field
              label={draft.kind === "save" ? "Target amount" : "Target balance (usually 0)"}
              value={draft.target}
              onChangeText={(target) => setDraft({ ...draft, target })}
              placeholder="0.00"
              keyboardType="decimal-pad"
              editable={!draftReadOnly}
            />
            {draft.kind === "payoff" ? (
              <Field
                label="Starting debt"
                value={draft.starting}
                onChangeText={(starting) => setDraft({ ...draft, starting })}
                placeholder="The balance the day you set this goal"
                keyboardType="decimal-pad"
                editable={!draftReadOnly}
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
              editable={!draftReadOnly}
            />
            {draft.kind === "payoff" ? (
              <>
                <Field
                  label="APR % (optional)"
                  value={draft.apr}
                  onChangeText={(apr) => setDraft({ ...draft, apr })}
                  placeholder="24.99"
                  keyboardType="decimal-pad"
                  editable={!draftReadOnly}
                />
                <Field
                  label="Term months (optional)"
                  value={draft.term_months}
                  onChangeText={(term_months) => setDraft({ ...draft, term_months })}
                  placeholder="36"
                  keyboardType="decimal-pad"
                  editable={!draftReadOnly}
                />
              </>
            ) : null}
            <Field
              label="Target date (optional)"
              value={draft.target_date}
              onChangeText={(target_date) => setDraft({ ...draft, target_date })}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
              editable={!draftReadOnly}
            />
            {!draftReadOnly ? (
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
            ) : null}
            {error ? <Text style={{ color: colors.negative }}>{error}</Text> : null}
            <HStack gap="sm">
              {draftReadOnly ? (
                <Button
                  label="Close"
                  variant="ghost"
                  onPress={() => {
                    setDraft(null);
                    setDraftReadOnly(false);
                    setError("");
                  }}
                  style={{ flex: 1 }}
                />
              ) : (
                <>
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
                </>
              )}
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
          aprBps: g.apr_bps ?? 0,
        });
        const monthsLeft = projectMonthsToGoal({
          kind: g.kind,
          current,
          target: g.target_amount,
          monthlyContribution: g.monthly_contribution,
          aprBps: g.apr_bps ?? 0,
        });
        const requiredPmt =
          g.kind === "payoff" && g.term_months
            ? requiredMonthlyPayment({
                balance: current || g.starting_amount || 0,
                aprBps: g.apr_bps ?? 0,
                months: g.term_months,
                target: g.target_amount,
              })
            : null;
        const ownedHere = g.space_id === activeSpaceId;
        const canEdit = ownedHere;
        const shares = sharesByGoal[g.id] ?? new Set<string>();
        return (
          <Pressable
            key={g.id}
            onPress={canEdit ? () => startEdit(g) : () => startEdit(g, { readOnly: true })}
          >
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
                {requiredPmt != null ? (
                  <Text variant="muted">
                    Required: <Money cents={requiredPmt} />/mo over {g.term_months} mo
                    {g.apr_bps ? ` @ ${aprBpsToPercentString(g.apr_bps)}% APR` : ""}
                  </Text>
                ) : null}
                {ownedHere && shareableSpaces.length > 0 ? (
                  <Stack gap="xs">
                    <Text variant="label">Share to:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <HStack gap="sm">
                        {shareableSpaces.map((s) => (
                          <Chip
                            key={s.id}
                            active={shares.has(s.id)}
                            label={s.name}
                            onPress={() => toggleShare(g.id, s.id)}
                          />
                        ))}
                      </HStack>
                    </ScrollView>
                  </Stack>
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

function KindToggle({
  value,
  onChange,
  disabled,
}: {
  value: "save" | "payoff";
  onChange: (k: "save" | "payoff") => void;
  disabled?: boolean;
}) {
  return (
    <HStack gap="sm">
      <Chip
        active={value === "save"}
        label="Save toward"
        onPress={() => !disabled && onChange("save")}
      />
      <Chip
        active={value === "payoff"}
        label="Pay off debt"
        onPress={() => !disabled && onChange("payoff")}
      />
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
  editable?: boolean;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  editable = true,
}: FieldProps) {
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
        editable={editable}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
          color: editable ? colors.text : colors.textMuted,
          backgroundColor: editable ? colors.surface : colors.bg,
        }}
      />
    </Stack>
  );
}
