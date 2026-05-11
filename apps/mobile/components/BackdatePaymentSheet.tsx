import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { formatLongDate, todayIso } from "@cvc/domain";
import { fonts, type Palette } from "@cvc/ui";
import { useTheme } from "../lib/theme";
import { DatePickerSheet } from "./DatePickerSheet";

interface Props {
  visible: boolean;
  billName: string | null;
  onClose: () => void;
  onConfirm: (paidAtIso: string) => void;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function BackdatePaymentSheet({ visible, billName, onClose, onConfirm }: Props) {
  const { palette } = useTheme();
  const today = todayIso();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customIso, setCustomIso] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setCustomIso(null);
      setPickerOpen(false);
    }
  }, [visible]);

  const chips: Array<{ label: string; iso: string }> = [
    { label: "Today", iso: today },
    { label: "Yesterday", iso: addDays(today, -1) },
    { label: "2 days ago", iso: addDays(today, -2) },
    { label: "3 days ago", iso: addDays(today, -3) },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: palette.canvas,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 8,
            paddingBottom: Platform.OS === "ios" ? 32 : 16,
            paddingHorizontal: 16,
          }}
        >
          <View style={{ alignItems: "center", paddingVertical: 6 }}>
            <View style={{ width: 36, height: 4, borderRadius: 999, backgroundColor: palette.lineFirm }} />
          </View>

          <View style={{ paddingHorizontal: 4, paddingTop: 4, paddingBottom: 12 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 15, fontWeight: "600", color: palette.ink1 }}>
              When did you pay?
            </Text>
            {billName ? (
              <Text numberOfLines={1} style={{ fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink3, marginTop: 4 }}>
                {billName}
              </Text>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {chips.map((c) => (
              <Pressable
                key={c.iso}
                onPress={() => onConfirm(c.iso)}
                style={({ pressed }) => ({
                  flexBasis: "48%",
                  paddingVertical: 14,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: palette.lineFirm,
                  backgroundColor: palette.surface,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
                  {c.label}
                </Text>
                <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink3, marginTop: 2 }}>
                  {formatLongDate(c.iso)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={() => setPickerOpen(true)}
            style={({ pressed }) => ({
              marginTop: 12,
              paddingVertical: 14,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: palette.tinted,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M3 9h18 M8 3v4 M16 3v4" fill="none" stroke={palette.ink1} strokeWidth={1.6} strokeLinecap="round" />
              <Path d="M3 5h18v16H3z" fill="none" stroke={palette.ink1} strokeWidth={1.6} />
            </Svg>
            <Text style={{ flex: 1, fontFamily: fonts.uiMedium, fontSize: 13.5, fontWeight: "500", color: palette.ink1 }}>
              {customIso ? formatLongDate(customIso) : "Pick another date"}
            </Text>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path d="M9 6l6 6-6 6" fill="none" stroke={palette.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Pressable>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              marginTop: 8,
              height: 50,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: palette.lineFirm,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14.5, color: palette.ink2 }}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>

      <DatePickerSheet
        visible={pickerOpen}
        title="Pick a date"
        initialIso={customIso ?? today}
        todayIso={today}
        maxIso={today}
        onClose={() => setPickerOpen(false)}
        onPick={(iso) => {
          setCustomIso(iso);
          setPickerOpen(false);
          onConfirm(iso);
        }}
      />
    </Modal>
  );
}
