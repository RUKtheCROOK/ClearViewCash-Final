import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  setTransactionNote,
  setTransactionRecurring,
  setTransactionShare,
  updateTransactionCategory,
} from "@cvc/api-client";
import { supabase } from "../lib/supabase";
import { TransactionSplitEditor } from "./TransactionSplitEditor";

export interface EditableTxn {
  id: string;
  merchant_name: string | null;
  amount: number;
  posted_at: string;
  category: string | null;
  pending: boolean;
  is_recurring: boolean;
  account_id: string;
  owner_user_id: string;
  note: string | null;
}

interface Props {
  txn: EditableTxn | null;
  spaceId: string | null;
  sharedView: boolean;
  hiddenInSpace: boolean;
  categorySuggestions: string[];
  onClose: () => void;
  onSaved: () => void;
}

export function TransactionEditSheet({
  txn,
  spaceId,
  sharedView,
  hiddenInSpace,
  categorySuggestions,
  onClose,
  onSaved,
}: Props) {
  const [category, setCategory] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [recurring, setRecurring] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);

  useEffect(() => {
    if (!txn) return;
    setCategory(txn.category ?? "");
    setNote(txn.note ?? "");
    setRecurring(txn.is_recurring);
    setHidden(hiddenInSpace);
    setError(null);
  }, [txn, hiddenInSpace]);

  if (!txn) {
    return (
      <Modal visible={false} transparent animationType="slide" onRequestClose={onClose}>
        <View />
      </Modal>
    );
  }

  async function save() {
    if (!txn) return;
    setSaving(true);
    setError(null);
    try {
      const trimmedCategory = category.trim();
      const newCategory = trimmedCategory.length ? trimmedCategory : null;
      if (newCategory !== (txn.category ?? null)) {
        await updateTransactionCategory(supabase, { id: txn.id, category: newCategory });
      }
      const trimmedNote = note.trim();
      const newNote = trimmedNote.length ? trimmedNote : null;
      if (newNote !== (txn.note ?? null)) {
        await setTransactionNote(supabase, { id: txn.id, note: newNote });
      }
      if (recurring !== txn.is_recurring) {
        await setTransactionRecurring(supabase, { id: txn.id, is_recurring: recurring });
      }
      if (sharedView && spaceId && hidden !== hiddenInSpace) {
        await setTransactionShare(supabase, {
          transaction_id: txn.id,
          space_id: spaceId,
          hidden,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? "Could not save changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={!!txn} transparent animationType="slide" onRequestClose={onClose}>
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
                <Stack gap="xs">
                  <Text variant="title">{txn.merchant_name ?? "Unknown"}</Text>
                  <Text variant="muted">
                    {txn.posted_at}
                    {txn.pending ? " · pending" : ""}
                  </Text>
                </Stack>
                <Money cents={txn.amount} positiveColor />
              </HStack>

              <Stack gap="sm">
                <Text variant="muted" style={{ fontSize: 12 }}>
                  Category
                </Text>
                <TextInput
                  value={category}
                  onChangeText={setCategory}
                  placeholder="e.g. groceries"
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: space.md,
                    backgroundColor: colors.surface,
                  }}
                />
                {categorySuggestions.length ? (
                  <HStack gap="sm" style={{ flexWrap: "wrap" }}>
                    {categorySuggestions.slice(0, 8).map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => setCategory(c)}
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
                          {c}
                        </Text>
                      </Pressable>
                    ))}
                  </HStack>
                ) : null}
              </Stack>

              <Stack gap="sm">
                <Text variant="muted" style={{ fontSize: 12 }}>
                  Notes
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a note…"
                  multiline
                  numberOfLines={3}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: space.md,
                    backgroundColor: colors.surface,
                    minHeight: 72,
                    textAlignVertical: "top",
                  }}
                />
              </Stack>

              <HStack justify="space-between" align="center">
                <Text>Mark as recurring</Text>
                <Switch value={recurring} onValueChange={setRecurring} />
              </HStack>

              {sharedView && spaceId ? (
                <HStack justify="space-between" align="center">
                  <Stack gap="xs" style={{ flex: 1, marginRight: space.md }}>
                    <Text>Hide from this space</Text>
                    <Text variant="muted" style={{ fontSize: 12 }}>
                      Other members will not see this transaction.
                    </Text>
                  </Stack>
                  <Switch value={hidden} onValueChange={setHidden} />
                </HStack>
              ) : null}

              {spaceId ? (
                <Pressable
                  onPress={() => setSplitOpen(true)}
                  style={{
                    padding: space.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  }}
                >
                  <HStack justify="space-between" align="center">
                    <Stack gap="xs">
                      <Text>Split this transaction</Text>
                      <Text variant="muted" style={{ fontSize: 12 }}>
                        Divide the amount across multiple categories.
                      </Text>
                    </Stack>
                    <Text variant="muted">›</Text>
                  </HStack>
                </Pressable>
              ) : null}

              {error ? (
                <Text style={{ color: colors.negative }}>{error}</Text>
              ) : null}

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
            </Stack>
          </ScrollView>

          <TransactionSplitEditor
            visible={splitOpen}
            txnId={txn.id}
            txnAmountCents={txn.amount}
            spaceId={spaceId}
            defaultCategory={category.trim() || txn.category}
            onClose={() => setSplitOpen(false)}
            onSaved={onSaved}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
