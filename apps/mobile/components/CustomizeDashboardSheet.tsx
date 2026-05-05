import { Modal, Pressable, ScrollView, Switch, View } from "react-native";
import { I, Text } from "@cvc/ui";
import {
  DASHBOARD_MODULES,
  type DashboardModuleId,
  isPremiumModule,
} from "@cvc/domain";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  useApp,
  type DashboardLayoutEntry,
} from "../lib/store";
import { useTheme } from "../lib/theme";
import { useTier } from "../hooks/useTier";

interface Props {
  visible: boolean;
  onClose: () => void;
  onPremiumPress: () => void;
}

export function CustomizeDashboardSheet({ visible, onClose, onPremiumPress }: Props) {
  const { palette } = useTheme();
  const layout = useApp((s) => s.dashboardLayout);
  const setLayout = useApp((s) => s.setDashboardLayout);
  const resetLayout = useApp((s) => s.resetDashboardLayout);
  const { canForecast } = useTier();

  function toggle(id: DashboardModuleId) {
    if (isPremiumModule(id) && !canForecast) {
      // Toggling on a premium module while not subscribed should pop the
      // upsell instead of silently failing.
      onPremiumPress();
      return;
    }
    setLayout(layout.map((e) => (e.id === id ? { ...e, visible: !e.visible } : e)));
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...layout];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    setLayout(next);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(20,24,28,0.32)" }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: palette.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: 36,
            maxHeight: "85%",
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: palette.lineFirm }} />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 18,
              paddingTop: 8,
              paddingBottom: 4,
            }}
          >
            <View>
              <Text style={{ fontSize: 18, fontWeight: "500", color: palette.ink1, letterSpacing: -0.2 }}>
                Customize dashboard
              </Text>
              <Text style={{ fontSize: 12, color: palette.ink3, marginTop: 1 }}>
                Toggle modules and reorder them
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                backgroundColor: palette.tinted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <I.close color={palette.ink2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12, gap: 6 }}>
            {layout.map((entry, i) => {
              const meta = DASHBOARD_MODULES[entry.id];
              const premium = meta.premium;
              const locked = premium && !canForecast;
              return (
                <View
                  key={entry.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor: palette.canvas,
                    borderColor: palette.line,
                    borderWidth: 1,
                  }}
                >
                  <View style={{ flexDirection: "column", gap: 2 }}>
                    <Pressable
                      onPress={() => move(i, -1)}
                      disabled={i === 0}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: i === 0 ? "transparent" : palette.tinted,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View style={{ transform: [{ rotate: "-90deg" }] }}>
                        <I.chev color={i === 0 ? palette.ink4 : palette.ink2} />
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => move(i, 1)}
                      disabled={i === layout.length - 1}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        backgroundColor: i === layout.length - 1 ? "transparent" : palette.tinted,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <I.chev color={i === layout.length - 1 ? palette.ink4 : palette.ink2} />
                    </Pressable>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                        {meta.label}
                      </Text>
                      {premium ? (
                        <Pressable
                          onPress={onPremiumPress}
                          style={{
                            backgroundColor: palette.brandTint,
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ fontSize: 9, fontWeight: "700", color: palette.brand, letterSpacing: 0.4 }}>
                            PRO
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 12, color: palette.ink3, marginTop: 2 }}>
                      {locked ? "Upgrade to enable" : meta.description}
                    </Text>
                  </View>
                  <Switch
                    value={entry.visible && !locked}
                    onValueChange={() => toggle(entry.id)}
                    disabled={locked}
                    trackColor={{ false: palette.lineFirm, true: palette.brand }}
                    thumbColor={palette.surface}
                  />
                </View>
              );
            })}

            <Pressable
              onPress={resetLayout}
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                backgroundColor: "transparent",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "500", color: palette.ink2 }}>
                Reset to default
              </Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export type { DashboardLayoutEntry };
