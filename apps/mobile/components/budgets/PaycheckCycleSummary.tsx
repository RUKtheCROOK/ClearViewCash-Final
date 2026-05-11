import { Pressable, Text, View } from "react-native";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { Num, fmtMoneyShort } from "./Num";
import { ProgressBar } from "./ProgressBar";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtRange(startIso: string, endIso: string): string {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  const sm = MONTHS_SHORT[start.getUTCMonth()] ?? "";
  const em = MONTHS_SHORT[end.getUTCMonth()] ?? "";
  return `${sm} ${start.getUTCDate()} → ${em} ${end.getUTCDate()}`;
}

interface Props {
  palette: Palette;
  receivedCents: number;
  spentCents: number;
  daysUntilNext: number;
  startIso: string;
  endIso: string;
  startIsFromReceipt: boolean;
  cadenceLabel?: string;
}

export function PaycheckCycleSummary({
  palette,
  receivedCents,
  spentCents,
  daysUntilNext,
  startIso,
  endIso,
  startIsFromReceipt,
  cadenceLabel,
}: Props) {
  const remainingCents = receivedCents - spentCents;
  const overdue = daysUntilNext < 0;
  const safeDays = Math.max(1, daysUntilNext);
  const dailySafeCents = Math.round(Math.max(0, remainingCents) / safeDays);
  const headlineColor = remainingCents < 0 ? palette.warn : palette.ink1;

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
      <View
        style={{
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: 16,
          borderRadius: 18,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Text style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink3, letterSpacing: 1 }}>
            REMAINING THIS CYCLE
          </Text>
          {overdue ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: palette.warnTint,
              }}
            >
              <Text style={{ fontFamily: fonts.uiMedium, fontSize: 11, fontWeight: "600", color: palette.warn }}>
                Overdue by {Math.abs(daysUntilNext)}d
              </Text>
            </View>
          ) : (
            <Text style={{ fontFamily: fonts.ui, fontSize: 11, color: palette.ink4 }}>
              {fmtRange(startIso, endIso)}
            </Text>
          )}
        </View>

        <View style={{ marginTop: 8, flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <Num style={{ fontSize: 32, fontWeight: "600", color: headlineColor, letterSpacing: -0.6 }}>
            {fmtMoneyShort(remainingCents)}
          </Num>
          <Text style={{ fontFamily: fonts.ui, fontSize: 14, color: palette.ink3 }}>
            <Num style={{ color: palette.ink2, fontWeight: "500" }}>{fmtMoneyShort(spentCents)}</Num> spent of{" "}
            <Num style={{ color: palette.ink2, fontWeight: "500" }}>{fmtMoneyShort(receivedCents)}</Num> received
          </Text>
        </View>

        <View style={{ marginTop: 12 }}>
          <ProgressBar palette={palette} spent={spentCents} limit={Math.max(receivedCents, 1)} height={8} />
        </View>

        {!startIsFromReceipt ? (
          <Text
            style={{
              marginTop: 8,
              fontFamily: fonts.ui,
              fontSize: 11,
              color: palette.ink4,
            }}
          >
            Estimated cycle start{cadenceLabel ? ` — ${cadenceLabel}` : ""}
          </Text>
        ) : null}

        <View
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: palette.line,
            flexDirection: "row",
            gap: 10,
          }}
        >
          <Stat
            palette={palette}
            label="DAYS LEFT"
            val={daysUntilNext === 0 ? "Today" : `${Math.max(0, daysUntilNext)}`}
            sub={overdue ? "overdue" : "until next paycheck"}
            warn={overdue}
          />
          <Stat palette={palette} label="DAILY SAFE" val={fmtMoneyShort(dailySafeCents)} sub="left to spend" />
          <Stat palette={palette} label="CYCLE" val={fmtRange(startIso, endIso)} small />
        </View>
      </View>
    </View>
  );
}

function Stat({
  palette,
  label,
  val,
  sub,
  warn,
  small,
}: {
  palette: Palette;
  label: string;
  val: string;
  sub?: string;
  warn?: boolean;
  small?: boolean;
}) {
  const valColor = warn ? palette.warn : palette.ink1;
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontFamily: fonts.num, fontSize: 11, color: palette.ink3, letterSpacing: 0.8, fontWeight: "600" }}>
        {label}
      </Text>
      <View style={{ marginTop: 4, flexDirection: "row", alignItems: "baseline", gap: 4 }}>
        <Num style={{ fontSize: small ? 13 : 16, fontWeight: "600", color: valColor }}>{val}</Num>
        {sub ? <Text style={{ fontFamily: fonts.ui, fontSize: 10, color: palette.ink3 }}>{sub}</Text> : null}
      </View>
    </View>
  );
}

interface EmptyProps {
  palette: Palette;
  reason: "no-income" | "all-paused" | "no-paycheck";
  onAddIncome?: () => void;
}

export function PaycheckCycleEmpty({ palette, reason, onAddIncome }: EmptyProps) {
  const copy =
    reason === "all-paused"
      ? "All paychecks are paused. Resume one to see your cycle."
      : "Add a paycheck on the Income tab to enable this view.";

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
      <View
        style={{
          padding: 18,
          borderRadius: 18,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Text style={{ flex: 1, fontFamily: fonts.ui, fontSize: 13, color: palette.ink2 }}>{copy}</Text>
        {onAddIncome ? (
          <Pressable
            onPress={onAddIncome}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: palette.brand,
            }}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "600", color: palette.brandOn }}>
              Open Income
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
