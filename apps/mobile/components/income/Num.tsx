import { Text, type StyleProp, type TextStyle } from "react-native";
import { fonts } from "@cvc/ui";

export function Num({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Text
      style={[
        {
          fontFamily: fonts.num,
          fontVariant: ["tabular-nums"],
          letterSpacing: -0.1,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** Formats cents as $X,XXX (no decimals) — matches the design's main display style. */
export function fmtMoneyShort(cents: number): string {
  const abs = Math.abs(cents) / 100;
  return `${cents < 0 ? "-" : ""}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/** Formats cents as $X,XXX.XX — used in deposit history list. */
export function fmtMoneyDollars(cents: number): string {
  const abs = Math.abs(cents) / 100;
  return `${cents < 0 ? "-" : ""}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "$1,200–$2,800" range string for variable income. */
export function fmtMoneyRange(lowCents: number, highCents: number): string {
  return `${fmtMoneyShort(lowCents)}–${fmtMoneyShort(highCents)}`;
}
