// Monospaced amount renderer with whole/cents split. Mobile uses Text from
// react-native; the fontVariant 'tabular-nums' ensures column alignment.

import { Text, type TextStyle } from "react-native";
import { fonts } from "./theme";

interface Props {
  cents: number;
  showSign?: boolean;
  signPositive?: string;
  signNegative?: string;
  color?: string;
  centsColor?: string;
  fontSize?: number;
  fontWeight?: TextStyle["fontWeight"];
  letterSpacing?: number;
  italic?: boolean;
  style?: TextStyle;
}

export function TxNum({
  cents,
  showSign = true,
  signPositive = "+$",
  signNegative = "−$",
  color,
  centsColor,
  fontSize = 15,
  fontWeight = "500",
  letterSpacing = -0.2,
  italic,
  style,
}: Props) {
  const isNeg = cents < 0;
  const abs = Math.abs(cents) / 100;
  const dollars = Math.floor(abs).toLocaleString("en-US");
  const fraction = (abs - Math.floor(abs)).toFixed(2).slice(2);
  const prefix = showSign ? (isNeg ? signNegative : signPositive) : "$";

  return (
    <Text
      style={[
        {
          fontFamily: fonts.numMedium,
          fontVariant: ["tabular-nums"],
          fontSize,
          fontWeight,
          letterSpacing,
          color: color ?? "#000",
          fontStyle: italic ? "italic" : "normal",
        },
        style,
      ]}
    >
      {prefix}
      {dollars}
      <Text style={{ color: centsColor ?? color, fontWeight: "400" }}>
        .{fraction}
      </Text>
    </Text>
  );
}
