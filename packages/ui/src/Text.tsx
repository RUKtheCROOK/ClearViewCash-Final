import { Text as RNText, type TextProps as RNTextProps, type StyleProp, type TextStyle } from "react-native";
import { colors, fontSize } from "./theme";

type Variant = "body" | "muted" | "title" | "h1" | "h2" | "label";

export interface TextProps extends RNTextProps {
  variant?: Variant;
  style?: StyleProp<TextStyle>;
}

const variantStyles: Record<Variant, TextStyle> = {
  body: { fontSize: fontSize.md, color: colors.text },
  muted: { fontSize: fontSize.sm, color: colors.textMuted },
  title: { fontSize: fontSize.lg, color: colors.text, fontWeight: "600" },
  h1: { fontSize: fontSize.xxl, color: colors.text, fontWeight: "700" },
  h2: { fontSize: fontSize.xl, color: colors.text, fontWeight: "600" },
  label: { fontSize: fontSize.xs, color: colors.textMuted, letterSpacing: 0.5, textTransform: "uppercase" },
};

export function Text({ variant = "body", style, ...rest }: TextProps) {
  return <RNText {...rest} style={[variantStyles[variant], style]} />;
}
