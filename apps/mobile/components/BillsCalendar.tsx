import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";

export interface CalendarBill {
  id: string;
  next_due_at: string;
  amount: number;
  autopay: boolean;
  isOverdue: boolean;
}

interface Props {
  bills: CalendarBill[];
  todayIso: string;
  selectedIso: string | null;
  onSelectDay: (iso: string | null) => void;
  palette: Palette;
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

function dotInfo(bills: CalendarBill[], palette: Palette): { color: string | null; count: number } {
  if (bills.length === 0) return { color: null, count: 0 };
  const hasOverdue = bills.some((b) => b.isOverdue);
  const hasManual = bills.some((b) => !b.autopay && !b.isOverdue);
  let color = palette.brand;
  if (hasOverdue) color = palette.warn;
  else if (hasManual) color = palette.ink1;
  return { color, count: bills.length };
}

export function BillsCalendar({ bills, todayIso, selectedIso, onSelectDay, palette }: Props) {
  const [view, setView] = useState(() => {
    const today = new Date(`${todayIso}T00:00:00`);
    return { year: today.getFullYear(), month0: today.getMonth() };
  });

  const billsByDay = useMemo(() => {
    const map = new Map<string, CalendarBill[]>();
    for (const b of bills) {
      const arr = map.get(b.next_due_at) ?? [];
      arr.push(b);
      map.set(b.next_due_at, arr);
    }
    return map;
  }, [bills]);

  const monthStartOffset = new Date(view.year, view.month0, 1).getDay();
  const daysInMonth = new Date(view.year, view.month0 + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < monthStartOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function shift(delta: number) {
    setView((v) => {
      let m0 = v.month0 + delta;
      let y = v.year;
      while (m0 < 0) { m0 += 12; y -= 1; }
      while (m0 > 11) { m0 -= 12; y += 1; }
      return { year: y, month0: m0 };
    });
  }

  return (
    <View
      style={{
        marginHorizontal: 16,
        padding: 14,
        borderRadius: 16,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <NavBtn palette={palette} onPress={() => shift(-1)} dir="left" />
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 16, fontWeight: "500", color: palette.ink1 }}>
            {MONTHS[view.month0]} {view.year}
          </Text>
        </View>
        <NavBtn palette={palette} onPress={() => shift(1)} dir="right" />
      </View>

      <View style={{ flexDirection: "row", marginBottom: 6 }}>
        {DOW.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontFamily: fonts.ui, fontSize: 10.5, color: palette.ink3, fontWeight: "500" }}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {cells.map((d, i) => {
          if (d === null) return <View key={i} style={{ width: `${100 / 7}%`, height: 44 }} />;
          const iso = isoFor(view.year, view.month0, d);
          const dayBills = billsByDay.get(iso) ?? [];
          const { color, count } = dotInfo(dayBills, palette);
          const isToday = iso === todayIso;
          const isSelected = iso === selectedIso;
          return (
            <Pressable
              key={i}
              onPress={() => onSelectDay(isSelected ? null : iso)}
              style={{ width: `${100 / 7}%`, height: 44, alignItems: "center", justifyContent: "flex-start" }}
            >
              <View
                style={{
                  marginTop: 2,
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected ? palette.brand : isToday ? palette.brandTint : "transparent",
                }}
              >
                <Text
                  style={{
                    fontFamily: isToday || isSelected ? fonts.uiMedium : fonts.ui,
                    fontSize: 13,
                    color: isSelected ? palette.brandOn : isToday ? palette.brand : palette.ink1,
                    fontWeight: isToday || isSelected ? "600" : "400",
                  }}
                >
                  {d}
                </Text>
              </View>
              {count > 0 && color ? (
                <View style={{ position: "absolute", bottom: 2, flexDirection: "row", gap: 2 }}>
                  {Array.from({ length: Math.min(3, count) }).map((_, k) => (
                    <View
                      key={k}
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: 999,
                        backgroundColor: color,
                        opacity: isSelected ? 0.9 : 1,
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginTop: 14,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: palette.line,
          flexWrap: "wrap",
        }}
      >
        <LegendDot color={palette.brand} label="Autopay" palette={palette} />
        <LegendDot color={palette.ink1} label="Manual" palette={palette} />
        <LegendDot color={palette.warn} label="Overdue" palette={palette} />
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ flexDirection: "row", gap: 2 }}>
            <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: palette.ink3 }} />
            <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: palette.ink3 }} />
            <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: palette.ink3 }} />
          </View>
          <Text style={{ fontFamily: fonts.ui, fontSize: 10.5, color: palette.ink3 }}>= 3+ bills</Text>
        </View>
      </View>
    </View>
  );
}

function LegendDot({ color, label, palette }: { color: string; label: string; palette: Palette }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: color }} />
      <Text style={{ fontFamily: fonts.ui, fontSize: 10.5, color: palette.ink3 }}>{label}</Text>
    </View>
  );
}

function NavBtn({ palette, onPress, dir }: { palette: Palette; onPress: () => void; dir: "left" | "right" }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 30,
        height: 30,
        borderRadius: 999,
        backgroundColor: palette.tinted,
        alignItems: "center",
        justifyContent: "center",
      }}
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
