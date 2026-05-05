import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { I, Text } from "@cvc/ui";
import { useTheme } from "../../lib/theme";

interface Props {
  title: string;
  action?: string;
  onActionPress?: () => void;
  children: ReactNode;
}

export function Module({ title, action, onActionPress, children }: Props) {
  const { palette } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 10,
          paddingHorizontal: 4,
        }}
      >
        <Text variant="eyebrow" style={{ color: palette.ink2 }}>
          {title}
        </Text>
        {action ? (
          <Pressable onPress={onActionPress} hitSlop={8}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text variant="small" style={{ color: palette.ink2, fontWeight: "500" }}>
                {action}
              </Text>
              <I.chevR color={palette.ink2} />
            </View>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
