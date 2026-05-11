import { Pressable, Text as RNText, View } from "react-native";
import { Avatar, CategoryChip, I, TxNum, categoryTint, fonts, type Palette, type ThemeMode } from "@cvc/ui";
import { displayMerchantName, resolveTxCategory } from "@cvc/domain";
import type { ActivityTxn } from "../../lib/activity-types";
import { haptics } from "../../lib/haptics";

interface Props {
  tx: ActivityTxn;
  palette: Palette;
  mode: ThemeMode;
  accountName: string | null;
  sharedInitial: string | null;
  splitFlag: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

export function TxRow({ tx, palette, mode, accountName, sharedInitial, splitFlag, onTap, onLongPress }: Props) {
  const isPending = tx.pending;
  const isIncome = tx.amount > 0;
  const cat = resolveTxCategory(tx.category, tx.amount);
  const merchant = displayMerchantName(tx);
  const sharedTint = categoryTint("dining", mode);

  return (
    <Pressable
      onPress={() => {
        haptics.light();
        onTap();
      }}
      onLongPress={() => {
        haptics.medium();
        onLongPress();
      }}
      delayLongPress={500}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "transparent",
        borderBottomWidth: 1,
        borderBottomColor: palette.line,
      }}
    >
      <CategoryChip kind={cat.kind} mode={mode} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <RNText
            numberOfLines={1}
            style={{
              flexShrink: 1,
              fontFamily: fonts.uiMedium,
              fontSize: 15,
              fontWeight: "500",
              color: isPending ? palette.ink2 : palette.ink1,
              fontStyle: isPending ? "italic" : "normal",
            }}
          >
            {merchant}
          </RNText>
          {tx.is_recurring ? <I.sync color={palette.ink3} size={11} /> : null}
        </View>
        <View
          style={{
            marginTop: 2,
            flexDirection: "row",
            alignItems: "center",
            flexWrap: "wrap",
            rowGap: 2,
          }}
        >
          <RNText style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>
            {cat.label}
          </RNText>
          {accountName ? (
            <>
              <Dot color={palette.ink4} />
              <RNText style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3 }}>
                {accountName}
              </RNText>
            </>
          ) : null}
          {sharedInitial ? (
            <>
              <Dot color={palette.ink4} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <I.share color={palette.ink3} size={11} />
                <Avatar initial={sharedInitial} bg={sharedTint.pillBg} fg={sharedTint.pillFg} size={14} />
              </View>
            </>
          ) : null}
          {splitFlag ? (
            <>
              <Dot color={palette.ink4} />
              <RNText
                style={{
                  fontFamily: fonts.numMedium,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1.0,
                  color: palette.ink3,
                }}
              >
                SPLIT
              </RNText>
            </>
          ) : null}
          {isPending ? (
            <>
              <Dot color={palette.ink4} />
              <RNText
                style={{
                  fontFamily: fonts.numMedium,
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1.0,
                  color: palette.ink3,
                }}
              >
                PENDING
              </RNText>
            </>
          ) : null}
        </View>
      </View>

      <TxNum
        cents={tx.amount}
        showSign
        signNegative="−$"
        signPositive="+$"
        fontSize={15}
        fontWeight={isPending ? "400" : "500"}
        color={isPending ? palette.ink3 : isIncome ? palette.pos : palette.ink1}
        centsColor={isPending ? palette.ink4 : palette.ink3}
        italic={isPending}
      />

      <Pressable
        onPress={() => {
          haptics.medium();
          onLongPress();
        }}
        hitSlop={8}
        accessibilityLabel="More actions"
        style={{
          width: 24,
          height: 24,
          marginLeft: 4,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <I.more color={palette.ink3} />
      </Pressable>
    </Pressable>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <View
      style={{
        width: 3,
        height: 3,
        borderRadius: 999,
        backgroundColor: color,
        marginHorizontal: 6,
      }}
    />
  );
}
