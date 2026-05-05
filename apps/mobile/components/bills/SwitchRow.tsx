import { Switch, Text, View } from "react-native";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";

interface Props {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  last?: boolean;
  disabled?: boolean;
  palette: Palette;
}

export function SwitchRow({ icon, title, subtitle, on, onToggle, last, disabled, palette }: Props) {
  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.line,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: palette.tinted,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>{title}</Text>
        {subtitle ? (
          <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, marginTop: 2 }}>{subtitle}</Text>
        ) : null}
      </View>
      <Switch
        value={on}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: palette.tinted, true: palette.brand }}
        thumbColor={palette.surface}
        ios_backgroundColor={palette.tinted}
      />
    </View>
  );
}
