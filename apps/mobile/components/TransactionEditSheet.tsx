import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Switch, TextInput, View } from "react-native";
import { HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import {
  renameVendor,
  setTransactionDisplayName,
  setTransactionNote,
  setTransactionRecurring,
  setTransactionShare,
  updateTransactionCategory,
} from "@cvc/api-client";
import { displayMerchantName, type Category } from "@cvc/domain";
import { supabase } from "../lib/supabase";
import { CategoryPicker } from "./categories/CategoryPicker";
import { TransactionSplitEditor } from "./TransactionSplitEditor";

export interface EditableTxn {
  id: string;
  merchant_name: string | null;
  display_name: string | null;
  amount: number;
  posted_at: string;
  category: string | null;
  category_id?: string | null;
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
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
  onCategoryCreated?: (c: Category) => void;
}

export function TransactionEditSheet({
  txn,
  spaceId,
  sharedView,
  hiddenInSpace,
  categorySuggestions,
  categories,
  onClose,
  onSaved,
  onCategoryCreated,
}: Props) {
  const [name, setName] = useState<string>("");
  const [applyToVendor, setApplyToVendor] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState<string>("");
  const [recurring, setRecurring] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);

  useEffect(() => {
    if (!txn) return;
    setName(displayMerchantName(txn));
    setApplyToVendor(false);
    setCategory(txn.category ?? "");
    setCategoryId(txn.category_id ?? null);
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
      const trimmedName = name.trim();
      const currentDisplay = displayMerchantName(txn);
      if (trimmedName !== currentDisplay) {
        const next = trimmedName.length && trimmedName !== (txn.merchant_name ?? "") ? trimmedName : null;
        if (applyToVendor && txn.merchant_name) {
          await renameVendor(supabase, { merchant_name: txn.merchant_name, display_name: next });
        } else {
          await setTransactionDisplayName(supabase, { id: txn.id, display_name: next });
        }
      }
      const trimmedCategory = category.trim();
      const newCategory = trimmedCategory.length ? trimmedCategory : null;
      const idChanged = categoryId !== (txn.category_id ?? null);
      const nameChanged = newCategory !== (txn.category ?? null);
      if (idChanged || nameChanged) {
        await updateTransactionCategory(supabase, {
          id: txn.id,
          category: newCategory,
          category_id: categoryId,
        });
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
                  <Text variant="title">{displayMerchantName(txn)}</Text>
                  <Text variant="muted">
                    {txn.posted_at}
                    {txn.pending ? " · pending" : ""}
                  </Text>
                </Stack>
                <Money cents={txn.amount} positiveColor />
              </HStack>

              <Stack gap="sm">
                <Text variant="muted" style={{ fontSize: 12 }}>
                  Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={txn.merchant_name ?? "Transaction name"}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                    padding: space.md,
                    backgroundColor: colors.surface,
                  }}
                />
                {txn.merchant_name ? (
                  <HStack justify="space-between" align="center">
                    <Stack gap="xs" style={{ flex: 1, marginRight: space.md }}>
                      <Text>Apply to all from {txn.merchant_name}</Text>
                      <Text variant="muted" style={{ fontSize: 12 }}>
                        Renames every past and future transaction from this vendor.
                      </Text>
                    </Stack>
                    <Switch value={applyToVendor} onValueChange={setApplyToVendor} />
                  </HStack>
                ) : null}
              </Stack>

              <Stack gap="sm">
                <Text variant="muted" style={{ fontSize: 12 }}>
                  Category
                </Text>
                {spaceId ? (
                  <CategoryPicker
                    value={categoryId}
                    onChange={(id, cat) => {
                      setCategoryId(id);
                      setCategory(cat?.name ?? "");
                    }}
                    categories={categories}
                    spaceId={spaceId}
                    placeholder="Pick a category"
                    allowNone
                    allowCreate
                    onCategoryCreated={onCategoryCreated}
                  />
                ) : (
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
                )}
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
