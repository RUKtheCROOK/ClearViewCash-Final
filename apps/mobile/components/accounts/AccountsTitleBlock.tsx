import { Pressable, View } from "react-native";
import { I, Money, Text } from "@cvc/ui";
import { useTheme } from "../../lib/theme";
import type { AccountsSummary } from "@cvc/domain";

interface Props {
  spaceTintHex?: string | null;
  summary: AccountsSummary;
  onLinkAccount: () => void;
  onAddBank: () => void;
}

export function AccountsTitleBlock({ spaceTintHex, summary, onLinkAccount, onAddBank }: Props) {
  const { palette, sp } = useTheme(spaceTintHex);
  return (
    <View
      style={{
        backgroundColor: sp.wash,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 18,
        borderBottomColor: sp.edge,
        borderBottomWidth: 1,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
          gap: 8,
        }}
      >
        <Text
          style={{
            fontSize: 30,
            fontWeight: "500",
            letterSpacing: -0.6,
            color: palette.ink1,
          }}
        >
          Accounts
        </Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <Pressable
            onPress={onLinkAccount}
            style={{
              height: 36,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: palette.surface,
              borderColor: palette.line,
              borderWidth: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
            accessibilityLabel="Pay a card from a cash account"
          >
            <I.link color={palette.ink1} size={14} />
            <Text style={{ color: palette.ink1, fontWeight: "500", fontSize: 13 }}>
              Pay a card
            </Text>
          </Pressable>
          <Pressable
            onPress={onAddBank}
            hitSlop={6}
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              backgroundColor: palette.brand,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Add a bank account"
          >
            <I.plus color={palette.brandOn} size={16} />
          </Pressable>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        <Text style={{ fontSize: 13, color: palette.ink2 }}>
          {summary.accountsCount} linked
        </Text>
        <Text style={{ fontSize: 13, color: palette.ink3 }}>·</Text>
        <Money
          cents={summary.totalCashCents}
          style={{ fontSize: 13, color: palette.ink1, fontWeight: "500" }}
        />
        <Text style={{ fontSize: 13, color: palette.ink2 }}>total cash</Text>
        {summary.creditOwedCents > 0 ? (
          <>
            <Text style={{ fontSize: 13, color: palette.ink3 }}>·</Text>
            <Money
              cents={summary.creditOwedCents}
              style={{ fontSize: 13, color: palette.ink1, fontWeight: "500" }}
            />
            <Text style={{ fontSize: 13, color: palette.ink2 }}>credit owed</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}
