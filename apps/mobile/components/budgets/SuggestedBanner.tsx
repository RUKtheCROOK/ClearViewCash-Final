import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { Num, fmtMoneyShort } from "./Num";

interface Props {
  palette: Palette;
  category: string;
  spentCents: number;
  txnCount: number;
  hint: string | null;
  onAdd: () => void;
}

/**
 * Soft, dismissible suggested-category banner shown below the summary card
 * when we detect spend in a category that isn't yet budgeted.
 */
export function SuggestedBanner({ palette, category, spentCents, txnCount, hint, onAdd }: Props) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 14,
          backgroundColor: palette.infoTint,
          borderWidth: 1,
          borderColor: palette.line,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            backgroundColor: palette.surface,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TagIcon color={palette.info} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: palette.ink1 }}>
            <Num style={{ color: palette.ink1, fontWeight: "600" }}>{fmtMoneyShort(spentCents)}</Num> in{" "}
            <Text style={{ color: palette.info, fontWeight: "600" }}>{category}</Text> isn&apos;t budgeted
          </Text>
          <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3, marginTop: 2 }}>
            {txnCount} {txnCount === 1 ? "transaction" : "transactions"} this month
            {hint ? ` · ${hint}` : ""}
          </Text>
        </View>
        <Pressable
          onPress={onAdd}
          style={({ pressed }) => ({
            paddingHorizontal: 11,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: palette.info,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 11.5, fontWeight: "500", color: palette.brandOn }}>
            Add
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function TagIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d="M3 12V4h8l10 10-8 8L3 12z" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={7.5} cy={7.5} r={1.2} fill={color} />
    </Svg>
  );
}
