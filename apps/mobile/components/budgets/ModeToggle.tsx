import { Pressable, Text, View } from "react-native";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { haptics } from "../../lib/haptics";

export type BudgetMode = "monthly" | "paycheck";

interface Props {
  palette: Palette;
  value: BudgetMode;
  onChange: (v: BudgetMode) => void;
}

export function ModeToggle({ palette, value, onChange }: Props) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 8 }}>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: palette.surface,
          borderColor: palette.line,
          borderWidth: 1,
          borderRadius: 999,
          padding: 4,
          gap: 4,
        }}
      >
        <Segment
          palette={palette}
          label="Monthly"
          active={value === "monthly"}
          onPress={() => {
            if (value !== "monthly") haptics.selection();
            onChange("monthly");
          }}
        />
        <Segment
          palette={palette}
          label="Paycheck"
          active={value === "paycheck"}
          onPress={() => {
            if (value !== "paycheck") haptics.selection();
            onChange("paycheck");
          }}
        />
      </View>
    </View>
  );
}

function Segment({
  palette,
  label,
  active,
  onPress,
}: {
  palette: Palette;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        flex: 1,
        height: 32,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? palette.brand : "transparent",
      }}
    >
      <Text
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 13,
          fontWeight: "600",
          color: active ? palette.brandOn : palette.ink2,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
