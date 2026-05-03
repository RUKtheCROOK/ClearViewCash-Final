import { View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Stack, Text, colors, space } from "@cvc/ui";

export default function Verify() {
  return (
    <View style={{ flex: 1, padding: space.lg, justifyContent: "center", backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="lg">
          <Text variant="h1">Check your email</Text>
          <Text variant="muted">
            We sent a confirmation link to your inbox. After confirming, set up two-factor authentication
            for the strongest protection of your financial data.
          </Text>
          <Button label="Set up 2FA" onPress={() => router.push("/settings/security")} />
          <Button label="Skip for now" variant="ghost" onPress={() => router.replace("/(onboarding)/link-bank")} />
        </Stack>
      </Card>
    </View>
  );
}
