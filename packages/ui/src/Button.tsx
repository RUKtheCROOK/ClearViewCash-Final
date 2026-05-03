import { Pressable, View, type PressableProps, type ViewStyle, type StyleProp } from "react-native";
import { Text } from "./Text";
import { colors, radius, space } from "./theme";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

export interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const variantBg: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.surface,
  ghost: "transparent",
  destructive: colors.negative,
};
const variantText: Record<Variant, string> = {
  primary: "#FFFFFF",
  secondary: colors.text,
  ghost: colors.primary,
  destructive: "#FFFFFF",
};
const variantBorder: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.border,
  ghost: "transparent",
  destructive: colors.negative,
};

export function Button({ label, variant = "primary", loading, disabled, style, ...rest }: ButtonProps) {
  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          paddingVertical: space.md,
          paddingHorizontal: space.lg,
          borderRadius: radius.md,
          backgroundColor: variantBg[variant],
          borderColor: variantBorder[variant],
          borderWidth: 1,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          alignItems: "center",
        },
        style as ViewStyle,
      ]}
    >
      <View>
        <Text style={{ color: variantText[variant], fontWeight: "600" }}>
          {loading ? "…" : label}
        </Text>
      </View>
    </Pressable>
  );
}
