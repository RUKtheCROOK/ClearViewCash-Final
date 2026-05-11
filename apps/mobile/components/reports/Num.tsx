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

export function fmtMoneyShort(cents: number): string {
  const abs = Math.abs(cents) / 100;
  return `${cents < 0 ? "-" : ""}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function fmtMoneyDollars(cents: number): string {
  const abs = Math.abs(cents) / 100;
  return `${cents < 0 ? "-" : ""}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// K/M-suffixed form for tight callsites (donut center, MoMCompare, callouts).
// Switches to full dollar form below $10,000 so small amounts stay legible.
export function fmtMoneyAbbrev(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents) / 100;
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}$${v >= 10 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (abs >= 10_000) {
    const v = abs / 1_000;
    return `${sign}$${v >= 100 ? v.toFixed(0) : v.toFixed(1)}K`;
  }
  return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
