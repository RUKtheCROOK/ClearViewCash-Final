import { View } from "react-native";
import { Text, I, fonts, type Palette } from "@cvc/ui";

function fmtDollars(cents: number): string {
  return `$${Math.abs(Math.floor(cents / 100)).toLocaleString("en-US")}`;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function LowBalanceBanner({
  date,
  projectedLowCents,
  thresholdCents,
  palette: p,
}: {
  date: string;
  projectedLowCents: number;
  thresholdCents: number;
  palette: Palette;
}) {
  const deficitCents = Math.max(0, thresholdCents - projectedLowCents);
  // Round transfer suggestion up to the next $100.
  const transferCents = Math.ceil(deficitCents / 10000) * 10000;

  return (
    <View
      style={{
        backgroundColor: p.warnTint,
        borderWidth: 1,
        borderColor: `${p.warn}33`,
        borderRadius: 12,
        padding: 12,
        paddingHorizontal: 14,
        flexDirection: "row",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <View style={{ marginTop: 2 }}>{I.alert({ color: p.warn, size: 14 })}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: p.warn }}>
          Below your floor on {fmtDate(date)}
        </Text>
        <Text style={{ fontSize: 12, marginTop: 2, lineHeight: 18, color: p.ink2 }}>
          Projected to dip to{" "}
          <Text style={{ fontFamily: fonts.num, fontWeight: "600", color: p.warn }}>
            {fmtDollars(projectedLowCents)}
          </Text>
          {" "}— below your {fmtDollars(thresholdCents)} floor.
          {transferCents > 0 ? (
            <>
              {" "}Move{" "}
              <Text style={{ fontFamily: fonts.num, fontWeight: "600", color: p.ink1 }}>
                {fmtDollars(transferCents)}
              </Text>
              {" "}from savings to stay safe.
            </>
          ) : null}
        </Text>
      </View>
    </View>
  );
}
