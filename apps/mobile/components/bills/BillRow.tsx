import { Pressable, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { resolveBillBranding, formatBillDateLabel, daysLate, type BillBucket } from "@cvc/domain";
import type { Palette } from "@cvc/ui";
import { fonts } from "@cvc/ui";
import { BillIcon } from "./BillIcon";
import { Num, fmtMoneyDollars } from "./Num";

export interface BillRowDataMobile {
  id: string;
  name: string;
  amount: number;
  next_due_at: string;
  cadence: string;
  autopay: boolean;
  category: string | null;
  payee_hue: number | null;
  payee_glyph: string | null;
  source: "manual" | "detected";
  recurring_group_id: string | null;
  latest_payment: { id: string; paid_at: string; amount: number; prev_next_due_at: string | null } | null;
}

interface Props {
  bill: BillRowDataMobile;
  bucket: BillBucket;
  todayIso: string;
  accountLabel: string | null;
  palette: Palette;
  mode: "light" | "dark";
  onPress: () => void;
  onLongPress?: () => void;
  onMarkPaid?: () => void;
  onLongPressMarkPaid?: () => void;
  onUnmarkPaid?: () => void;
  paying?: boolean;
  selected?: boolean;
  selectMode?: boolean;
}

export function BillRow({ bill, bucket, todayIso, accountLabel, palette, mode, onPress, onLongPress, onMarkPaid, onLongPressMarkPaid, onUnmarkPaid, paying, selected, selectMode }: Props) {
  const branding = resolveBillBranding(bill);
  const dim = bucket === "paid";
  const amountColor = dim ? palette.ink3 : palette.ink1;
  const dateLabel = formatBillDateLabel(bill, todayIso);
  const isRecurring = bill.cadence !== "once" && bill.cadence !== "custom";
  const lateBy = bucket === "overdue" ? daysLate(bill.next_due_at, todayIso) : 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      android_ripple={{ color: palette.tinted }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: palette.line,
        backgroundColor: selected ? palette.brandTint : undefined,
        opacity: dim ? 0.7 : pressed ? 0.85 : 1,
      })}
    >
      {selectMode ? (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 999,
            borderWidth: 2,
            borderColor: selected ? palette.brand : palette.lineFirm,
            backgroundColor: selected ? palette.brand : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {selected ? (
            <Svg width={12} height={12} viewBox="0 0 24 24">
              <Path d="M5 12l4 4 10-10" fill="none" stroke={palette.brandOn} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          ) : null}
        </View>
      ) : null}
      <BillIcon hue={branding.hue} glyph={branding.glyph} mode={mode} dim={dim} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 14.5,
              fontWeight: "500",
              color: palette.ink1,
              flexShrink: 1,
            }}
          >
            {bill.name}
          </Text>
          {isRecurring ? <RecurIcon color={palette.ink3} /> : null}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
          <Text style={{ fontSize: 11.5, color: palette.ink3, fontFamily: fonts.ui }}>{dateLabel}</Text>
          {accountLabel ? (
            <>
              <Dot color={palette.ink4} />
              <Text style={{ fontSize: 11.5, color: palette.ink3, fontFamily: fonts.ui }}>{accountLabel}</Text>
            </>
          ) : null}
        </View>
      </View>

      <View style={{ alignItems: "flex-end" }}>
        <Num style={{ fontSize: 14.5, fontWeight: "600", color: amountColor }}>
          {dim ? "−" : ""}
          {fmtMoneyDollars(bill.amount)}
        </Num>
        <View style={{ flexDirection: "row", marginTop: 4, gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {bucket === "overdue" ? (
            <Badge bg={palette.warnTint} fg={palette.warn}>
              {lateBy}D LATE
            </Badge>
          ) : null}
          {bill.autopay && bucket !== "paid" ? (
            <Badge bg={palette.brandTint} fg={palette.brand}>
              AUTO
            </Badge>
          ) : null}
          {bucket === "paid" ? (
            <Badge bg={palette.posTint} fg={palette.pos}>
              PAID
            </Badge>
          ) : null}
        </View>
        {(() => {
          if (selectMode) return null;
          const isPaid = bucket === "paid";
          const handler = isPaid ? onUnmarkPaid : onMarkPaid;
          if (!handler) return null;
          return (
            <Pressable
              onPress={handler}
              onLongPress={isPaid ? undefined : onLongPressMarkPaid}
              delayLongPress={400}
              disabled={paying}
              style={({ pressed }) => ({
                marginTop: 4,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: palette.lineFirm,
                backgroundColor: palette.surface,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 11, fontWeight: "500", color: palette.ink2, fontFamily: fonts.ui }}>
                {paying ? "Saving…" : isPaid ? "Unmark paid" : "Mark paid"}
              </Text>
            </Pressable>
          );
        })()}
      </View>
    </Pressable>
  );
}

function Badge({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: bg,
      }}
    >
      <Text style={{ fontSize: 9.5, fontWeight: "600", letterSpacing: 0.5, color: fg, fontFamily: fonts.num }}>
        {children}
      </Text>
    </View>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: color }} />;
}

function RecurIcon({ color }: { color: string }) {
  return (
    <Svg width={11} height={11} viewBox="0 0 24 24">
      <Path d="M21 12a9 9 0 11-3-6.7" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21 4v5h-5" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
