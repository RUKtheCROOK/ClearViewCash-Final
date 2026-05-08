import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { fonts, type Palette } from "@cvc/ui";
import { Num, fmtMoneyShort } from "./Num";
import { ChevDownIcon } from "./reportGlyphs";

export interface NetWorthTableRow {
  bucket: string;
  cashOnHand: number;
  debt: number;
  netWorth: number;
}

interface Props {
  palette: Palette;
  rows: NetWorthTableRow[];
}

export function NetWorthTable({ palette, rows }: Props) {
  const [open, setOpen] = useState(true);
  const last = rows[rows.length - 1];
  const first = rows[0];
  const delta = last && first ? last.netWorth - first.netWorth : 0;

  return (
    <View
      style={{
        padding: 16,
        paddingTop: 14,
        paddingBottom: 6,
        borderRadius: 16,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
      }}
    >
      <Pressable onPress={() => setOpen((v) => !v)} style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.num, fontSize: 10, color: palette.ink3, letterSpacing: 0.8, fontWeight: "600" }}>
            UNDERLYING DATA
          </Text>
          <Text
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 14,
              fontWeight: "500",
              color: palette.ink1,
              marginTop: 1,
            }}
          >
            {rows.length} bucket{rows.length === 1 ? "" : "s"}
          </Text>
        </View>
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <ChevDownIcon color={palette.ink3} />
        </View>
      </Pressable>

      {open ? (
        <>
          <View
            style={{
              marginTop: 12,
              paddingBottom: 8,
              borderBottomWidth: 1,
              borderBottomColor: palette.line,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text style={[colHeader, { flex: 1.4, color: palette.ink4 }]}>BUCKET</Text>
            <Text style={[colHeader, { flex: 1, textAlign: "right", color: palette.ink4 }]}>CASH</Text>
            <Text style={[colHeader, { flex: 1, textAlign: "right", color: palette.ink4 }]}>DEBT</Text>
            <Text style={[colHeader, { flex: 1.2, textAlign: "right", color: palette.ink4 }]}>NET WORTH</Text>
          </View>

          {rows.length === 0 ? (
            <Text style={{ paddingVertical: 14, fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
              Add an account to see net-worth history.
            </Text>
          ) : (
            rows.map((r, i) => (
              <View
                key={r.bucket}
                style={{
                  paddingVertical: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                  borderBottomColor: palette.line,
                }}
              >
                <Text
                  style={{
                    flex: 1.4,
                    fontFamily: fonts.uiMedium,
                    fontSize: 13,
                    color: palette.ink1,
                    fontWeight: "500",
                  }}
                >
                  {r.bucket}
                </Text>
                <Num style={{ flex: 1, textAlign: "right", fontSize: 13, color: palette.ink1, fontWeight: "500" }}>
                  {fmtMoneyShort(r.cashOnHand)}
                </Num>
                <Num style={{ flex: 1, textAlign: "right", fontSize: 13, color: palette.ink2, fontWeight: "500" }}>
                  {fmtMoneyShort(r.debt)}
                </Num>
                <Num
                  style={{
                    flex: 1.2,
                    textAlign: "right",
                    fontSize: 13,
                    color: r.netWorth < 0 ? palette.over : palette.ink1,
                    fontWeight: "600",
                  }}
                >
                  {fmtMoneyShort(r.netWorth)}
                </Num>
              </View>
            ))
          )}

          {rows.length > 1 ? (
            <View
              style={{
                paddingTop: 12,
                paddingBottom: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderTopWidth: 1,
                borderTopColor: palette.lineFirm,
              }}
            >
              <Text
                style={{
                  flex: 1.4,
                  fontFamily: fonts.uiMedium,
                  fontSize: 13,
                  color: palette.ink1,
                  fontWeight: "600",
                }}
              >
                Δ IN RANGE
              </Text>
              <View style={{ flex: 1 }} />
              <View style={{ flex: 1 }} />
              <Num
                style={{
                  flex: 1.2,
                  textAlign: "right",
                  fontSize: 13,
                  color: delta < 0 ? palette.over : palette.pos,
                  fontWeight: "700",
                }}
              >
                {`${delta >= 0 ? "+" : ""}${fmtMoneyShort(delta)}`}
              </Num>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const colHeader = {
  fontFamily: fonts.num,
  fontSize: 9.5,
  letterSpacing: 0.6,
  fontWeight: "600" as const,
};
