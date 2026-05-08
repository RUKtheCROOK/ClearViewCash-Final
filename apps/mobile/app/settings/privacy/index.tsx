import { Alert, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "../../../lib/theme";
import { Group, PageHeader, Row, SectionLabel } from "../../../components/settings/SettingsAtoms";

export default function PrivacyHub() {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <PageHeader palette={palette} title="Privacy & Data" onBack={() => router.back()} />

        <SectionLabel palette={palette} sub="Control what we keep, what you can take with you, and how to leave.">
          YOUR DATA
        </SectionLabel>
        <Group palette={palette}>
          <Row
            palette={palette}
            title="Export your data"
            sub="We'll email you a JSON archive of accounts, transactions, budgets, goals, bills."
            onPress={() => Alert.alert("Coming soon", "Data export will email you a JSON archive. Contact support for an early export.")}
          />
          <Row
            palette={palette}
            title="Data retention"
            sub="We keep account history for as long as your account is open. Closed accounts retain 90 days for support."
            right={null}
            last
          />
        </Group>

        <SectionLabel palette={palette}>SHARING DEFAULTS</SectionLabel>
        <Group palette={palette}>
          <Row palette={palette} title="Per-space sharing rules" sub="Defaults for what new shares allow." onPress={() => router.push("/settings/spaces")} last />
        </Group>

        <SectionLabel palette={palette}>DANGER ZONE</SectionLabel>
        <Group palette={palette}>
          <Row
            palette={palette}
            title="Delete account"
            sub="Permanently removes everything you own."
            danger
            onPress={() => router.push("/settings/delete-account")}
            last
          />
        </Group>
      </ScrollView>
    </View>
  );
}
