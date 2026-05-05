import { Text, View } from "react-native";
import type { UpcomingSummary } from "@cvc/domain";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { Num, fmtMoneyDollars } from "./Num";

export function UpcomingStrip({ summary, palette }: { summary: UpcomingSummary; palette: Palette }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
      <View
        style={{
          backgroundColor: palette.brandTint,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Section
          eyebrow="NEXT 7 DAYS"
          totalCents={summary.next7.totalCents}
          count={summary.next7.count}
          autopayCount={summary.next7.autopayCount}
          palette={palette}
        />
        <View style={{ width: 1, height: 36, backgroundColor: palette.brand, opacity: 0.25, marginHorizontal: 10 }} />
        <Section
          eyebrow="NEXT 30 DAYS"
          totalCents={summary.next30.totalCents}
          count={summary.next30.count}
          autopayCount={summary.next30.autopayCount}
          palette={palette}
        />
      </View>
    </View>
  );
}

function Section({
  eyebrow,
  totalCents,
  count,
  autopayCount,
  palette,
}: {
  eyebrow: string;
  totalCents: number;
  count: number;
  autopayCount: number;
  palette: Palette;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: fonts.num, fontSize: 10.5, color: palette.brand, letterSpacing: 0.5 }}>{eyebrow}</Text>
      <Num style={{ fontSize: 20, fontWeight: "600", color: palette.ink1, marginTop: 2 }}>
        {fmtMoneyDollars(totalCents)}
      </Num>
      <Text style={{ fontSize: 11.5, color: palette.ink2, marginTop: 1, fontFamily: fonts.ui }}>
        {count} {count === 1 ? "bill" : "bills"}
        {autopayCount > 0 ? ` · ${autopayCount} on autopay` : ""}
      </Text>
    </View>
  );
}
