import { Pressable, Text, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";

export type BillsViewMode = "list" | "calendar";

export function ViewToggle({
  value,
  onChange,
  palette,
}: {
  value: BillsViewMode;
  onChange: (v: BillsViewMode) => void;
  palette: Palette;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        padding: 3,
        backgroundColor: palette.tinted,
        borderRadius: 999,
        gap: 2,
        alignSelf: "flex-start",
      }}
    >
      <Btn label="List" active={value === "list"} onPress={() => onChange("list")} palette={palette} icon={<ListIcon color={value === "list" ? palette.ink1 : palette.ink3} />} />
      <Btn label="Calendar" active={value === "calendar"} onPress={() => onChange("calendar")} palette={palette} icon={<CalIcon color={value === "calendar" ? palette.ink1 : palette.ink3} />} />
    </View>
  );
}

function Btn({
  label,
  active,
  onPress,
  palette,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  palette: Palette;
  icon: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: active ? palette.surface : "transparent",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      {icon}
      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: active ? palette.ink1 : palette.ink2 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ListIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d="M4 6h16M4 12h16M4 18h10" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function CalIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Rect x={3} y={5} width={18} height={16} rx={2} fill="none" stroke={color} strokeWidth={1.8} />
      <Path d="M3 9h18M8 3v4M16 3v4" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
