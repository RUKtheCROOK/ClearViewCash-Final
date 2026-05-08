import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { fonts, type Palette } from "@cvc/ui";
import { Num, fmtMoneyShort } from "./Num";
import { ChevDownIcon } from "./reportGlyphs";

export interface CashFlowTableRow {
  bucket: string;
  cashIn: number;
  cashOut: number;
  net: number;
}

interface Props {
  palette: Palette;
  rows: CashFlowTableRow[];
}

export function CashFlowTable({ palette, rows }: Props) {
  const [open, setOpen] = useState(true);
  const totalIn = rows.reduce((s, r) => s + r.cashIn, 0);
  const totalOut = rows.reduce((s, r) => s + r.cashOut, 0);
  const totalNet = totalIn - totalOut;

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
            <Text style={[colHeader, { flex: 1.6, color: palette.ink4 }]}>BUCKET</Text>
            <Text style={[colHeader, { flex: 1, textAlign: "right", color: palette.ink4 }]}>IN</Text>
            <Text style={[colHeader, { flex: 1, textAlign: "right", color: palette.ink4 }]}>OUT</Text>
            <Text style={[colHeader, { flex: 1, textAlign: "right", color: palette.ink4 }]}>NET</Text>
          </View>

          {rows.length === 0 ? (
            <Text style={{ paddingVertical: 14, fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
              No transactions in this range.
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
                    flex: 1.6,
                    fontFamily: fonts.uiMedium,
                    fontSize: 13,
                    color: palette.ink1,
                    fontWeight: "500",
                  }}
                >
                  {r.bucket}
                </Text>
                <Num style={{ flex: 1, textAlign: "right", fontSize: 13, color: palette.pos, fontWeight: "500" }}>
                  {fmtMoneyShort(r.cashIn)}
                </Num>
                <Num style={{ flex: 1, textAlign: "right", fontSize: 13, color: palette.ink2, fontWeight: "500" }}>
                  {fmtMoneyShort(-r.cashOut)}
                </Num>
                <Num
                  style={{
                    flex: 1,
                    textAlign: "right",
                    fontSize: 13,
                    color: r.net < 0 ? palette.over : palette.ink1,
                    fontWeight: "600",
                  }}
                >
                  {fmtMoneyShort(r.net)}
                </Num>
              </View>
            ))
          )}

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
                flex: 1.6,
                fontFamily: fonts.uiMedium,
                fontSize: 13,
                color: palette.ink1,
                fontWeight: "600",
              }}
            >
              TOTAL
            </Text>
            <Num style={{ flex: 1, textAlign: "right", fontSize: 13, color: palette.pos, fontWeight: "600" }}>
              {fmtMoneyShort(totalIn)}
            </Num>
            <Num style={{ flex: 1, textAlign: "right", fontSize: 13, color: palette.ink2, fontWeight: "600" }}>
              {fmtMoneyShort(-totalOut)}
            </Num>
            <Num
              style={{
                flex: 1,
                textAlign: "right",
                fontSize: 13,
                color: totalNet < 0 ? palette.over : palette.ink1,
                fontWeight: "700",
              }}
            >
              {fmtMoneyShort(totalNet)}
            </Num>
          </View>
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
