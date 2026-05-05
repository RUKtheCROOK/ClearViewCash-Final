import {
  Text as RNText,
  type TextProps as RNTextProps,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { colors, fonts, fontSize, lightPalette } from "./theme";

type Variant =
  // Legacy variants (kept compiling)
  | "body"
  | "muted"
  | "title"
  | "h1"
  | "h2"
  | "label"
  // New design scale
  | "display"
  | "h3"
  | "lead"
  | "small"
  | "micro"
  | "cap"
  | "eyebrow";

export interface TextProps extends RNTextProps {
  variant?: Variant;
  style?: StyleProp<TextStyle>;
}

const variantStyles: Record<Variant, TextStyle> = {
  // Legacy
  body: { fontSize: fontSize.body, color: colors.text },
  muted: { fontSize: fontSize.small, color: lightPalette.ink3 },
  title: { fontSize: fontSize.lead, color: colors.text, fontWeight: "500" },
  h1: { fontSize: fontSize.h1, color: colors.text, fontWeight: "500", letterSpacing: -0.6 },
  h2: { fontSize: fontSize.h2, color: colors.text, fontWeight: "500", letterSpacing: -0.4 },
  label: {
    fontSize: fontSize.cap,
    color: lightPalette.ink2,
    fontWeight: "500",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  // New scale
  display: {
    fontSize: fontSize.display,
    color: colors.text,
    fontWeight: "500",
    letterSpacing: -1.1,
    lineHeight: 46,
  },
  h3: { fontSize: fontSize.h3, color: colors.text, fontWeight: "500", letterSpacing: -0.2 },
  lead: { fontSize: fontSize.lead, color: colors.text, fontWeight: "500" },
  small: { fontSize: fontSize.small, color: lightPalette.ink2 },
  micro: { fontSize: fontSize.micro, color: lightPalette.ink3 },
  cap: { fontSize: fontSize.cap, color: lightPalette.ink3 },
  // Eyebrow = small uppercase label used above section titles in the design
  eyebrow: {
    fontSize: fontSize.cap,
    color: lightPalette.ink2,
    fontWeight: "500",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
};

export function Text({ variant = "body", style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        { fontFamily: fonts.ui as string | undefined },
        variantStyles[variant],
        style,
      ]}
    />
  );
}
