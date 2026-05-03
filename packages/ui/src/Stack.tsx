import { View, type ViewProps, type ViewStyle, type StyleProp } from "react-native";
import { space as spacing } from "./theme";

type SpaceKey = keyof typeof spacing;

export interface StackProps extends ViewProps {
  direction?: "row" | "column";
  gap?: SpaceKey;
  align?: ViewStyle["alignItems"];
  justify?: ViewStyle["justifyContent"];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Stack({ direction = "column", gap = "md", align, justify, wrap, style, ...rest }: StackProps) {
  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: direction,
          gap: spacing[gap],
          alignItems: align,
          justifyContent: justify,
          flexWrap: wrap ? "wrap" : "nowrap",
        },
        style,
      ]}
    />
  );
}

export function HStack(props: Omit<StackProps, "direction">) {
  return <Stack {...props} direction="row" />;
}
