import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Text, HStack, colors, radius, space } from "@cvc/ui";
import { useSpaces } from "../hooks/useSpaces";
import { useApp } from "../lib/store";

/**
 * Sticky header — shown on every tab. Renders space switcher pill (tinted by
 * active space), the My View ⇄ Shared View toggle, and the settings gear.
 */
export function SpaceHeader() {
  const { activeSpace, spaces } = useSpaces();
  const sharedView = useApp((s) => s.sharedView);
  const toggleView = useApp((s) => s.toggleView);
  const setActive = useApp((s) => s.setActiveSpace);

  function cycleSpace() {
    if (spaces.length < 2 || !activeSpace) return;
    const idx = spaces.findIndex((s) => s.id === activeSpace.id);
    const next = spaces[(idx + 1) % spaces.length]!;
    setActive(next.id);
  }

  return (
    <View
      style={{
        backgroundColor: activeSpace?.tint ?? colors.primary,
        paddingHorizontal: space.lg,
        paddingTop: space.xl,
        paddingBottom: space.md,
      }}
    >
      <HStack align="center" justify="space-between">
        <Pressable onPress={cycleSpace} hitSlop={10}>
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.18)",
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.pill,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>{activeSpace?.name ?? "Loading…"}</Text>
          </View>
        </Pressable>
        <HStack gap="md" align="center">
          <Pressable onPress={toggleView} hitSlop={10}>
            <Text style={{ color: "#fff", fontWeight: "500" }}>
              {sharedView ? "Shared View" : "My View"} ⇄
            </Text>
          </Pressable>
          <Pressable onPress={() => router.push("/settings")} hitSlop={10}>
            <Text style={{ color: "#fff", fontSize: 18 }}>⚙</Text>
          </Pressable>
        </HStack>
      </HStack>
    </View>
  );
}
