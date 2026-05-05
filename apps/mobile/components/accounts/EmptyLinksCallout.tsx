import { Pressable, View } from "react-native";
import { I, Text } from "@cvc/ui";
import { useTheme } from "../../lib/theme";

interface Props {
  onSetUp: () => void;
  onDismiss: () => void;
}

export function EmptyLinksCallout({ onSetUp, onDismiss }: Props) {
  const { palette } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
      <View
        style={{
          backgroundColor: palette.surface,
          borderColor: palette.lineFirm,
          borderWidth: 1,
          borderStyle: "dashed",
          borderRadius: 16,
          padding: 18,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: palette.brandTint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <I.link color={palette.brand} size={16} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14.5, fontWeight: "500", color: palette.ink1 }}>
              Link cards to funding accounts
            </Text>
            <Text
              style={{
                fontSize: 11.5,
                color: palette.ink3,
                fontStyle: "italic",
                marginTop: 1,
              }}
            >
              Optional · adds Effective Available cash
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: palette.ink2, lineHeight: 20, marginBottom: 12 }}>
          When you mark a card as paid by a funding account, ClearView Cash subtracts
          the linked card balance from cash. You always see what&apos;s truly spendable.
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={onSetUp}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 10,
              backgroundColor: palette.brand,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: palette.brandOn, fontWeight: "500", fontSize: 13 }}>
              Set up payment link
            </Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            style={{
              flex: 1,
              height: 38,
              borderRadius: 10,
              borderColor: palette.lineFirm,
              borderWidth: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: palette.ink1, fontWeight: "500", fontSize: 13 }}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
