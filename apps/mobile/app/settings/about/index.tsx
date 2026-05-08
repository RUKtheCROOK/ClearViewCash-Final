import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { fonts } from "@cvc/ui";
import { useApp } from "../../../lib/store";
import { useTheme } from "../../../lib/theme";
import { Group, PageHeader, Row, SectionLabel } from "../../../components/settings/SettingsAtoms";

const VERSION = (Constants.expoConfig?.version as string | undefined) ?? "2.4.1";

export default function AboutHub() {
  const { palette, mode } = useTheme();
  const themeMode = useApp((s) => s.themeMode);
  const setThemeMode = useApp((s) => s.setThemeMode);

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <PageHeader palette={palette} title="About" onBack={() => router.back()} />

        <SectionLabel palette={palette}>APP</SectionLabel>
        <Group palette={palette}>
          <Row palette={palette} title="Version" value={`v${VERSION}`} right={null} />
          <Row palette={palette} title="Resolved theme" value={mode === "dark" ? "Dark" : "Light"} right={null} last />
        </Group>

        <SectionLabel palette={palette}>APPEARANCE</SectionLabel>
        <Group palette={palette}>
          <View style={{ paddingHorizontal: 18, paddingVertical: 14, gap: 10 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14, fontWeight: "500", color: palette.ink1 }}>Theme</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {(["system", "light", "dark"] as const).map((m) => {
                const active = themeMode === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setThemeMode(m)}
                    style={{
                      flex: 1,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: active ? palette.brand : palette.tinted,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontFamily: fonts.uiMedium, fontSize: 12.5, fontWeight: "500", color: active ? palette.brandOn : palette.ink2, textTransform: "capitalize" }}>
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Group>

        <SectionLabel palette={palette}>LEGAL</SectionLabel>
        <Group palette={palette}>
          <Row palette={palette} title="Terms of Service" onPress={() => Linking.openURL("https://clearviewcash.com/terms")} />
          <Row palette={palette} title="Privacy Policy" onPress={() => Linking.openURL("https://clearviewcash.com/privacy")} />
          <Row palette={palette} title="Open source licenses" sub="Coming soon." right={null} last />
        </Group>

        <View style={{ paddingTop: 18, alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.numMedium, fontSize: 10, color: palette.ink4, letterSpacing: 0.6 }}>
            CLEAR VIEW CASH · v{VERSION}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
