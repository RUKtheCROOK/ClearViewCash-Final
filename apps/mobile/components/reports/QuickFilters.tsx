import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { fonts, type Palette } from "@cvc/ui";
import { RANGE_PRESETS, resolvePreset, type DateRange, type RangePreset } from "@cvc/domain";
import { ChevDownIcon } from "./reportGlyphs";

const FMT_RANGE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function formatRangeSub(range: DateRange): string {
  const from = new Date(`${range.from}T00:00:00`);
  const to = new Date(`${range.to}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return `${range.from} – ${range.to}`;
  if (from.getUTCFullYear() === to.getUTCFullYear()) {
    return `${FMT_RANGE.format(from)} – ${FMT_RANGE.format(to)}, ${from.getUTCFullYear()}`;
  }
  return `${range.from} – ${range.to}`;
}

interface DateRangePillProps {
  palette: Palette;
  presetKey: RangePreset["key"] | "custom";
  range: DateRange;
  onChange: (next: { presetKey: RangePreset["key"] | "custom"; range: DateRange }) => void;
}

export function DateRangePill({ palette, presetKey, range, onChange }: DateRangePillProps) {
  const [open, setOpen] = useState(false);
  const activeLabel =
    RANGE_PRESETS.find((p) => p.key === presetKey)?.label ??
    (presetKey === "custom" ? "Custom range" : "This month");
  const sub = formatRangeSub(range);

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          padding: 10,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.num,
            fontSize: 9.5,
            color: palette.ink3,
            letterSpacing: 0.7,
            fontWeight: "600",
          }}
        >
          RANGE
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
            {activeLabel}
          </Text>
          <Text style={{ fontFamily: fonts.num, fontSize: 10.5, color: palette.ink3, marginTop: 1 }}>{sub}</Text>
        </View>
        <ChevDownIcon color={palette.ink3} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setOpen(false)}>
          <View
            style={{
              marginTop: "auto",
              backgroundColor: palette.canvas,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 16,
              paddingBottom: 28,
            }}
          >
            <View style={{ alignItems: "center", paddingBottom: 8 }}>
              <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: palette.lineFirm }} />
            </View>
            <Text
              style={{
                fontFamily: fonts.num,
                fontSize: 10,
                color: palette.ink3,
                letterSpacing: 0.8,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              SELECT RANGE
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {RANGE_PRESETS.map((p) => {
                const active = presetKey === p.key;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => {
                      onChange({ presetKey: p.key, range: resolvePreset(p.key) });
                      setOpen(false);
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: active ? palette.brandTint : "transparent",
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: fonts.uiMedium,
                        fontSize: 14,
                        color: active ? palette.brand : palette.ink1,
                        fontWeight: active ? "500" : "400",
                      }}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

interface SpaceFilterPillProps {
  palette: Palette;
  spaces: { id: string; name: string; tint?: string | null }[];
  activeSpaceId: string | null;
  onChange: (id: string) => void;
}

export function SpaceFilterPill({ palette, spaces, activeSpaceId, onChange }: SpaceFilterPillProps) {
  const [open, setOpen] = useState(false);
  const active = spaces.find((s) => s.id === activeSpaceId) ?? spaces[0];

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={() => spaces.length > 1 && setOpen(true)}
        style={{
          padding: 10,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.num,
            fontSize: 9.5,
            color: palette.ink3,
            letterSpacing: 0.7,
            fontWeight: "600",
          }}
        >
          SPACE
        </Text>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: active?.tint ?? palette.brand,
            }}
          />
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
            {active?.name ?? "Personal"}
          </Text>
        </View>
        <ChevDownIcon color={palette.ink3} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setOpen(false)}>
          <View
            style={{
              marginTop: "auto",
              backgroundColor: palette.canvas,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 16,
              paddingBottom: 28,
            }}
          >
            <View style={{ alignItems: "center", paddingBottom: 8 }}>
              <View style={{ width: 38, height: 4, borderRadius: 999, backgroundColor: palette.lineFirm }} />
            </View>
            <Text
              style={{
                fontFamily: fonts.num,
                fontSize: 10,
                color: palette.ink3,
                letterSpacing: 0.8,
                fontWeight: "600",
                marginBottom: 8,
              }}
            >
              SWITCH SPACE
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {spaces.map((s) => {
                const isActive = s.id === activeSpaceId;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => {
                      onChange(s.id);
                      setOpen(false);
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: isActive ? palette.brandTint : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: s.tint ?? palette.brand,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: fonts.uiMedium,
                        fontSize: 14,
                        color: isActive ? palette.brand : palette.ink1,
                      }}
                    >
                      {s.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
