import { Text, View, type ViewStyle } from "react-native";
import { fonts, type Palette } from "@cvc/ui";

interface EmptyChartProps {
  palette: Palette;
  label: string;
  height?: number;
  style?: ViewStyle;
}

export function EmptyChart({ palette, label, height, style }: EmptyChartProps) {
  return (
    <View
      style={[
        {
          flex: 1,
          minHeight: height,
          backgroundColor: palette.tinted,
          borderRadius: 8,
          alignItems: "center",
          justifyContent: "center",
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>{label}</Text>
    </View>
  );
}

interface SkeletonChartProps {
  palette: Palette;
  variant: "donut" | "bars" | "area" | "spark";
  height?: number;
}

export function SkeletonChart({ palette, variant, height = 180 }: SkeletonChartProps) {
  if (variant === "donut") {
    return (
      <View style={{ height, alignItems: "center", justifyContent: "center" }}>
        <View
          style={{
            width: 168,
            height: 168,
            borderRadius: 999,
            borderWidth: 32,
            borderColor: palette.tinted,
          }}
        />
      </View>
    );
  }
  if (variant === "bars") {
    const heights = [0.55, 0.78, 0.42, 0.86, 0.62, 0.5];
    return (
      <View
        style={{
          height,
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        {heights.map((h, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: `${Math.round(h * 100)}%`,
              backgroundColor: palette.tinted,
              borderRadius: 4,
            }}
          />
        ))}
      </View>
    );
  }
  if (variant === "area") {
    return (
      <View
        style={{
          height,
          backgroundColor: palette.tinted,
          borderRadius: 8,
          overflow: "hidden",
        }}
      />
    );
  }
  return (
    <View
      style={{
        height,
        backgroundColor: palette.tinted,
        borderRadius: 6,
      }}
    />
  );
}

interface SkeletonLineProps {
  palette: Palette;
  width?: number | string;
  height?: number;
  style?: ViewStyle;
}

export function SkeletonLine({ palette, width = "100%", height = 12, style }: SkeletonLineProps) {
  return (
    <View
      style={[
        {
          width: width as number,
          height,
          backgroundColor: palette.tinted,
          borderRadius: 4,
        },
        style,
      ]}
    />
  );
}
