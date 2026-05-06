import { Pressable, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";

interface Props {
  palette: Palette;
  name: string;
  detail: string;
  onView?: () => void;
}

export function JustReachedBanner({ palette, name, detail, onView }: Props) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
      <View
        style={{
          position: "relative",
          overflow: "hidden",
          padding: 14,
          borderRadius: 14,
          backgroundColor: palette.posTint,
          borderWidth: 1,
          borderColor: palette.posTint,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View style={{ position: "absolute", right: 0, top: 0, opacity: 0.35 }} pointerEvents="none">
          <Svg width={80} height={60} viewBox="0 0 80 60">
            <Circle cx={20} cy={14} r={1.5} fill={palette.pos} />
            <Circle cx={38} cy={8} r={1} fill={palette.pos} />
            <Circle cx={60} cy={18} r={1.8} fill={palette.pos} />
            <Circle cx={72} cy={38} r={1.2} fill={palette.pos} />
            <Path d="M55 4l1.5 3 3 1.5-3 1.5L55 13l-1.5-3-3-1.5 3-1.5z" fill={palette.pos} />
          </Svg>
        </View>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            backgroundColor: palette.pos,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path
              d="M5 12l4 4 10-10"
              fill="none"
              stroke={palette.surface}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink1 }} numberOfLines={1}>
            You reached &quot;{name}&quot;
          </Text>
          <Text style={{ marginTop: 2, fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink2 }} numberOfLines={1}>
            {detail}
          </Text>
        </View>
        {onView ? (
          <Pressable
            onPress={onView}
            style={({ pressed }) => ({
              paddingHorizontal: 11,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: palette.pos,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 11.5, fontWeight: "500", color: palette.surface }}>
              View
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
