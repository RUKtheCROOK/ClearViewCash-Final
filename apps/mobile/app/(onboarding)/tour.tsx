import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Stack, Text, colors, space } from "@cvc/ui";

const slides = [
  {
    title: "One number that means something",
    body: "Effective Available cash is what you actually have after your linked credit cards. Live, every time you open the app.",
  },
  {
    title: "Spaces, not joint accounts",
    body: "You own your accounts. Choose what to share — by account or by transaction. Toggle My View ⇄ Shared View on every screen.",
  },
  {
    title: "Cash flow you can see",
    body: "Project balances forward using your bills, income, and card payments. Run what-ifs. Get warned before a low balance happens.",
  },
];

export default function Tour() {
  const [i, setI] = useState(0);
  const slide = slides[i]!;
  const isLast = i === slides.length - 1;
  return (
    <View style={{ flex: 1, padding: space.lg, justifyContent: "center", backgroundColor: colors.bg }}>
      <Card>
        <Stack gap="lg">
          <Text variant="label">Step {i + 1} of {slides.length}</Text>
          <Text variant="h1">{slide.title}</Text>
          <Text variant="muted">{slide.body}</Text>
          <Button
            label={isLast ? "Start using ClearViewCash" : "Next"}
            onPress={() => (isLast ? router.replace("/(tabs)/dashboard") : setI(i + 1))}
          />
          {!isLast ? <Button label="Skip" variant="ghost" onPress={() => router.replace("/(tabs)/dashboard")} /> : null}
        </Stack>
      </Card>
    </View>
  );
}
