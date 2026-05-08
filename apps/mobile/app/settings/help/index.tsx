import { Linking, ScrollView, View } from "react-native";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { Group, PageHeader, Row, SectionLabel } from "../../../components/settings/SettingsAtoms";

const VERSION = (Constants.expoConfig?.version as string | undefined) ?? "2.4.1";

export default function HelpHub() {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <PageHeader palette={palette} title="Help & Support" onBack={() => router.back()} />

        <SectionLabel palette={palette}>GET HELP</SectionLabel>
        <Group palette={palette}>
          <Row palette={palette} title="FAQ" sub="Common questions, answered." onPress={() => Linking.openURL("https://clearviewcash.com/faq")} />
          <Row palette={palette} title="Contact support" sub="Email us — we usually reply within a business day." onPress={() => Linking.openURL("mailto:support@clearviewcash.com")} />
          <Row
            palette={palette}
            title="Send feedback"
            sub="Bugs, ideas, requests."
            onPress={() => Linking.openURL(`mailto:feedback@clearviewcash.com?subject=Feedback%20·%20v${VERSION}`)}
            last
          />
        </Group>
      </ScrollView>
    </View>
  );
}
