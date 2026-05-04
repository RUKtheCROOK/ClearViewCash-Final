import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  deleteBill,
  getBillPayments,
  getTransactionsByRecurringGroup,
  upsertBill,
} from "@cvc/api-client";
import type { Cadence } from "@cvc/types";
import { supabase } from "../lib/supabase";

export interface EditableBill {
  id: string;
  space_id: string;
  owner_user_id: string;
  name: string;
  amount: number;
  cadence: Cadence;
  next_due_at: string;
  autopay: boolean;
  source: "detected" | "manual";
  recurring_group_id: string | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  paid_at: string;
  status: "paid" | "overdue" | "skipped";
  transaction_id: string | null;
}

interface MatchedTxn {
  id: string;
  merchant_name: string | null;
  amount: number;
  posted_at: string;
}

interface Props {
  visible: boolean;
  bill: EditableBill | null;
  spaceId: string | null;
  ownerUserId: string | null;
  onClose: () => void;
  onSaved: () => void;
}

const CADENCES: Cadence[] = ["weekly", "biweekly", "monthly", "yearly", "custom"];

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

export function BillEditSheet({ visible, bill, spaceId, ownerUserId, onClose, onSaved }: Props) {
  const isNew = !bill;
  const [name, setName] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [nextDueAt, setNextDueAt] = useState("");
  const [autopay, setAutopay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [matched, setMatched] = useState<MatchedTxn[]>([]);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (bill) {
      setName(bill.name);
      setAmountStr(centsToDollarStr(bill.amount));
      setCadence(bill.cadence);
      setNextDueAt(bill.next_due_at);
      setAutopay(bill.autopay);
    } else {
      setName("");
      setAmountStr("");
      setCadence("monthly");
      setNextDueAt("");
      setAutopay(false);
      setPayments([]);
      setMatched([]);
    }
  }, [visible, bill]);

  useEffect(() => {
    if (!visible || !bill) return;
    getBillPayments(supabase, bill.id).then((rows) => setPayments(rows as PaymentRow[]));
    if (bill.recurring_group_id) {
      getTransactionsByRecurringGroup(supabase, bill.recurring_group_id).then((rows) =>
        setMatched(rows as MatchedTxn[]),
      );
    } else {
      setMatched([]);
    }
  }, [visible, bill]);

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
      await upsertBill(supabase, {
        ...(bill ? { id: bill.id } : {}),
        space_id: spaceId,
        owner_user_id: ownerUserId,
        name: name.trim(),
        amount: cents,
        cadence,
        next_due_at: nextDueAt,
        autopay,
        due_day: dayOfMonth(nextDueAt),
        source: bill?.source ?? "manual",
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save bill.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!bill) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteBill(supabase, bill.id);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not delete bill.");
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
            maxHeight: "90%",
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Stack gap="md">
              <Text variant="title">{isNew ? "Add bill" : "Edit bill"}</Text>

              <Stack gap="sm">
                <Text variant="muted" style={{ fontSize: 12 }}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Rent"
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
                <Text variant="muted" style={{ fontSize: 12 }}>Amount (USD)</Text>
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
                <Text variant="muted" style={{ fontSize: 12 }}>Next due date</Text>
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
                          {c}
                        </Text>
                      </Pressable>
                    );
                  })}
                </HStack>
              </Stack>

              <HStack justify="space-between" align="center">
                <Text>Autopay</Text>
                <Switch value={autopay} onValueChange={setAutopay} />
              </HStack>

              {!isNew && payments.length ? (
                <Stack gap="sm">
                  <Text variant="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Payment history
                  </Text>
                  {payments.map((p) => (
                    <View
                      key={p.id}
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
                          <Text style={{ fontSize: 13 }}>{p.paid_at}</Text>
                          <Text variant="muted" style={{ fontSize: 11 }}>
                            {p.status}
                            {p.transaction_id ? " · linked transaction" : ""}
                          </Text>
                        </Stack>
                        <Money cents={p.amount} />
                      </HStack>
                    </View>
                  ))}
                </Stack>
              ) : null}

              {!isNew && matched.length ? (
                <Stack gap="sm">
                  <Text variant="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Source transactions
                  </Text>
                  {matched.map((t) => (
                    <View
                      key={t.id}
                      style={{
                        padding: space.md,
                        borderRadius: radius.md,
                        backgroundColor: colors.surface,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <HStack justify="space-between" align="center">
                        <Stack gap="xs" style={{ flex: 1, marginRight: space.md }}>
                          <Text style={{ fontSize: 13 }}>{t.merchant_name ?? "Unknown"}</Text>
                          <Text variant="muted" style={{ fontSize: 11 }}>{t.posted_at}</Text>
                        </Stack>
                        <Money cents={t.amount} />
                      </HStack>
                    </View>
                  ))}
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
                    {deleting ? "Deleting…" : "Delete bill"}
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
