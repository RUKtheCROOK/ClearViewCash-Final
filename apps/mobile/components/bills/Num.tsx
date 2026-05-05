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

export function fmtMoneyDollars(cents: number): string {
  const abs = Math.abs(cents) / 100;
  return `${cents < 0 ? "-" : ""}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
