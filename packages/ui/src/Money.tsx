import type { TextStyle, StyleProp } from "react-native";
import { Text } from "./Text";
import { Text as RNText } from "react-native";
import { colors, fonts, lightPalette } from "./theme";

export interface MoneyProps {
  cents: number | null | undefined;
  currency?: string;
  showSign?: boolean;
  positiveColor?: boolean;
  /** Render dollars and cents in separate spans so cents can be tinted (matches the design hero balance). */
  splitCents?: boolean;
  style?: StyleProp<TextStyle>;
  centsStyle?: StyleProp<TextStyle>;
}

export function Money({
  cents,
  currency = "USD",
  showSign = false,
  positiveColor = false,
  splitCents = false,
  style,
  centsStyle,
}: MoneyProps) {
  if (cents == null) return <Text style={style}>—</Text>;
  const dollars = cents / 100;
  const sign = cents < 0 ? "−" : showSign ? "+" : "";
  const color = positiveColor
    ? cents < 0
      ? colors.negative
      : cents > 0
        ? colors.positive
        : colors.text
    : undefined;

  const baseStyle: TextStyle = {
    fontFamily: fonts.num,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.1,
    color,
  };

  if (!splitCents) {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(Math.abs(dollars));
    return <Text style={[baseStyle, style]}>{sign}{formatted}</Text>;
  }

  // Split form: "−$4,128" + ".42"
  const abs = Math.abs(dollars);
  const dollarsPart = Math.floor(abs);
  const centsPart = Math.round((abs - dollarsPart) * 100)
    .toString()
    .padStart(2, "0");
  const symbol = currency === "USD" ? "$" : "";
  const dollarsFormatted = dollarsPart.toLocaleString("en-US");

  return (
    <RNText style={[baseStyle, style] as StyleProp<TextStyle>}>
      <RNText>{sign}{symbol}{dollarsFormatted}</RNText>
      <RNText style={[{ color: lightPalette.ink3 }, centsStyle]}>.{centsPart}</RNText>
    </RNText>
  );
}

export function formatCents(cents: number | null | undefined, currency = "USD"): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
