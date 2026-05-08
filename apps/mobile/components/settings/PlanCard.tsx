import { Pressable, Text, View } from "react-native";
import { fonts, type Palette } from "@cvc/ui";
import { Si } from "./settingsGlyphs";

interface PlanCardProps {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  current?: boolean;
  upsell?: boolean;
  outline?: boolean;
  cta?: string;
  save?: string;
  disabled?: boolean;
  onPress?: () => void;
  palette: Palette;
}

export function PlanCard({ name, price, cadence, features, current, upsell, outline, cta, save, disabled, onPress, palette }: PlanCardProps) {
  return (
    <View
      style={{
        flexShrink: 0,
        width: 240,
        padding: 14,
        borderRadius: 14,
        backgroundColor: current ? palette.brandTint : upsell ? palette.accentTint : palette.surface,
        borderWidth: current || upsell ? 1.5 : 1,
        borderColor: current ? palette.brand : upsell ? palette.accent : palette.line,
        gap: 8,
        position: "relative",
      }}
    >
      {current ? (
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: palette.brand,
          }}
        >
          <Text style={{ fontFamily: fonts.numMedium, fontSize: 9, color: palette.brandOn, fontWeight: "600", letterSpacing: 0.6 }}>
            CURRENT
          </Text>
        </View>
      ) : null}
      {save && !current ? (
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 999,
            backgroundColor: palette.accent,
          }}
        >
          <Text style={{ fontFamily: fonts.numMedium, fontSize: 9, color: "white", fontWeight: "600", letterSpacing: 0.6 }}>
            {save.toUpperCase()}
          </Text>
        </View>
      ) : null}
      <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>{name}</Text>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
        <Text style={{ fontFamily: fonts.numMedium, fontSize: 24, fontWeight: "600", color: palette.ink1, letterSpacing: -0.5 }}>
          {price}
        </Text>
        <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>{cadence}</Text>
      </View>
      <View style={{ gap: 6 }}>
        {features.map((f, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
            <View style={{ marginTop: 3 }}>{Si.check(current ? palette.brand : palette.ink3)}</View>
            <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink2, lineHeight: 17, flex: 1 }}>{f}</Text>
          </View>
        ))}
      </View>
      {!current ? (
        <Pressable
          onPress={onPress}
          disabled={disabled}
          style={{
            marginTop: 4,
            height: 38,
            borderRadius: 10,
            backgroundColor: outline ? "transparent" : upsell ? palette.accent : palette.brand,
            borderWidth: outline ? 1 : 0,
            borderColor: outline ? palette.lineFirm : "transparent",
            alignItems: "center",
            justifyContent: "center",
            opacity: disabled ? 0.55 : 1,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 12.5,
              fontWeight: "500",
              color: outline ? palette.ink1 : "white",
            }}
          >
            {cta || "Switch"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
