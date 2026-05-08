import { Pressable, Text, View } from "react-native";
import { fonts, type Palette } from "@cvc/ui";
import { Si } from "./settingsGlyphs";

interface MemberRowProps {
  initials: string;
  name: string;
  sub: string;
  hue: number;
  isYou?: boolean;
  role?: "owner" | "editor" | "viewer";
  onChangeRole?: () => void;
  palette: Palette;
}

export function MemberRow({ initials, name, sub, hue, isYou, role = "editor", onChangeRole, palette }: MemberRowProps) {
  return (
    <View style={{ paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          backgroundColor: `oklch(85% 0.060 ${hue})`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12, fontWeight: "500", color: `oklch(30% 0.060 ${hue})` }}>
          {initials}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }} numberOfLines={1}>
          {name}
        </Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3, marginTop: 1 }} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      {isYou ? (
        <Text style={{ fontFamily: fonts.numMedium, fontSize: 10, color: palette.ink3, letterSpacing: 0.6, fontWeight: "600" }}>
          YOU
        </Text>
      ) : (
        <Pressable
          onPress={onChangeRole}
          style={{
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: palette.tinted,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 11.5, fontWeight: "500", color: palette.ink2, textTransform: "capitalize" }}>
            {role}
          </Text>
          {Si.chevD(palette.ink3)}
        </Pressable>
      )}
    </View>
  );
}
