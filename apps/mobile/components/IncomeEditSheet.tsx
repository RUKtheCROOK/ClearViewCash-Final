import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  deleteIncomeEvent,
  markIncomeReceived,
  upsertIncomeEvent,
} from "@cvc/api-client";
import type { Cadence } from "@cvc/types";
import { supabase } from "../lib/supabase";

export interface EditableIncome {
  id: string;
  space_id: string;
  owner_user_id: string;
  name: string;
  amount: number;
  cadence: Cadence;
  next_due_at: string;
  source: "detected" | "manual";
  recurring_group_id: string | null;
  actual_amount: number | null;
  received_at: string | null;
}

interface Props {
  visible: boolean;
  income: EditableIncome | null;
  spaceId: string | null;
  ownerUserId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const CADENCES: Cadence[] = ["weekly", "biweekly", "monthly", "yearly", "once"];

function dollarsToCents(s: string): number {
  if (!s.trim()) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return Number.NaN;
  return Math.round(n * 100);
}

function centsToDollarStr(c: number): string {
  return (c / 100).toFixed(2);
}

function dayOfMonth(iso: string): number {
  const m = iso.match(/^\d{4}-\d{2}-(\d{2})$/);
  if (!m) return 1;
  const day = Number(m[1]);
  if (!Number.isFinite(day) || day < 1 || day > 31) return 1;
  return day;
}

function isValidIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function IncomeEditSheet({ visible, income, spaceId, ownerUserId, onClose, onSaved }: Props) {
  const isNew = !income;
  const [name, setName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [nextDueAt, setNextDueAt] = useState("");
  const [actualStr, setActualStr] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (income) {
      setName(income.name);
      setAmountStr(centsToDollarStr(income.amount));
      setCadence(income.cadence);
      setNextDueAt(income.next_due_at);
      setActualStr(centsToDollarStr(income.actual_amount ?? income.amount));
      setReceivedAt(income.received_at ?? todayIso());
    } else {
      setName("");
      setAmountStr("");
      setCadence("monthly");
      setNextDueAt("");
      setActualStr("");
      setReceivedAt(todayIso());
    }
  }, [visible, income]);

  async function save() {
    if (!spaceId || !ownerUserId) {
      setError("Switch to a space first.");
      return;
    }
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const cents = dollarsToCents(amountStr);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!isValidIsoDate(nextDueAt)) {
      setError("Date must be YYYY-MM-DD.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await upsertIncomeEvent(supabase, {
        ...(income ? { id: income.id } : {}),
        space_id: spaceId,
        owner_user_id: ownerUserId,
        name: name.trim(),
        amount: cents,
        cadence,
        next_due_at: nextDueAt,
        autopay: false,
        due_day: dayOfMonth(nextDueAt),
        source: income?.source ?? "manual",
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save income.");
    } finally {
      setSaving(false);
    }
  }

  async function markReceived() {
    if (!income) return;
    const cents = dollarsToCents(actualStr);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a valid received amount.");
      return;
    }
    if (!isValidIsoDate(receivedAt)) {
      setError("Received date must be YYYY-MM-DD.");
      return;
    }
    setMarking(true);
    setError(null);
    try {
      await markIncomeReceived(supabase, {
        id: income.id,
        actual_amount: cents,
        received_at: receivedAt,
        cadence: income.cadence,
        current_next_due_at: income.next_due_at,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not mark received.");
    } finally {
      setMarking(false);
    }
  }

  async function remove() {
    if (!income) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteIncomeEvent(supabase, income.id);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not delete income.");
    } finally {
      setDeleting(false);
    }
  }

  const isOnceReceived = !!income && income.cadence === "once" && income.received_at !== null;
  const variance =
    income && income.actual_amount !== null ? income.actual_amount - income.amount : null;

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
            maxHeight: "90%",
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Stack gap="md">
              <Text variant="title">{isNew ? "Add income" : "Edit income"}</Text>

              <Stack gap="sm">
                <Text variant="muted" style={{ fontSize: 12 }}>Source name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Acme Payroll"
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
                <Text variant="muted" style={{ fontSize: 12 }}>Expected amount (USD)</Text>
                <TextInput
                  value={amountStr}
                  onChangeText={setAmountStr}
                  placeholder="0.00"
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
                  {cadence === "once" ? "Date received expected" : "Next expected date"}
                </Text>
                <TextInput
                  value={nextDueAt}
                  onChangeText={setNextDueAt}
                  placeholder="YYYY-MM-DD"
                  autoCapitalize="none"
                  autoCorrect={false}
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
                <Text variant="muted" style={{ fontSize: 12 }}>Cadence</Text>
                <HStack gap="sm" style={{ flexWrap: "wrap" }}>
                  {CADENCES.map((c) => {
                    const selected = cadence === c;
                    return (
                      <Pressable
                        key={c}
                        onPress={() => setCadence(c)}
                        style={{
                          paddingHorizontal: space.md,
                          paddingVertical: space.sm,
                          borderRadius: radius.pill,
                          borderWidth: 1,
                          borderColor: selected ? colors.primary : colors.border,
                          backgroundColor: selected ? colors.primary : colors.surface,
                        }}
                      >
                        <Text
                          style={{
                            color: selected ? "#fff" : colors.text,
                            fontSize: 12,
                            fontWeight: selected ? "600" : "400",
                          }}
                        >
                          {c === "once" ? "one-time" : c}
                        </Text>
                      </Pressable>
                    );
                  })}
                </HStack>
              </Stack>

              {!isNew ? (
                <Stack gap="sm">
                  <Text variant="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {isOnceReceived ? "Received" : "Mark received"}
                  </Text>
                  {isOnceReceived ? (
                    <View
                      style={{
                        padding: space.md,
                        borderRadius: radius.md,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <HStack justify="space-between" align="center">
                        <Stack gap="xs">
                          <Text style={{ fontSize: 13 }}>{income!.received_at}</Text>
                          {variance !== null && variance !== 0 ? (
                            <Text variant="muted" style={{ fontSize: 11 }}>
                              {variance > 0 ? "+" : ""}
                              {centsToDollarStr(variance)} vs expected
                            </Text>
                          ) : null}
                        </Stack>
                        <Money cents={income!.actual_amount ?? 0} positiveColor />
                      </HStack>
                    </View>
                  ) : (
                    <>
                      <Stack gap="sm">
                        <Text variant="muted" style={{ fontSize: 12 }}>Actual amount (USD)</Text>
                        <TextInput
                          value={actualStr}
                          onChangeText={setActualStr}
                          placeholder="0.00"
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
                        <Text variant="muted" style={{ fontSize: 12 }}>Received on</Text>
                        <TextInput
                          value={receivedAt}
                          onChangeText={setReceivedAt}
                          placeholder="YYYY-MM-DD"
                          autoCapitalize="none"
                          autoCorrect={false}
                          style={{
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: radius.md,
                            padding: space.md,
                            backgroundColor: colors.surface,
                          }}
                        />
                      </Stack>
                      <Pressable
                        onPress={markReceived}
                        disabled={marking}
                        style={{
                          padding: space.md,
                          borderRadius: radius.md,
                          backgroundColor: marking ? colors.textMuted : colors.positive,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "600" }}>
                          {marking ? "Saving…" : "Mark received"}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </Stack>
              ) : null}

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
                    {saving ? "Saving…" : isNew ? "Create" : "Save"}
                  </Text>
                </Pressable>
              </HStack>

              {!isNew ? (
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
                    {deleting ? "Deleting…" : "Delete income"}
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
