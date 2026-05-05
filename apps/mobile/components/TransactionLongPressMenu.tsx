import { Modal, Pressable, Text as RNText, View } from "react-native";
import {
  CategoryChip,
  I,
  TxNum,
  fonts,
  type Palette,
  type ThemeMode,
} from "@cvc/ui";
import {
  displayMerchantName,
  resolveTxCategory,
} from "@cvc/domain";
import type { ActivityTxn } from "../lib/activity-types";

interface Props {
  txn: ActivityTxn | null;
  palette: Palette;
  mode: ThemeMode;
  accountName: string | null;
  sharedView: boolean;
  isHidden: boolean;
  onClose: () => void;
  onEditCategory: () => void;
  onToggleRecurring: () => void;
  onSplit: () => void;
  onShareToggle: () => void;
  onHideToggle: () => void;
}

export function TransactionLongPressMenu({
  txn,
  palette,
  mode,
  accountName,
  sharedView,
  isHidden,
  onClose,
  onEditCategory,
  onToggleRecurring,
  onSplit,
  onShareToggle,
  onHideToggle,
}: Props) {
  if (!txn) {
    return (
      <Modal visible={false} transparent animationType="fade" onRequestClose={onClose}>
        <View />
      </Modal>
    );
  }
  const cat = resolveTxCategory(txn.category, txn.amount);
  const merchant = displayMerchantName(txn);
  const isIncome = txn.amount > 0;

  return (
    <Modal visible={!!txn} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(20,24,28,0.46)", justifyContent: "center", alignItems: "center" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: "92%",
            maxWidth: 420,
          }}
        >
          {/* lifted row */}
          <View
            style={{
              backgroundColor: palette.surface,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowOffset: { width: 0, height: 10 },
              shadowRadius: 30,
              elevation: 12,
              marginBottom: 8,
            }}
          >
            <CategoryChip kind={cat.kind} mode={mode} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <RNText
                numberOfLines={1}
                style={{ fontFamily: fonts.uiMedium, fontSize: 15, fontWeight: "500", color: palette.ink1 }}
              >
                {merchant}
              </RNText>
              <RNText style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, marginTop: 2 }}>
                {cat.label}
                {accountName ? ` · ${accountName}` : ""}
              </RNText>
            </View>
            <TxNum
              cents={txn.amount}
              showSign
              fontSize={15}
              fontWeight="500"
              color={isIncome ? palette.pos : palette.ink1}
              centsColor={palette.ink3}
            />
          </View>

          {/* menu */}
          <View
            style={{
              backgroundColor: palette.surface,
              borderRadius: 14,
              padding: 6,
              shadowColor: "#000",
              shadowOpacity: 0.22,
              shadowOffset: { width: 0, height: 10 },
              shadowRadius: 30,
              elevation: 12,
            }}
          >
            <MenuItem
              palette={palette}
              icon="edit"
              label="Edit category"
              hint={cat.label}
              onPress={onEditCategory}
            />
            <MenuItem
              palette={palette}
              icon="bell"
              label={txn.is_recurring ? "Stop recurring" : "Mark as recurring"}
              onPress={onToggleRecurring}
            />
            <MenuItem palette={palette} icon="split" label="Split transaction" onPress={onSplit} />
            {sharedView ? (
              <>
                <MenuItem
                  palette={palette}
                  icon="share"
                  label="Share to space"
                  hint={isHidden ? "Currently hidden" : "Currently shared"}
                  onPress={onShareToggle}
                />
                <Divider palette={palette} />
                <MenuItem
                  palette={palette}
                  icon="hide"
                  label={isHidden ? "Unhide" : "Hide from space"}
                  warn={!isHidden}
                  onPress={onHideToggle}
                />
              </>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuItem({
  palette,
  icon,
  label,
  hint,
  warn,
  onPress,
}: {
  palette: Palette;
  icon: "edit" | "bell" | "split" | "share" | "hide";
  label: string;
  hint?: string;
  warn?: boolean;
  onPress: () => void;
}) {
  const c = warn ? palette.warn : palette.ink1;
  const Icon =
    icon === "edit"
      ? I.edit
      : icon === "bell"
      ? I.bell
      : icon === "split"
      ? I.split
      : icon === "share"
      ? I.share
      : I.hide;
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 10,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: palette.tinted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon color={c} size={16} />
      </View>
      <RNText style={{ flex: 1, fontFamily: fonts.uiMedium, fontSize: 14.5, fontWeight: "500", color: c }}>
        {label}
      </RNText>
      {hint ? (
        <RNText style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>{hint}</RNText>
      ) : null}
    </Pressable>
  );
}

function Divider({ palette }: { palette: Palette }) {
  return (
    <View
      style={{
        height: 1,
        marginHorizontal: 8,
        marginVertical: 4,
        backgroundColor: palette.line,
      }}
    />
  );
}
