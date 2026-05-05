import { Modal, Pressable, View } from "react-native";
import { router } from "expo-router";
import { I, Text, type IconKey } from "@cvc/ui";
import { useTheme } from "../lib/theme";
import { useApp } from "../lib/store";

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddTransaction: () => void;
}

interface Action {
  id: string;
  label: string;
  body: string;
  icon: IconKey;
  onPress: () => void;
}

export function QuickActionsMenu({ visible, onClose, onAddTransaction }: Props) {
  const { palette, mode, setMode } = useTheme();
  const setThemeMode = useApp((s) => s.setThemeMode);

  const actions: Action[] = [
    {
      id: "premium-hub",
      label: "Premium hub",
      body: "Manage subscription, see trial status, and explore Pro features.",
      icon: "spark",
      onPress: () => {
        onClose();
        router.push("/settings");
      },
    },
    {
      id: "add-transaction",
      label: "Add transaction",
      body: "Manually log a cash transaction not yet imported from a linked account.",
      icon: "plus",
      onPress: () => {
        onClose();
        onAddTransaction();
      },
    },
    {
      id: "toggle-dark",
      label: mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
      body: mode === "dark" ? "Light theme follows the warm-paper palette." : "Dark theme uses the cool ink-blue palette.",
      icon: mode === "dark" ? "spark" : "spark",
      onPress: () => {
        setThemeMode(mode === "dark" ? "light" : "dark");
        // setMode is the convenience setter on useTheme; call both for safety
        // since useTheme may resolve via system rather than store.
        setMode(mode === "dark" ? "light" : "dark");
      },
    },
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(20,22,28,0.32)" }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            position: "absolute",
            top: 96,
            left: 16,
            right: 16,
            backgroundColor: palette.surface,
            borderRadius: 18,
            borderColor: palette.line,
            borderWidth: 1,
            shadowColor: "#000",
            shadowOpacity: 0.16,
            shadowOffset: { width: 0, height: 8 },
            shadowRadius: 24,
            elevation: 12,
            overflow: "hidden",
          }}
        >
          <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 }}>
            <Text variant="eyebrow" style={{ color: palette.ink2 }}>
              Quick actions
            </Text>
          </View>
          {actions.map((a, i) => {
            const Icon = I[a.icon];
            const last = i === actions.length - 1;
            return (
              <Pressable
                key={a.id}
                onPress={a.onPress}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  gap: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  alignItems: "center",
                  backgroundColor: pressed ? palette.tinted : "transparent",
                  borderBottomColor: palette.line,
                  borderBottomWidth: last ? 0 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: palette.brandTint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon color={palette.brand} size={18} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                    {a.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: palette.ink3, marginTop: 1 }}>
                    {a.body}
                  </Text>
                </View>
                <I.chevR color={palette.ink3} />
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
