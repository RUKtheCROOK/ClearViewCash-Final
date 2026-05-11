import { Pressable, View } from "react-native";
import { BottomSheet, I, Text } from "@cvc/ui";
import { useTheme } from "../../lib/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function EffectiveAvailableInfoSheet({ visible, onClose }: Props) {
  const { palette } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} palette={palette}>
      <View
        style={{
          backgroundColor: palette.surface,
          paddingHorizontal: 20,
          paddingTop: 4,
          paddingBottom: 28,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: palette.brandTint,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <I.link color={palette.brand} size={16} />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "500", color: palette.ink1 }}>
              Effective Available
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <I.close color={palette.ink2} size={18} />
          </Pressable>
        </View>
        <Text style={{ fontSize: 13.5, color: palette.ink2, lineHeight: 21 }}>
          We subtract the balance of every linked credit card from this cash account. Effective Available is what's
          truly spendable once you cover those cards.
        </Text>
        <View
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 12,
            backgroundColor: palette.sunken,
            gap: 8,
          }}
        >
          <Row label="Available balance" value="$2,400.00" palette={palette} />
          <Row label="Linked card balances" value="−$640.00" palette={palette} negative />
          <View style={{ height: 1, backgroundColor: palette.line, marginVertical: 2 }} />
          <Row label="Effective available" value="$1,760.00" palette={palette} bold />
        </View>
        <Text style={{ fontSize: 11.5, color: palette.ink3, marginTop: 12, lineHeight: 17 }}>
          Set up payment links from any credit card row to control which card a funding account covers.
        </Text>
      </View>
    </BottomSheet>
  );
}

function Row({
  label,
  value,
  palette,
  bold,
  negative,
}: {
  label: string;
  value: string;
  palette: ReturnType<typeof useTheme>["palette"];
  bold?: boolean;
  negative?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 12.5, color: bold ? palette.ink1 : palette.ink2, fontWeight: bold ? "500" : "400" }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: bold ? "600" : "500",
          color: negative ? palette.warn : palette.ink1,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
