import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { fonts, type Palette, type ThemeMode } from "@cvc/ui";
import { Si } from "./settingsGlyphs";
import { ProChip } from "./SettingsAtoms";

interface SpaceCardProps {
  name: string;
  sub: string;
  hue: number;
  role: "OWNER" | "MEMBER";
  members: number;
  active?: boolean;
  solo?: boolean;
  mode?: ThemeMode;
  palette: Palette;
  onPress?: () => void;
  right?: ReactNode;
}

export function SpaceCard({ name, sub, hue, role, members, active, solo, mode = "light", palette, onPress, right }: SpaceCardProps) {
  const wash = mode === "dark" ? `oklch(28% 0.045 ${hue})` : `oklch(94% 0.026 ${hue})`;
  const fg = mode === "dark" ? `oklch(82% 0.080 ${hue})` : `oklch(36% 0.062 ${hue})`;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: palette.tinted }}
      style={({ pressed }) => ({
        width: "100%",
        padding: 14,
        borderRadius: 14,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: active ? fg : palette.line,
        borderLeftWidth: active ? 3 : 1,
        borderLeftColor: fg,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: wash,
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: fg }} />
        {active ? (
          <View
            style={{
              position: "absolute",
              bottom: -3,
              right: -3,
              width: 14,
              height: 14,
              borderRadius: 999,
              backgroundColor: palette.surface,
              borderWidth: 2,
              borderColor: palette.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: palette.pos }} />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14.5, fontWeight: "500", color: palette.ink1 }} numberOfLines={1}>
            {name}
          </Text>
          {active ? <ProChip palette={palette} tone="pos">ACTIVE</ProChip> : null}
        </View>
        <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, marginTop: 2 }} numberOfLines={1}>
          {sub}
        </Text>
        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ProChip palette={palette} tone={role === "OWNER" ? "brand" : "muted"}>{role}</ProChip>
          {!solo ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={{ flexDirection: "row" }}>
                {Array.from({ length: Math.min(3, members) }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      backgroundColor: ["oklch(85% 0.060 30)", "oklch(85% 0.060 195)", "oklch(85% 0.060 270)"][i],
                      borderWidth: 1.5,
                      borderColor: palette.surface,
                      marginLeft: i === 0 ? 0 : -4,
                    }}
                  />
                ))}
              </View>
              <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3 }}>
                {members} {members === 1 ? "member" : "members"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {right}
        {Si.chevR(palette.ink3)}
      </View>
    </Pressable>
  );
}
