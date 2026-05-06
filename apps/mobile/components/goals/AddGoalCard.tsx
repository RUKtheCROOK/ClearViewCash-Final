import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";

interface Props {
  palette: Palette;
  onPress: () => void;
}

export function AddGoalCard({ palette, onPress }: Props) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <Pressable
        onPress={onPress}
        android_ripple={{ color: palette.tinted }}
        style={({ pressed }) => ({
          padding: 18,
          borderRadius: 14,
          backgroundColor: palette.surface,
          borderWidth: 1.5,
          borderColor: palette.lineFirm,
          borderStyle: "dashed",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M12 5v14M5 12h14" fill="none" stroke={palette.ink2} strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink2 }}>
          New goal
        </Text>
      </Pressable>
    </View>
  );
}
