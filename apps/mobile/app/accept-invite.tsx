import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, Stack, Text, colors, radius, space } from "@cvc/ui";
import { claimInvitation } from "@cvc/api-client";
import { supabase } from "../lib/supabase";
import { useApp } from "../lib/store";

type Status = "idle" | "loading" | "success" | "error";

export default function AcceptInvite() {
  const params = useLocalSearchParams<{ token?: string }>();
  const setActiveSpace = useApp((s) => s.setActiveSpace);
  const [token, setToken] = useState<string>(params.token ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  async function attempt(t: string) {
    if (!t) return;
    setStatus("loading");
    setMessage("");
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setStatus("error");
        setMessage("You need to sign in first. Your invite will be waiting.");
        return;
      }
      const result = await claimInvitation(supabase, t);
      setActiveSpace(result.space_id);
      setStatus("success");
      setMessage(result.already ? "You were already in this space." : "You're in!");
    } catch (e) {
      setStatus("error");
      setMessage((e as Error).message ?? "Could not accept invite.");
    }
  }

  useEffect(() => {
    if (params.token) attempt(params.token);
  }, [params.token]);

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, backgroundColor: colors.bg }}>
      <Text variant="h2">Accept invite</Text>
      <Card>
        <Stack gap="md">
          <Text variant="muted">
            Paste the invite token a partner sent you. If they sent you a link, opening it on this
            device should drop you in automatically.
          </Text>
          <TextInput
            placeholder="invite token"
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: space.md,
              backgroundColor: colors.surface,
            }}
          />
          <Button
            label={status === "loading" ? "Accepting…" : "Accept invite"}
            disabled={!token || status === "loading"}
            onPress={() => attempt(token)}
          />
          {status === "success" ? (
            <View>
              <Text style={{ color: colors.positive }}>{message}</Text>
              <Button
                label="Go to dashboard"
                variant="secondary"
                style={{ marginTop: space.sm }}
                onPress={() => router.replace("/(tabs)/dashboard")}
              />
            </View>
          ) : null}
          {status === "error" ? <Text style={{ color: colors.negative }}>{message}</Text> : null}
        </Stack>
      </Card>
    </ScrollView>
  );
}
