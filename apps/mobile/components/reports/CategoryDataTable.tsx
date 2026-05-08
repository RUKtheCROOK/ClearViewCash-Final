import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { fonts, type Palette } from "@cvc/ui";
import { Num, fmtMoneyShort } from "./Num";
import { categoryColor } from "./categoryHues";
import { ChevDownIcon } from "./reportGlyphs";

export interface CategoryTableRow {
  id: string;
  name: string;
  hue: number;
  amount: number;
  txns: number;
  pct: number;
  deltaPct: number | null;
}

interface Props {
  palette: Palette;
  mode: "light" | "dark";
  rows: CategoryTableRow[];
  totalAmount: number;
  totalTxns: number;
  totalDeltaPct: number | null;
  focusedId?: string | null;
  onFocus?: (id: string | null) => void;
}

export function CategoryDataTable({
  palette,
  mode,
  rows,
  totalAmount,
  totalTxns,
  totalDeltaPct,
  focusedId,
  onFocus,
}: Props) {
  const [open, setOpen] = useState(true);

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
          <Text
            style={{
              fontFamily: fonts.num,
              fontSize: 10,
              color: palette.ink3,
              letterSpacing: 0.8,
              fontWeight: "600",
            }}
          >
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
            All {rows.length} categor{rows.length === 1 ? "y" : "ies"}
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
            <Text style={[colHeader, { flex: 2.4, color: palette.ink4 }]}>CATEGORY</Text>
            <Text style={[colHeader, { width: 50, textAlign: "right", color: palette.ink4 }]}>TXNS</Text>
            <Text style={[colHeader, { width: 70, textAlign: "right", color: palette.ink4 }]}>AMOUNT</Text>
            <Text style={[colHeader, { width: 55, textAlign: "right", color: palette.ink4 }]}>Δ MoM</Text>
          </View>

          {rows.length === 0 ? (
            <Text style={{ paddingVertical: 14, fontFamily: fonts.ui, fontSize: 12, color: palette.ink3 }}>
              No categories in this range.
            </Text>
          ) : (
            rows.map((r, i) => {
              const isFocus = focusedId === r.id;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => onFocus?.(isFocus ? null : r.id)}
                  style={{
                    paddingVertical: 10,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    borderBottomWidth: i === rows.length - 1 ? 0 : 1,
                    borderBottomColor: palette.line,
                    backgroundColor: isFocus ? palette.sunken : "transparent",
                  }}
                >
                  <View style={{ flex: 2.4, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: categoryColor(r.hue, mode),
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontFamily: fonts.uiMedium,
                          fontSize: 13,
                          color: palette.ink1,
                          fontWeight: "500",
                        }}
                      >
                        {r.name}
                      </Text>
                      <Text style={{ fontFamily: fonts.num, fontSize: 10, color: palette.ink3, marginTop: 1 }}>
                        {Math.round(r.pct)}%
                      </Text>
                    </View>
                  </View>
                  <Num style={{ width: 50, textAlign: "right", fontSize: 12, color: palette.ink2 }}>{r.txns}</Num>
                  <Num
                    style={{
                      width: 70,
                      textAlign: "right",
                      fontSize: 13,
                      fontWeight: "500",
                      color: palette.ink1,
                    }}
                  >
                    {fmtMoneyShort(r.amount)}
                  </Num>
                  <DeltaCell deltaPct={r.deltaPct} palette={palette} width={55} />
                </Pressable>
              );
            })
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
                flex: 2.4,
                fontFamily: fonts.uiMedium,
                fontSize: 13,
                color: palette.ink1,
                fontWeight: "600",
              }}
            >
              TOTAL
            </Text>
            <Num style={{ width: 50, textAlign: "right", fontSize: 12, color: palette.ink2, fontWeight: "600" }}>
              {totalTxns}
            </Num>
            <Num style={{ width: 70, textAlign: "right", fontSize: 13, fontWeight: "600", color: palette.ink1 }}>
              {fmtMoneyShort(totalAmount)}
            </Num>
            <DeltaCell deltaPct={totalDeltaPct} palette={palette} width={55} bold />
          </View>
        </>
      ) : null}
    </View>
  );
}

function DeltaCell({
  deltaPct,
  palette,
  width,
  bold,
}: {
  deltaPct: number | null;
  palette: Palette;
  width: number;
  bold?: boolean;
}) {
  if (deltaPct === null) {
    return (
      <Text
        style={{
          width,
          textAlign: "right",
          color: palette.ink3,
          fontFamily: fonts.num,
          fontSize: 11,
        }}
      >
        —
      </Text>
    );
  }
  const rounded = Math.round(deltaPct);
  const isUp = rounded > 0;
  const isFlat = rounded === 0;
  const color = isFlat ? palette.ink3 : isUp ? palette.over : palette.pos;
  const label = isFlat ? "flat" : `${isUp ? "+" : ""}${rounded}%`;
  return (
    <Text
      style={{
        width,
        textAlign: "right",
        color,
        fontFamily: fonts.num,
        fontSize: 11,
        fontWeight: bold || !isFlat ? "600" : "500",
      }}
    >
      {label}
    </Text>
  );
}

const colHeader = {
  fontFamily: fonts.num,
  fontSize: 9.5,
  letterSpacing: 0.6,
  fontWeight: "600" as const,
};
