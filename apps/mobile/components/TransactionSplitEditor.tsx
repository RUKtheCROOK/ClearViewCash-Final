import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  clearTransactionSplits,
  listSplitsForTransaction,
  upsertTransactionSplits,
} from "@cvc/api-client";
import { supabase } from "../lib/supabase";

interface SplitRow {
  category: string;
  /** dollars as a decimal string while editing (e.g. "12.34") */
  amountStr: string;
}

interface Props {
  visible: boolean;
  txnId: string | null;
  txnAmountCents: number;
  spaceId: string | null;
  defaultCategory: string | null;
  onClose: () => void;
  onSaved: () => void;
}

function dollarsToCents(s: string): number {
  if (!s.trim()) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) return Number.NaN;
  return Math.round(n * 100);
}

function centsToDollarStr(c: number): string {
  return (c / 100).toFixed(2);
}

export function TransactionSplitEditor({
  visible,
  txnId,
  txnAmountCents,
  spaceId,
  defaultCategory,
  onClose,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<SplitRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !txnId) return;
    setError(null);
    setLoading(true);
    listSplitsForTransaction(supabase, txnId)
      .then((existing) => {
        if (existing.length) {
          setRows(
            (existing as Array<{ category: string; amount: number }>).map((s) => ({
              category: s.category,
              amountStr: centsToDollarStr(s.amount),
            })),
          );
        } else {
          setRows([
            {
              category: defaultCategory ?? "",
              amountStr: centsToDollarStr(txnAmountCents),
            },
          ]);
        }
      })
      .finally(() => setLoading(false));
  }, [visible, txnId, txnAmountCents, defaultCategory]);

  const sumCents = rows.reduce((acc, r) => acc + (dollarsToCents(r.amountStr) || 0), 0);
  const remainderCents = txnAmountCents - sumCents;
  const anyInvalid = rows.some((r) => Number.isNaN(dollarsToCents(r.amountStr)));
  const blank = rows.some((r) => !r.category.trim());
  const canSave = !saving && !anyInvalid && !blank && remainderCents === 0 && rows.length > 0;

  function update(idx: number, patch: Partial<SplitRow>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, { category: "", amountStr: centsToDollarStr(remainderCents) }]);
  }

  function removeRow(idx: number) {
    setRows((rs) => rs.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!txnId || !spaceId) return;
    setSaving(true);
    setError(null);
    try {
      await upsertTransactionSplits(supabase, {
        transaction_id: txnId,
        space_id: spaceId,
        splits: rows.map((r) => ({
          category: r.category.trim(),
          amount: dollarsToCents(r.amountStr),
        })),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save splits.");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    if (!txnId) return;
    setSaving(true);
    setError(null);
    try {
      await clearTransactionSplits(supabase, txnId);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not clear splits.");
    } finally {
      setSaving(false);
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
              <HStack justify="space-between" align="center">
                <Text variant="title">Split transaction</Text>
                <Money cents={txnAmountCents} positiveColor />
              </HStack>

              {!spaceId ? (
                <Text variant="muted">
                  Splits live on a space — switch to a space to split this transaction.
                </Text>
              ) : null}

              {loading ? <Text variant="muted">Loading…</Text> : null}

              {rows.map((r, idx) => (
                <View
                  key={idx}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: space.md,
                    backgroundColor: colors.surface,
                    gap: space.sm,
                  }}
                >
                  <HStack justify="space-between" align="center">
                    <Text variant="muted" style={{ fontSize: 12 }}>
                      Split {idx + 1}
                    </Text>
                    {rows.length > 1 ? (
                      <Pressable onPress={() => removeRow(idx)}>
                        <Text style={{ color: colors.negative, fontSize: 13 }}>Remove</Text>
                      </Pressable>
                    ) : null}
                  </HStack>
                  <TextInput
                    value={r.category}
                    onChangeText={(v) => update(idx, { category: v })}
                    placeholder="Category"
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radius.sm,
                      padding: space.sm,
                      backgroundColor: colors.bg,
                    }}
                  />
                  <TextInput
                    value={r.amountStr}
                    onChangeText={(v) => update(idx, { amountStr: v })}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: radius.sm,
                      padding: space.sm,
                      backgroundColor: colors.bg,
                    }}
                  />
                </View>
              ))}

              <Pressable
                onPress={addRow}
                style={{
                  padding: space.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderColor: colors.border,
                  alignItems: "center",
                }}
              >
                <Text variant="muted">+ Add split</Text>
              </Pressable>

              <HStack justify="space-between">
                <Text variant="muted">Remainder</Text>
                <Text
                  style={{
                    color:
                      remainderCents === 0
                        ? colors.positive
                        : Math.abs(remainderCents) > 0
                          ? colors.warning
                          : colors.text,
                    fontWeight: "600",
                  }}
                >
                  {remainderCents === 0 ? "$0.00 ✓" : centsToDollarStr(remainderCents)}
                </Text>
              </HStack>

              {error ? <Text style={{ color: colors.negative }}>{error}</Text> : null}

              <HStack gap="sm">
                <Pressable
                  onPress={clear}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: space.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                  }}
                >
                  <Text>Clear</Text>
                </Pressable>
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
                  disabled={!canSave}
                  style={{
                    flex: 1,
                    padding: space.md,
                    borderRadius: radius.md,
                    backgroundColor: canSave ? colors.primary : colors.textMuted,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    {saving ? "Saving…" : "Save"}
                  </Text>
                </Pressable>
              </HStack>
            </Stack>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
