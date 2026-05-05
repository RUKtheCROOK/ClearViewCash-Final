import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { I, Text, spaceTint, spaceKeyFromTint, type IconKey } from "@cvc/ui";
import { getAccountsForSpace } from "@cvc/api-client";
import { acceptedMemberCount, useSpaces, type SpaceRow } from "../hooks/useSpaces";
import { useApp } from "../lib/store";
import { useTheme } from "../lib/theme";
import { supabase } from "../lib/supabase";

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface SpaceSummary {
  totalCents: number;
  accountCount: number;
}

const SPACE_ICON: Record<ReturnType<typeof spaceKeyFromTint>, IconKey> = {
  personal: "home",
  household: "fam",
  business: "brief",
  family: "fam",
  travel: "plane",
};

export function SpaceSwitcherSheet({ visible, onClose }: Props) {
  const { palette, mode } = useTheme();
  const { spaces } = useSpaces();
  const activeSpaceId = useApp((s) => s.activeSpaceId);
  const setActive = useApp((s) => s.setActiveSpace);
  const [summaries, setSummaries] = useState<Record<string, SpaceSummary>>({});

  useEffect(() => {
    if (!visible || spaces.length === 0) return;
    let cancelled = false;
    (async () => {
      const map: Record<string, SpaceSummary> = {};
      await Promise.all(
        spaces.map(async (s) => {
          try {
            const accounts = await getAccountsForSpace(supabase, s.id);
            map[s.id] = {
              totalCents: accounts.reduce((sum, a) => sum + (a.current_balance ?? 0), 0),
              accountCount: accounts.length,
            };
          } catch {
            map[s.id] = { totalCents: 0, accountCount: 0 };
          }
        }),
      );
      if (!cancelled) setSummaries(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, spaces]);

  function pickSpace(s: SpaceRow) {
    setActive(s.id);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(20,24,28,0.32)" }}>
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
            maxHeight: "90%",
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
                Spaces
              </Text>
              <Text style={{ fontSize: 12, color: palette.ink3, marginTop: 1 }}>
                {spaces.length} space{spaces.length === 1 ? "" : "s"}
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

          <ScrollView contentContainerStyle={{ padding: 12, gap: 4 }}>
            {spaces.map((s) => {
              const key = spaceKeyFromTint(s.tint);
              const tint = spaceTint(key, mode);
              const active = s.id === activeSpaceId;
              const summary = summaries[s.id];
              const Icon = I[SPACE_ICON[key]];
              const members = acceptedMemberCount(s);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => pickSpace(s)}
                  style={{
                    flexDirection: "row",
                    gap: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    backgroundColor: active ? tint.wash : "transparent",
                    borderColor: active ? tint.edge : "transparent",
                    borderWidth: 1,
                  }}
                >
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      backgroundColor: tint.pillBg,
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    <Icon color={tint.pillFg} size={22} />
                    <View
                      style={{
                        position: "absolute",
                        bottom: -2,
                        right: -2,
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        backgroundColor: tint.swatch,
                        borderColor: active ? tint.wash : palette.surface,
                        borderWidth: 2,
                      }}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ fontSize: 15, fontWeight: "500", color: palette.ink1 }}>
                        {s.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                          backgroundColor: palette.tinted,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 999,
                        }}
                      >
                        <I.user color={palette.ink3} />
                        <Text style={{ fontSize: 11, color: palette.ink3 }}>{members}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: palette.ink2, marginTop: 2 }}>
                      {summary
                        ? `$${(summary.totalCents / 100).toLocaleString("en-US", {
                            maximumFractionDigits: 0,
                          })} across ${summary.accountCount} account${summary.accountCount === 1 ? "" : "s"}`
                        : "…"}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      backgroundColor: active ? tint.pillFg : "transparent",
                      borderColor: active ? "transparent" : palette.line,
                      borderWidth: active ? 0 : 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {active ? <I.check color={mode === "dark" ? palette.brandOn : palette.surface} size={16} /> : null}
                  </View>
                </Pressable>
              );
            })}

            <View style={{ height: 1, backgroundColor: palette.line, marginVertical: 8, marginHorizontal: 6 }} />

            <Pressable
              onPress={() => {
                onClose();
                router.push("/settings/spaces");
              }}
              style={{
                flexDirection: "row",
                gap: 14,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 14,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: palette.tinted,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: palette.lineFirm,
                  borderStyle: "dashed",
                  borderWidth: 1,
                }}
              >
                <I.plus color={palette.ink2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "500", color: palette.ink1 }}>New Space</Text>
                <Text style={{ fontSize: 12, color: palette.ink3, marginTop: 2 }}>
                  Invite people, choose what to share
                </Text>
              </View>
              <I.chevR color={palette.ink3} />
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
