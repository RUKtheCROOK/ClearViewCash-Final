import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { resolveBillBranding } from "@cvc/domain";
import type { Palette, ThemeMode } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { BillIcon } from "./BillIcon";
import { Num, fmtMoneyDollars } from "./Num";

export interface DetectedPattern {
  groupId: string;
  merchantName: string;
  medianCents: number;
  cadence: "weekly" | "biweekly" | "monthly" | "yearly" | "custom" | "once";
  dayOfMonth: number | null;
  recentCharges: Array<{ posted_at: string; amount: number }>;
  fromAccountLabel: string | null;
  isInbound: boolean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function formatChargeDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

interface Props {
  pattern: DetectedPattern;
  palette: Palette;
  mode: ThemeMode;
  busy?: boolean;
  onAdd: () => void;
  onDismiss: () => void;
  compact?: boolean;
}

export function RecurringDetectCard({ pattern, palette, mode, busy, onAdd, onDismiss, compact }: Props) {
  const branding = resolveBillBranding({
    name: pattern.merchantName,
    category: null,
    payee_hue: null,
    payee_glyph: null,
  });
  const cadenceLabel = (() => {
    if (pattern.cadence === "monthly" && pattern.dayOfMonth) return `the ${ordinal(pattern.dayOfMonth)} of every month`;
    if (pattern.cadence === "weekly") return "every week";
    if (pattern.cadence === "biweekly") return "every two weeks";
    if (pattern.cadence === "yearly") return "every year";
    return "regularly";
  })();
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 10,
        marginBottom: 4,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
      }}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: palette.infoTint,
          borderBottomWidth: 1,
          borderBottomColor: palette.line,
        }}
      >
        <SparkleIcon color={palette.info} />
        <Text style={{ fontFamily: fonts.num, fontSize: 10.5, fontWeight: "600", letterSpacing: 0.5, color: palette.info }}>
          PATTERN DETECTED
        </Text>
      </View>
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <BillIcon hue={branding.hue} glyph={branding.glyph} mode={mode} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 14.5, fontWeight: "500", color: palette.ink1 }}>
              {pattern.merchantName}
            </Text>
            <Text style={{ fontFamily: fonts.ui, fontSize: 12.5, color: palette.ink2, marginTop: 4, lineHeight: 18 }}>
              {pattern.isInbound ? "Receives" : "Charged"}{" "}
              <Text style={{ color: palette.ink1, fontWeight: "500" }}>{fmtMoneyDollars(Math.abs(pattern.medianCents))}</Text>
              {" on "}{cadenceLabel}
              {pattern.fromAccountLabel ? (
                <>
                  {" from "}
                  <Text style={{ color: palette.ink1, fontWeight: "500" }}>{pattern.fromAccountLabel}</Text>
                </>
              ) : null}
              . Track it as {pattern.isInbound ? "an income event" : "a bill"}?
            </Text>
          </View>
        </View>

        {!compact && pattern.recentCharges.length > 0 ? (
          <View
            style={{
              marginTop: 12,
              padding: 10,
              borderRadius: 10,
              backgroundColor: palette.sunken,
              flexDirection: "row",
              gap: 6,
            }}
          >
            {pattern.recentCharges.slice(0, 3).map((c, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.num, fontSize: 9.5, color: palette.ink3, letterSpacing: 0.4 }}>
                  {formatChargeDate(c.posted_at).toUpperCase()}
                </Text>
                <Num style={{ fontSize: 12.5, fontWeight: "600", color: palette.ink1, marginTop: 2 }}>
                  {fmtMoneyDollars(Math.abs(c.amount))}
                </Num>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
          <Pressable
            disabled={busy}
            onPress={onAdd}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              backgroundColor: palette.brand,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.brandOn }}>
              {busy ? "Adding…" : `Add as ${pattern.isInbound ? "income" : "bill"}`}
            </Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={onDismiss}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: palette.lineFirm,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, fontWeight: "500", color: palette.ink2 }}>
              {pattern.isInbound ? "Not income" : "Not a bill"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function SparkleIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24">
      <Path d="M12 3v6M12 15v6M3 12h6M15 12h6" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
