import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fonts } from "@cvc/ui";
import { supabase } from "../../../lib/supabase";
import { useTheme } from "../../../lib/theme";
import { Group, PageHeader, Row, SectionLabel } from "../../../components/settings/SettingsAtoms";

interface Item {
  id: string;
  institution_name: string | null;
  status: string;
}

export default function Connected() {
  const { palette } = useTheme();
  const [items, setItems] = useState<Item[]>([]);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("plaid_items")
      .select("id, institution_name, status")
      .order("institution_name", { ascending: true });
    setItems((data ?? []) as Item[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <PageHeader palette={palette} title="Connected Services" onBack={() => router.back()} />

        <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 12 }}>
          <Text style={{ fontFamily: fonts.ui, fontSize: 12, color: palette.ink3, lineHeight: 17 }}>
            Plaid connections to your financial institutions. Tap one to manage accounts or disconnect.
          </Text>
        </View>

        <SectionLabel palette={palette}>INSTITUTIONS</SectionLabel>
        <Group palette={palette}>
          {items.length === 0 ? (
            <Row palette={palette} title="No connected services" sub="Link a bank from the Accounts tab to get started." right={null} last />
          ) : (
            items.map((i, idx) => (
              <Row
                key={i.id}
                palette={palette}
                title={i.institution_name ?? "Unknown bank"}
                sub={i.status === "good" ? "Syncing normally" : "Needs reauth"}
                value={i.status === "good" ? "Healthy" : "Issue"}
                right={null}
                onPress={() => router.push({ pathname: "/settings/connected/[id]", params: { id: i.id } })}
                last={idx === items.length - 1}
              />
            ))
          )}
        </Group>
      </ScrollView>
    </View>
  );
}
