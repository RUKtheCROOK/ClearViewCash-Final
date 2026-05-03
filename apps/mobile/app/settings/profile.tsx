import { useEffect, useState } from "react";
import { ScrollView, TextInput } from "react-native";
import { Button, Card, Stack, Text, colors, radius, space } from "@cvc/ui";
import { supabase } from "../../lib/supabase";

export default function Profile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
    supabase.from("users").select("display_name").maybeSingle().then(({ data }) => setName(data?.display_name ?? ""));
  }, []);

  async function save() {
    await supabase.from("users").update({ display_name: name }).eq("id", (await supabase.auth.getUser()).data.user!.id);
    alert("Saved");
  }

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="md">
          <Text variant="label">Email</Text>
          <Text>{email}</Text>
          <Text variant="label">Display name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md }}
          />
          <Button label="Save" onPress={save} />
        </Stack>
      </Card>
    </ScrollView>
  );
}
