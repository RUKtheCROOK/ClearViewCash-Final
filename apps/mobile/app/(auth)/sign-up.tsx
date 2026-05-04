import { useState } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Stack, Text, colors, radius, space } from "@cvc/ui";
import { supabase } from "../../lib/supabase";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [spaceName, setSpaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { space_name: spaceName.trim() } },
    });
    setLoading(false);
    if (err) setError(err.message);
    else router.replace("/(onboarding)/verify");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: space.lg, backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="lg">
          <Text variant="h1">Create your account</Text>
          <Text variant="muted">We&apos;ll create a space for you. You can rename it any time.</Text>
          <TextInput
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={inputStyle}
          />
          <TextInput
            placeholder="Password (min 8)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={inputStyle}
          />
          <TextInput
            placeholder="Space name (optional)"
            value={spaceName}
            onChangeText={setSpaceName}
            maxLength={64}
            style={inputStyle}
          />
          {error ? <Text style={{ color: colors.negative }}>{error}</Text> : null}
          <Button label="Sign up" onPress={onSubmit} loading={loading} />
          <Button label="I already have an account" variant="ghost" onPress={() => router.replace("/(auth)/sign-in")} />
        </Stack>
      </Card>
    </View>
  );
}

const inputStyle = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: radius.md,
  padding: space.md,
  fontSize: 16,
};
