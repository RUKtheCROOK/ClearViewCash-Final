import { useEffect, useMemo, useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { fonts, type Palette } from "@cvc/ui";
import { useTheme } from "../lib/theme";

interface Props {
  visible: boolean;
  title?: string;
  initialIso: string;
  todayIso: string;
  minIso?: string;
  maxIso?: string;
  onClose: () => void;
  onPick: (iso: string) => void;
}

const DOW = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string { return String(n).padStart(2, "0"); }
function isoFor(year: number, month0: number, day: number): string {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}
function parseIso(iso: string): { year: number; month0: number; day: number } | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: Number(m[1]), month0: Number(m[2]) - 1, day: Number(m[3]) };
}

export function DatePickerSheet({ visible, title = "Pick a date", initialIso, todayIso, minIso, maxIso, onClose, onPick }: Props) {
  const { palette } = useTheme();
  const seed = parseIso(initialIso) ?? parseIso(todayIso) ?? { year: new Date().getFullYear(), month0: new Date().getMonth(), day: 1 };
  const [view, setView] = useState({ year: seed.year, month0: seed.month0 });
  const [selectedIso, setSelectedIso] = useState(initialIso);

  useEffect(() => {
    if (!visible) return;
    const fresh = parseIso(initialIso) ?? parseIso(todayIso) ?? { year: new Date().getFullYear(), month0: new Date().getMonth(), day: 1 };
    setView({ year: fresh.year, month0: fresh.month0 });
    setSelectedIso(initialIso);
  }, [visible, initialIso, todayIso]);

  const monthStartOffset = new Date(view.year, view.month0, 1).getDay();
  const daysInMonth = new Date(view.year, view.month0 + 1, 0).getDate();
  const cells: Array<number | null> = useMemo(() => {
    const arr: Array<number | null> = [];
    for (let i = 0; i < monthStartOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [monthStartOffset, daysInMonth]);

  function shift(delta: number) {
    setView((v) => {
      let m0 = v.month0 + delta;
      let y = v.year;
      while (m0 < 0) { m0 += 12; y -= 1; }
      while (m0 > 11) { m0 -= 12; y += 1; }
      return { year: y, month0: m0 };
    });
  }

  function pick(d: number) {
    const iso = isoFor(view.year, view.month0, d);
    if (minIso && iso < minIso) return;
    if (maxIso && iso > maxIso) return;
    setSelectedIso(iso);
  }

  function confirm() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(selectedIso)) return;
    onPick(selectedIso);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }}>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => undefined} style={{
          backgroundColor: palette.canvas,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 32 : 16,
          paddingHorizontal: 16,
        }}>
          <View style={{ alignItems: "center", paddingVertical: 6 }}>
            <View style={{ width: 36, height: 4, borderRadius: 999, backgroundColor: palette.lineFirm }} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingVertical: 8 }}>
            <Text style={{ flex: 1, fontFamily: fonts.uiMedium, fontSize: 15, fontWeight: "600", color: palette.ink1 }}>
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: palette.tinted, alignItems: "center", justifyContent: "center" }}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={palette.ink2} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>

          <View style={{ marginTop: 4, padding: 12, borderRadius: 16, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <NavBtn palette={palette} dir="left" onPress={() => shift(-1)} />
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.uiMedium, fontSize: 15, fontWeight: "500", color: palette.ink1 }}>
                  {MONTHS[view.month0]} {view.year}
                </Text>
              </View>
              <NavBtn palette={palette} dir="right" onPress={() => shift(1)} />
            </View>

            <View style={{ flexDirection: "row", marginBottom: 4 }}>
              {DOW.map((d, i) => (
                <View key={i} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ fontFamily: fonts.ui, fontSize: 10.5, color: palette.ink3, fontWeight: "500" }}>{d}</Text>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {cells.map((d, i) => {
                if (d === null) return <View key={i} style={{ width: `${100 / 7}%`, height: 40 }} />;
                const iso = isoFor(view.year, view.month0, d);
                const isSelected = iso === selectedIso;
                const isToday = iso === todayIso;
                const disabled = (minIso && iso < minIso) || (maxIso && iso > maxIso);
                return (
                  <Pressable
                    key={i}
                    disabled={!!disabled}
                    onPress={() => pick(d)}
                    style={({ pressed }) => ({
                      width: `${100 / 7}%`,
                      height: 40,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: disabled ? 0.3 : pressed ? 0.85 : 1,
                    })}
                  >
                    <View style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSelected ? palette.brand : isToday ? palette.brandTint : "transparent",
                    }}>
                      <Text style={{
                        fontFamily: isToday || isSelected ? fonts.uiMedium : fonts.ui,
                        fontSize: 13,
                        color: isSelected ? palette.brandOn : isToday ? palette.brand : palette.ink1,
                        fontWeight: isToday || isSelected ? "600" : "400",
                      }}>
                        {d}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            onPress={confirm}
            style={({ pressed }) => ({
              marginTop: 14,
              height: 50,
              borderRadius: 12,
              backgroundColor: palette.brand,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14.5, fontWeight: "500", color: palette.brandOn }}>
              Confirm
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function NavBtn({ palette, onPress, dir }: { palette: Palette; onPress: () => void; dir: "left" | "right" }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 30,
        height: 30,
        borderRadius: 999,
        backgroundColor: palette.tinted,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path
          d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
          fill="none"
          stroke={palette.ink2}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}
