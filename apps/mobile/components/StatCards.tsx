import { View } from "react-native";
import { Text, fonts, type Palette } from "@cvc/ui";

function fmtDollars(cents: number, showSign = false): string {
  const negative = cents < 0;
  const sign = negative ? "−" : showSign ? "+" : "";
  return `${sign}$${Math.abs(Math.floor(cents / 100)).toLocaleString("en-US")}`;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function StatCards({
  todayCents,
  lowestCents,
  lowestDate,
  lowestBelowFloor,
  netCents,
  palette: p,
}: {
  todayCents: number;
  lowestCents: number;
  lowestDate: string;
  lowestBelowFloor: boolean;
  netCents: number;
  palette: Palette;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Stat eyebrow="TODAY" value={fmtDollars(todayCents)} sub="balance" p={p} />
      <Stat
        eyebrow="LOWEST"
        value={fmtDollars(lowestCents)}
        sub={lowestDate ? `${fmtDate(lowestDate)} · ${lowestBelowFloor ? "below floor" : "safe"}` : "—"}
        warn={lowestBelowFloor}
        p={p}
      />
      <Stat eyebrow="NET 30D" value={fmtDollars(netCents, true)} sub="change" p={p} />
    </View>
  );
}

function Stat({
  eyebrow,
  value,
  sub,
  warn,
  p,
}: {
  eyebrow: string;
  value: string;
  sub: string;
  warn?: boolean;
  p: Palette;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: p.surface,
        borderWidth: 1,
        borderColor: warn ? p.warn : p.line,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.uiMedium,
          fontSize: 9.5,
          fontWeight: "600",
          color: p.ink3,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {eyebrow}
      </Text>
      <Text
        style={{
          fontFamily: fonts.num,
          fontSize: 16,
          fontWeight: "600",
          color: warn ? p.warn : p.ink1,
          marginTop: 2,
        }}
      >
        {value}
      </Text>
      <Text style={{ fontSize: 10.5, color: warn ? p.warn : p.ink3, marginTop: 1 }}>{sub}</Text>
    </View>
  );
}
