import type { TextStyle, StyleProp } from "react-native";
import { Text } from "./Text";
import { colors } from "./theme";

export interface MoneyProps {
  cents: number | null | undefined;
  currency?: string;
  showSign?: boolean;
  positiveColor?: boolean;
  style?: StyleProp<TextStyle>;
}

export function Money({ cents, currency = "USD", showSign = false, positiveColor = false, style }: MoneyProps) {
  if (cents == null) return <Text style={style}>—</Text>;
  const dollars = cents / 100;
  const formatted = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Math.abs(dollars));
  const sign = cents < 0 ? "−" : showSign ? "+" : "";
  const color = positiveColor ? (cents < 0 ? colors.negative : cents > 0 ? colors.positive : colors.text) : undefined;
  return <Text style={[{ fontVariant: ["tabular-nums"], color }, style]}>{sign}{formatted}</Text>;
}

export function formatCents(cents: number | null | undefined, currency = "USD"): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
