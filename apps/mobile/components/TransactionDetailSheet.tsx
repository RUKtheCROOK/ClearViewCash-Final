import { useState } from "react";
import { Modal, Pressable, ScrollView, Text as RNText, View } from "react-native";
import {
  CategoryGlyph,
  I,
  TxNum,
  categoryTint,
  fonts,
  type Palette,
  type ThemeMode,
} from "@cvc/ui";
import {
  displayMerchantName,
  resolveTxCategory,
  TX_CATEGORY_KINDS,
  categoryKindLabel,
  type TxCategoryKind,
} from "@cvc/domain";
import {
  setTransactionRecurring,
  setTransactionShare,
  updateTransactionCategory,
} from "@cvc/api-client";
import { supabase } from "../lib/supabase";
import type { ActivityTxn } from "../lib/activity-types";
import { TransactionSplitEditor } from "./TransactionSplitEditor";
import { TransactionEditSheet } from "./TransactionEditSheet";

interface Props {
  txn: ActivityTxn | null;
  spaceId: string | null;
  sharedView: boolean;
  hiddenInSpace: boolean;
  accountName: string | null;
  palette: Palette;
  mode: ThemeMode;
  categorySuggestions: string[];
  categories: import("@cvc/domain").Category[];
  onClose: () => void;
  onSaved: () => void;
  onCategoryCreated?: (c: import("@cvc/domain").Category) => void;
}

export function TransactionDetailSheet({
  txn,
  spaceId,
  sharedView,
  hiddenInSpace,
  accountName,
  palette,
  mode,
  categorySuggestions,
  categories,
  onClose,
  onSaved,
  onCategoryCreated,
}: Props) {
  const [splitOpen, setSplitOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!txn) {
    return (
      <Modal visible={false} transparent animationType="slide" onRequestClose={onClose}>
        <View />
      </Modal>
    );
  }

  const cat = resolveTxCategory(txn.category, txn.amount);
  const tint = categoryTint(cat.kind, mode);
  const merchant = displayMerchantName(txn);
  const isHidden = sharedView && hiddenInSpace;

  async function changeKind(kind: TxCategoryKind) {
    if (!txn) return;
    setPending(true);
    try {
      await updateTransactionCategory(supabase, { id: txn.id, category: categoryKindLabel(kind) });
      onSaved();
    } finally {
      setPending(false);
      setPickerOpen(false);
    }
  }

  async function toggleRecurring() {
    if (!txn) return;
    setPending(true);
    try {
      await setTransactionRecurring(supabase, { id: txn.id, is_recurring: !txn.is_recurring });
      onSaved();
    } finally {
      setPending(false);
    }
  }

  async function toggleHidden() {
    if (!txn || !spaceId || !sharedView) return;
    setPending(true);
    try {
      await setTransactionShare(supabase, {
        transaction_id: txn.id,
        space_id: spaceId,
        hidden: !hiddenInSpace,
      });
      onSaved();
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal visible={!!txn} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(20,24,28,0.34)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: palette.surface,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            maxHeight: "92%",
            paddingBottom: 24,
          }}
        >
          {/* grabber */}
          <View style={{ alignItems: "center", paddingTop: 8 }}>
            <View
              style={{
                width: 36,
                height: 5,
                borderRadius: 3,
                backgroundColor: palette.lineFirm,
              }}
            />
          </View>

          {/* header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingTop: 4,
            }}
          >
            <Pressable
              onPress={onClose}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: palette.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <I.close color={palette.ink1} size={18} />
            </Pressable>
            <RNText style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink3 }}>
              Transaction
            </RNText>
            <Pressable
              onPress={() => setEditOpen(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                backgroundColor: palette.surface,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <I.edit color={palette.ink1} size={18} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            {/* hero amount */}
            <View style={{ alignItems: "center", paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: tint.pillBg,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CategoryGlyph kind={cat.kind} color={tint.pillFg} size={14} />
                </View>
                <RNText style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink2 }}>
                  {cat.label}
                </RNText>
              </View>
              <TxNum
                cents={txn.amount}
                showSign
                fontSize={38}
                fontWeight="500"
                color={palette.ink1}
                centsColor={palette.ink3}
                letterSpacing={-1.0}
              />
              <RNText
                style={{
                  fontFamily: fonts.ui,
                  fontSize: 14,
                  color: palette.ink2,
                  marginTop: 4,
                }}
              >
                {merchant}
              </RNText>
              <RNText
                style={{
                  fontFamily: fonts.numMedium,
                  fontSize: 11,
                  color: palette.ink3,
                  marginTop: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {formatHeroDate(txn.posted_at)} {accountName ? `· ${accountName}` : ""}
              </RNText>
            </View>

            {/* property rows */}
            <View
              style={{
                marginTop: 14,
                marginHorizontal: 16,
                backgroundColor: palette.sunken,
                borderRadius: 12,
                paddingHorizontal: 4,
                paddingVertical: 4,
              }}
            >
              <PropRow
                palette={palette}
                label="Category"
                onPress={() => setPickerOpen(true)}
                value={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 18, height: 18, borderRadius: 5, backgroundColor: tint.swatch }} />
                    <RNText style={{ fontFamily: fonts.ui, fontSize: 13.5, color: palette.ink1 }}>
                      {cat.label}
                    </RNText>
                    <I.chev color={palette.ink3} size={11} />
                  </View>
                }
              />
              <PropDivider palette={palette} />
              <PropRow
                palette={palette}
                label={sharedView ? "Mine vs Shared" : "Visibility"}
                onPress={sharedView && spaceId ? toggleHidden : undefined}
                value={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <I.share color={palette.ink1} size={12} />
                    <RNText style={{ fontFamily: fonts.ui, fontSize: 13.5, color: palette.ink1 }}>
                      {sharedView ? (isHidden ? "Hidden" : "Shared with space") : "Visible"}
                    </RNText>
                    {sharedView && spaceId ? <I.chev color={palette.ink3} size={11} /> : null}
                  </View>
                }
              />
              <PropDivider palette={palette} />
              <PropRow
                palette={palette}
                label="Recurring"
                onPress={toggleRecurring}
                value={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <RNText style={{ fontFamily: fonts.ui, fontSize: 13.5, color: palette.ink2 }}>
                      {txn.is_recurring ? "On" : "Off"}
                    </RNText>
                    <I.chev color={palette.ink3} size={11} />
                  </View>
                }
              />
              <PropDivider palette={palette} />
              <PropRow
                palette={palette}
                label="Account"
                value={
                  <RNText style={{ fontFamily: fonts.ui, fontSize: 13.5, color: palette.ink1 }}>
                    {accountName ?? "—"}
                  </RNText>
                }
              />
            </View>

            {/* note */}
            <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
              <RNText
                style={{
                  fontFamily: fonts.uiSemibold,
                  fontSize: 11,
                  fontWeight: "600",
                  color: palette.ink2,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  marginBottom: 6,
                }}
              >
                Note
              </RNText>
              <Pressable
                onPress={() => setEditOpen(true)}
                style={{
                  backgroundColor: palette.sunken,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <I.note color={palette.ink3} size={16} />
                {txn.note ? (
                  <RNText
                    style={{ fontFamily: fonts.ui, fontSize: 13, color: palette.ink2, flex: 1 }}
                    numberOfLines={2}
                  >
                    {txn.note}
                  </RNText>
                ) : (
                  <RNText
                    style={{
                      fontFamily: fonts.ui,
                      fontSize: 13,
                      color: palette.ink3,
                      fontStyle: "italic",
                      flex: 1,
                    }}
                  >
                    Add a note…
                  </RNText>
                )}
              </Pressable>
            </View>

            {/* actions */}
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 14,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {spaceId ? (
                <ActionBtn palette={palette} label="Split" icon="split" onPress={() => setSplitOpen(true)} />
              ) : null}
              <ActionBtn
                palette={palette}
                label={txn.is_recurring ? "Stop recurring" : "Make recurring"}
                icon="bell"
                onPress={toggleRecurring}
              />
              {sharedView && spaceId ? (
                <ActionBtn
                  palette={palette}
                  label={isHidden ? "Unhide" : "Hide from space"}
                  icon="hide"
                  onPress={toggleHidden}
                />
              ) : null}
              <ActionBtn palette={palette} label="Edit details" icon="edit" onPress={() => setEditOpen(true)} />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>

      {/* category picker (drilldown) */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable
          onPress={() => setPickerOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: palette.surface,
              borderRadius: 14,
              padding: 16,
              width: "84%",
              maxWidth: 420,
            }}
          >
            <RNText
              style={{
                fontFamily: fonts.uiSemibold,
                fontSize: 11,
                fontWeight: "600",
                color: palette.ink2,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 12,
              }}
            >
              Choose category
            </RNText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {TX_CATEGORY_KINDS.map((kind) => {
                const active = cat.kind === kind;
                const t = categoryTint(kind, mode);
                return (
                  <Pressable
                    key={kind}
                    onPress={() => changeKind(kind)}
                    disabled={pending}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      height: 32,
                      paddingHorizontal: 10,
                      paddingLeft: 6,
                      borderRadius: 999,
                      backgroundColor: active ? t.pillBg : palette.surface,
                      borderWidth: 1,
                      borderColor: active ? "transparent" : palette.line,
                    }}
                  >
                    <View
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        backgroundColor: active ? t.swatch : t.pillBg,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CategoryGlyph kind={kind} color={active ? "#fff" : t.pillFg} size={12} strokeWidth={1.8} />
                    </View>
                    <RNText style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, color: active ? t.pillFg : palette.ink2 }}>
                      {categoryKindLabel(kind)}
                    </RNText>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* split editor */}
      <TransactionSplitEditor
        visible={splitOpen}
        txnId={txn.id}
        txnAmountCents={txn.amount}
        spaceId={spaceId}
        defaultCategory={txn.category}
        onClose={() => setSplitOpen(false)}
        onSaved={onSaved}
      />

      {/* full edit sheet (for note/name/etc) */}
      <TransactionEditSheet
        txn={editOpen ? txn : null}
        spaceId={spaceId}
        sharedView={sharedView}
        hiddenInSpace={hiddenInSpace}
        categorySuggestions={categorySuggestions}
        categories={categories}
        onClose={() => setEditOpen(false)}
        onSaved={onSaved}
        onCategoryCreated={onCategoryCreated}
      />
    </Modal>
  );
}

function PropRow({
  palette,
  label,
  value,
  onPress,
}: {
  palette: Palette;
  label: string;
  value: React.ReactNode;
  onPress?: () => void;
}) {
  const Inner = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}
    >
      <RNText style={{ fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink3 }}>{label}</RNText>
      {value}
    </View>
  );
  if (onPress) {
    return <Pressable onPress={onPress}>{Inner}</Pressable>;
  }
  return Inner;
}

function PropDivider({ palette }: { palette: Palette }) {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: palette.line,
        marginHorizontal: 12,
      }}
    />
  );
}

function ActionBtn({
  palette,
  label,
  icon,
  onPress,
  warn,
}: {
  palette: Palette;
  label: string;
  icon: "split" | "bell" | "hide" | "edit" | "trash";
  onPress: () => void;
  warn?: boolean;
}) {
  const c = warn ? palette.warn : palette.ink1;
  const Icon =
    icon === "split"
      ? I.split
      : icon === "bell"
      ? I.bell
      : icon === "hide"
      ? I.hide
      : icon === "edit"
      ? I.edit
      : I.trash;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexBasis: "48%",
        flexGrow: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
        minHeight: 48,
      }}
    >
      <Icon color={c} size={16} />
      <RNText style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: c }}>
        {label}
      </RNText>
    </Pressable>
  );
}

function formatHeroDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!m) return "";
  const [, y, mo, da] = m;
  const d = new Date(Number(y), Number(mo) - 1, Number(da));
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return "TODAY";
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}
