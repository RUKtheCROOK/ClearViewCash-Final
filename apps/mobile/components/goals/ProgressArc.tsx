import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import type { Palette } from "@cvc/ui";

interface ArcProps {
  palette: Palette;
  fraction: number;
  size?: number;
  thickness?: number;
  color?: string;
}

export function ProgressArc({ palette, fraction, size = 92, thickness = 6, color }: ArcProps) {
  const r = (size - thickness * 2) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));
  const dash = clamped * c;
  const stroke = color ?? palette.brand;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={palette.tinted} strokeWidth={thickness} />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={thickness}
        strokeDasharray={`${dash} ${c}`}
        strokeDashoffset={c / 4}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

interface BarProps {
  palette: Palette;
  fraction: number;
  height?: number;
  color?: string;
}

export function GoalProgressBar({ palette, fraction, height = 8, color }: BarProps) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <View
      style={{
        height,
        borderRadius: 999,
        backgroundColor: palette.tinted,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          width: `${pct}%`,
          height: "100%",
          backgroundColor: color ?? palette.brand,
          opacity: 0.85,
        }}
      />
    </View>
  );
}
