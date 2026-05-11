import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Text, I, fonts, type Palette } from "@cvc/ui";
import type { ForecastDay } from "@cvc/domain";

interface ScheduledEvent {
  date: string;
  kind: "bill" | "income" | "estimated_card_spend";
  source: string;
  name: string;
  amount: number;
  accountId: string | null;
  cadence?: string | null;
  note?: string | null;
  refId: string;
}

function collectScheduledEvents(days: ForecastDay[]): ScheduledEvent[] {
  const events: ScheduledEvent[] = [];
  for (const day of days) {
    for (const item of day.appliedItems) {
      if (item.source !== "scheduled") continue;
      events.push({
        date: day.date,
        kind: item.kind,
        source: item.source,
        name: item.name,
        amount: item.amount,
        accountId: item.accountId ?? null,
        cadence: item.cadence ?? null,
        note: item.note ?? null,
        refId: item.refId ?? `${day.date}-${item.name}`,
      });
    }
  }
  return events;
}

function fmtAmount(cents: number): string {
  const sign = cents < 0 ? "−$" : "+$";
  return `${sign}${Math.abs(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function parseDateParts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return { mon: "", num: 0, day: "" };
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    mon: dt.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
    num: d,
    day: dt.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
  };
}

export function EventsList({
  days,
  accountsById,
  whatIfRefIds,
  rangeLabel,
  palette: p,
}: {
  days: ForecastDay[];
  accountsById: Record<string, string>;
  whatIfRefIds: Set<string>;
  rangeLabel: string;
  palette: Palette;
}) {
  const events = collectScheduledEvents(days);

  if (events.length === 0) {
    return (
      <View>
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 18,
            paddingBottom: 6,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 11.5,
              fontWeight: "600",
              color: p.ink2,
              textTransform: "uppercase",
              letterSpacing: 0.7,
            }}
          >
            Upcoming · {rangeLabel}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: p.surface,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: p.line,
            paddingVertical: 22,
            paddingHorizontal: 20,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: p.ink1,
              textAlign: "center",
            }}
          >
            Nothing scheduled in the next {rangeLabel}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: p.ink3,
              marginTop: 4,
              textAlign: "center",
              lineHeight: 17,
            }}
          >
            Add a bill or income event so the forecast has something to project.
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <Pressable
              onPress={() => router.push("/bills")}
              style={({ pressed }) => ({
                height: 32,
                paddingHorizontal: 14,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: p.lineFirm,
                backgroundColor: p.surface,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 12, fontWeight: "500", color: p.ink1 }}>Add a bill</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/income")}
              style={({ pressed }) => ({
                height: 32,
                paddingHorizontal: 14,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: p.lineFirm,
                backgroundColor: p.surface,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 12, fontWeight: "500", color: p.ink1 }}>Add income</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 18,
          paddingBottom: 6,
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <Text
          style={{
            fontFamily: fonts.uiMedium,
            fontSize: 11.5,
            fontWeight: "600",
            color: p.ink2,
            textTransform: "uppercase",
            letterSpacing: 0.7,
          }}
        >
          Upcoming · {rangeLabel}
        </Text>
        <Text style={{ fontSize: 11.5, color: p.ink3 }}>{events.length} events</Text>
      </View>
      <View
        style={{
          backgroundColor: p.surface,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: p.line,
        }}
      >
        {events.map((e, i) => (
          <EventRow
            key={`${e.refId}-${e.date}-${i}`}
            event={e}
            accountsById={accountsById}
            isWhatIf={whatIfRefIds.has(e.refId)}
            isLast={i === events.length - 1}
            palette={p}
          />
        ))}
      </View>
    </View>
  );
}

function EventRow({
  event: e,
  accountsById,
  isWhatIf,
  isLast,
  palette: p,
}: {
  event: ScheduledEvent;
  accountsById: Record<string, string>;
  isWhatIf: boolean;
  isLast: boolean;
  palette: Palette;
}) {
  const isIncome = e.amount > 0;
  const isCard = e.kind === "estimated_card_spend";
  const dateParts = parseDateParts(e.date);
  const accountName = e.accountId ? accountsById[e.accountId] ?? null : null;

  const iconColor = isCard ? p.brand : isIncome ? p.pos : p.ink2;
  const iconBg = isCard ? p.brandTint : isIncome ? p.posTint : p.tinted;

  const meta: string[] = [];
  if (accountName) meta.push(accountName);
  if (e.cadence && e.cadence !== "custom" && e.cadence !== "once") meta.push("recurring");
  if (e.note) meta.push(e.note);

  // Navigable when the row maps to an editable record. Card-spend estimates
  // and what-if scenarios are read-only here.
  const navigable = !isCard && !isWhatIf;
  const onPress = navigable
    ? () => {
        if (e.kind === "income") router.push("/income");
        else if (e.kind === "bill") router.push("/bills");
      }
    : undefined;

  return (
    <Pressable
      onPress={onPress}
      disabled={!navigable}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: p.line,
        backgroundColor: isWhatIf ? p.brandTint : pressed && navigable ? p.sunken : "transparent",
        ...(isWhatIf ? { borderLeftWidth: 2, borderLeftColor: p.brand } : {}),
      })}
    >
      {/* Date block */}
      <View
        style={{
          width: 40,
          paddingVertical: 4,
          alignItems: "center",
          backgroundColor: p.sunken,
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 8.5, color: p.ink3, letterSpacing: 0.6 }}>{dateParts.mon}</Text>
        <Text
          style={{
            fontFamily: fonts.num,
            fontSize: 16,
            fontWeight: "600",
            color: p.ink1,
            lineHeight: 18,
          }}
        >
          {dateParts.num}
        </Text>
        <Text style={{ fontSize: 8.5, color: p.ink4, letterSpacing: 0.6 }}>{dateParts.day}</Text>
      </View>

      {/* Type icon */}
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isCard
          ? I.card({ color: iconColor, size: 14 })
          : isIncome
            ? I.arrowUp({ color: iconColor, size: 14 })
            : I.bolt({ color: iconColor, size: 14 })}
      </View>

      {/* Label + metadata */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: p.ink1 }} numberOfLines={1}>
            {e.name}
          </Text>
          {isWhatIf && (
            <View
              style={{
                backgroundColor: p.brandTint,
                paddingHorizontal: 5,
                paddingVertical: 1,
                borderRadius: 999,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.num,
                  fontSize: 9,
                  color: p.brand,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                what-if
              </Text>
            </View>
          )}
        </View>
        {meta.length > 0 && (
          <View style={{ flexDirection: "row", marginTop: 2, alignItems: "center" }}>
            {meta.map((m, idx) => (
              <View key={idx} style={{ flexDirection: "row", alignItems: "center" }}>
                {idx > 0 && (
                  <View
                    style={{
                      width: 3,
                      height: 3,
                      borderRadius: 999,
                      backgroundColor: p.ink4,
                      marginHorizontal: 6,
                    }}
                  />
                )}
                <Text style={{ fontSize: 11, color: p.ink3 }}>{m}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Amount */}
      <Text
        style={{
          fontFamily: fonts.num,
          fontSize: 14,
          fontWeight: "500",
          color: isWhatIf ? p.brand : isIncome ? p.pos : p.ink1,
        }}
      >
        {fmtAmount(e.amount)}
      </Text>
    </Pressable>
  );
}
