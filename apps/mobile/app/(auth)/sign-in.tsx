import { useState } from "react";
import { TextInput, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Stack, Text, colors, radius, space } from "@cvc/ui";
import { supabase } from "../../lib/supabase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) setError(err.message);
    else router.replace("/(tabs)/dashboard");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: space.lg, backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="lg">
          <Text variant="h1">Welcome back</Text>
          <TextInput
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={inputStyle}
          />
          <TextInput
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={inputStyle}
          />
          {error ? <Text style={{ color: colors.negative }}>{error}</Text> : null}
          <Button label="Sign in" onPress={onSubmit} loading={loading} />
          <Button label="Create account" variant="ghost" onPress={() => router.push("/(auth)/sign-up")} />
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
