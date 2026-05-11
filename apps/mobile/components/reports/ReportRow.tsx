import { Pressable, Text, View } from "react-native";
import { fonts, type Palette } from "@cvc/ui";
import { ChevRightIcon, ReportIcon, StarIcon, type ReportKind } from "./reportGlyphs";

interface Props {
  palette: Palette;
  mode: "light" | "dark";
  kind: ReportKind;
  hue: number;
  title: string;
  sub: string;
  meta: string;
  starred?: boolean;
  comingSoon?: boolean;
  last?: boolean;
  onPress: () => void;
}

export function ReportRow({
  palette,
  mode,
  kind,
  hue,
  title,
  sub,
  meta,
  starred,
  comingSoon,
  last,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={comingSoon}
      style={{
        paddingHorizontal: 18,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: palette.line,
        opacity: comingSoon ? 0.55 : 1,
      }}
    >
      <ReportIcon kind={kind} hue={hue} mode={mode} size={36} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 14,
              color: palette.ink1,
              fontWeight: "500",
            }}
          >
            {title}
          </Text>
          {starred ? <StarIcon color={palette.accent} filled /> : null}
          {comingSoon ? (
            <View
              style={{
                paddingHorizontal: 7,
                paddingVertical: 1,
                borderRadius: 999,
                backgroundColor: palette.tinted,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.num,
                  fontSize: 9,
                  color: palette.ink3,
                  letterSpacing: 0.6,
                  fontWeight: "600",
                }}
              >
                SOON
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, color: palette.ink3, marginTop: 1 }}>{sub}</Text>
      </View>
      <Text
        style={{
          fontFamily: fonts.num,
          fontSize: 10.5,
          color: palette.ink3,
          letterSpacing: 0.4,
        }}
      >
        {meta}
      </Text>
      <ChevRightIcon color={palette.ink3} />
    </Pressable>
  );
}
