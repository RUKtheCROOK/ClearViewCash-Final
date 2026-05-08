import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { fonts } from "@cvc/ui";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../lib/theme";
import { Group, PageHeader, Row, SectionLabel } from "../../components/settings/SettingsAtoms";

export default function Profile() {
  const { palette } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    supabase.from("users").select("display_name").maybeSingle().then(({ data }) => setName(data?.display_name ?? ""));
  }, []);

  async function saveName() {
    if (!editValue.trim()) return;
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      await supabase.from("users").update({ display_name: editValue.trim() }).eq("id", u.user.id);
      setName(editValue.trim());
      setEditOpen(false);
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!email) return;
    Alert.alert("Send password reset?", `We'll email a reset link to ${email}.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: async () => {
          try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            Alert.alert("Reset email sent", "Check your inbox.");
          } catch (e) {
            Alert.alert("Couldn't send", e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.canvas }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        <PageHeader palette={palette} title="Profile" onBack={() => router.back()} />

        <SectionLabel palette={palette}>YOUR DETAILS</SectionLabel>
        <Group palette={palette}>
          <Row palette={palette} title="Email" value={email || "—"} right={null} />
          <Row
            palette={palette}
            title="Display name"
            value={name || "Set a name"}
            onPress={() => {
              setEditValue(name);
              setEditOpen(true);
            }}
          />
          <Row
            palette={palette}
            title="Profile photo"
            sub="Coming soon — upload an image to use across the app."
            value="Add"
            right={null}
            last
          />
        </Group>

        <SectionLabel palette={palette}>PASSWORD</SectionLabel>
        <Group palette={palette}>
          <Row palette={palette} title="Change password" sub="We'll email you a reset link." onPress={resetPassword} last />
        </Group>
      </ScrollView>

      <Modal visible={editOpen} transparent animationType="fade" onRequestClose={() => setEditOpen(false)}>
        <Pressable onPress={() => setEditOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 }}>
          <Pressable onPress={(e) => e.stopPropagation()} style={{ backgroundColor: palette.surface, borderRadius: 18, padding: 18, gap: 12 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 18, fontWeight: "500", color: palette.ink1 }}>Display name</Text>
            <TextInput
              value={editValue}
              onChangeText={setEditValue}
              autoFocus
              placeholder="Your name"
              placeholderTextColor={palette.ink4}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: palette.surface,
                borderWidth: 1,
                borderColor: palette.line,
                fontFamily: fonts.ui,
                fontSize: 14,
                color: palette.ink1,
              }}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable onPress={() => setEditOpen(false)} style={{ flex: 1, height: 42, borderRadius: 10, borderWidth: 1, borderColor: palette.lineFirm, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink2 }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveName}
                disabled={busy || !editValue.trim()}
                style={{ flex: 1, height: 42, borderRadius: 10, backgroundColor: palette.brand, alignItems: "center", justifyContent: "center", opacity: busy || !editValue.trim() ? 0.5 : 1 }}
              >
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.brandOn }}>{busy ? "Saving…" : "Save"}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
