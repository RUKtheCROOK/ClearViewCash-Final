// Circular initial badge tinted by hue. Used for shared-row indicators and
// PersonChip in the activity filter panel.

import { Text, View } from "react-native";
import { fonts } from "./theme";

interface Props {
  initial: string;
  bg: string;
  fg: string;
  size?: number;
}

export function Avatar({ initial, bg, fg, size = 14 }: Props) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        backgroundColor: bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{
          color: fg,
          fontFamily: fonts.uiSemibold,
          fontSize: Math.round(size * 0.62),
          fontWeight: "600",
          lineHeight: size,
        }}
      >
        {initial.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
