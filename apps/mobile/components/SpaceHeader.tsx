import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Text, HStack, colors, radius, space } from "@cvc/ui";
import { acceptedMemberCount, useSpaces } from "../hooks/useSpaces";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";
import { useApp } from "../lib/store";

/**
 * Sticky header — shown on every tab. Renders space switcher pill (tinted by
 * active space), the My View ⇄ Shared View toggle, the notification bell,
 * and the settings gear. The toggle is only meaningful in spaces with at
 * least two accepted members, so it's hidden otherwise.
 */
export function SpaceHeader() {
  const { activeSpace, spaces } = useSpaces();
  const sharedView = useApp((s) => s.sharedView);
  const toggleView = useApp((s) => s.toggleView);
  const setActive = useApp((s) => s.setActiveSpace);
  const unread = useUnreadNotifications();
  const showToggle = acceptedMemberCount(activeSpace) >= 2;

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
          {showToggle ? (
            <Pressable onPress={toggleView} hitSlop={10}>
              <Text style={{ color: "#fff", fontWeight: "500" }}>
                {sharedView ? "Shared View" : "My View"} ⇄
              </Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.push("/settings/notifications")} hitSlop={10}>
            <View>
              <Text style={{ color: "#fff", fontSize: 18 }}>🔔</Text>
              {unread > 0 ? (
                <View
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -8,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: colors.negative,
                    paddingHorizontal: 4,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
                    {unread > 9 ? "9+" : unread}
                  </Text>
                </View>
              ) : null}
            </View>
          </Pressable>
          <Pressable onPress={() => router.push("/settings")} hitSlop={10}>
            <Text style={{ color: "#fff", fontSize: 18 }}>⚙</Text>
          </Pressable>
        </HStack>
      </HStack>
    </View>
  );
}
