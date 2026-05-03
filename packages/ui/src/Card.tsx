import { View, type ViewProps, type ViewStyle, type StyleProp } from "react-native";
import { colors, radius, space } from "./theme";

export interface CardProps extends ViewProps {
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ padded = true, style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: padded ? space.lg : 0,
        },
        style,
      ]}
    />
  );
}
