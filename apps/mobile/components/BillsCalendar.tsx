import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { HStack, Stack, Text, colors, radius, space } from "@cvc/ui";
import { computeBillStatus, type BillCycleStatus } from "@cvc/domain";

interface CalendarBill {
  id: string;
  next_due_at: string;
}

interface Props {
  bills: CalendarBill[];
  todayIso: string;
  selectedIso: string | null;
  onSelectDay: (iso: string | null) => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoForCell(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function startOfMonthCell(year: number, month: number): { startDow: number; daysInMonth: number } {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  return { startDow, daysInMonth };
}

const STATUS_RANK: Record<BillCycleStatus, number> = {
  overdue: 3,
  due_soon: 2,
  upcoming: 1,
};

const STATUS_COLOR: Record<BillCycleStatus, string> = {
  overdue: colors.negative,
  due_soon: colors.warning,
  upcoming: colors.positive,
};

export function BillsCalendar({ bills, todayIso, selectedIso, onSelectDay }: Props) {
  const [year, setYear] = useState<number>(() => new Date(todayIso).getUTCFullYear());
  const [month, setMonth] = useState<number>(() => new Date(todayIso).getUTCMonth());

  const billsByDay = useMemo(() => {
    const map = new Map<string, CalendarBill[]>();
    for (const b of bills) {
      const list = map.get(b.next_due_at) ?? [];
      list.push(b);
      map.set(b.next_due_at, list);
    }
    return map;
  }, [bills]);

  const { startDow, daysInMonth } = startOfMonthCell(year, month);
  const cells: Array<{ iso: string; day: number; inMonth: boolean }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ iso: "", day: 0, inMonth: false });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ iso: isoForCell(year, month, d), day: d, inMonth: true });
  }
  while (cells.length % 7 !== 0) cells.push({ iso: "", day: 0, inMonth: false });

  function step(delta: number) {
    let nextMonth = month + delta;
    let nextYear = year;
    while (nextMonth < 0) {
      nextMonth += 12;
      nextYear -= 1;
    }
    while (nextMonth > 11) {
      nextMonth -= 12;
      nextYear += 1;
    }
    setMonth(nextMonth);
    setYear(nextYear);
    onSelectDay(null);
  }

  const monthLabel = new Date(year, month, 1).toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <Stack gap="sm">
      <HStack justify="space-between" align="center">
        <Pressable
          onPress={() => step(-1)}
          style={{
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Text>‹</Text>
        </Pressable>
        <Text variant="title">{monthLabel}</Text>
        <Pressable
          onPress={() => step(1)}
          style={{
            paddingHorizontal: space.md,
            paddingVertical: space.sm,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <Text>›</Text>
        </Pressable>
      </HStack>

      <HStack gap="xs">
        {WEEKDAYS.map((d) => (
          <View key={d} style={{ flex: 1, alignItems: "center" }}>
            <Text variant="muted" style={{ fontSize: 10, textTransform: "uppercase" }}>
              {d}
            </Text>
          </View>
        ))}
      </HStack>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
        {cells.map((c, i) => {
          const dayBills = c.inMonth ? billsByDay.get(c.iso) ?? [] : [];
          let worst: BillCycleStatus | null = null;
          for (const b of dayBills) {
            const s = computeBillStatus(b.next_due_at, todayIso);
            if (!worst || STATUS_RANK[s] > STATUS_RANK[worst]) worst = s;
          }
          const isToday = c.iso === todayIso;
          const isSelected = c.iso && c.iso === selectedIso;
          return (
            <Pressable
              key={i}
              onPress={() => c.inMonth && onSelectDay(c.iso === selectedIso ? null : c.iso)}
              disabled={!c.inMonth}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: 1,
                paddingHorizontal: 2,
                paddingVertical: 4,
              }}
            >
              {c.inMonth ? (
                <View
                  style={{
                    flex: 1,
                    borderRadius: radius.sm,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.primary : isToday ? colors.text : colors.border,
                    backgroundColor: colors.surface,
                    padding: 4,
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: isToday ? "700" : "400",
                      color: colors.text,
                    }}
                  >
                    {c.day}
                  </Text>
                  {worst ? (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: STATUS_COLOR[worst],
                      }}
                    />
                  ) : (
                    <View style={{ width: 8, height: 8 }} />
                  )}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Stack>
  );
}
