import { Pressable, View } from "react-native";
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
          {" "}— your {fmtDollars(thresholdCents)} threshold.
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
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          <Pressable
            style={({ pressed }) => ({
              height: 32,
              paddingHorizontal: 14,
              borderRadius: 8,
              backgroundColor: p.brand,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ fontSize: 12, fontWeight: "500", color: p.brandOn }}>
              {transferCents > 0 ? `Transfer ${fmtDollars(transferCents)}` : "Transfer funds"}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => ({
              height: 32,
              paddingHorizontal: 14,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: `${p.warn}55`,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: 12, fontWeight: "500", color: p.warn }}>
              Adjust threshold
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
