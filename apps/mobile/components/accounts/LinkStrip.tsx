import { View } from "react-native";
import { I, Text } from "@cvc/ui";
import { hueForCardId, tintForHue, type LinkTintMode } from "@cvc/domain";
import { useTheme } from "../../lib/theme";

export interface LinkChip {
  /** Stable id used to derive the hue (the card account id on both sides). */
  hueKey: string;
  label: string;
  /** Optional split percentage shown after the label. */
  share?: number | null;
}

interface Props {
  direction: "out" | "in";
  links: LinkChip[];
}

export function LinkStrip({ direction, links }: Props) {
  const { mode, palette } = useTheme();
  if (links.length === 0) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        rowGap: 6,
        columnGap: 6,
        paddingTop: 10,
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: palette.line,
        borderStyle: "dashed",
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginRight: 2 }}>
        {direction === "out" ? (
          <I.arrowR color={palette.ink3} size={11} />
        ) : (
          <I.arrowL color={palette.ink3} size={11} />
        )}
        <Text
          style={{
            fontSize: 10.5,
            fontWeight: "500",
            textTransform: "uppercase",
            letterSpacing: 0.85,
            color: palette.ink3,
          }}
        >
          {direction === "out" ? "Pays for" : "Paid by"}
        </Text>
      </View>
      {links.map((l, i) => {
        const tint = tintForHue(hueForCardId(l.hueKey), mode as LinkTintMode);
        return (
          <View
            key={`${l.hueKey}-${i}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingVertical: 3,
              paddingLeft: 6,
              paddingRight: 8,
              borderRadius: 999,
              backgroundColor: tint.pillBg,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: tint.swatch,
              }}
            />
            <Text style={{ fontSize: 11.5, fontWeight: "500", color: tint.pillFg }}>
              {l.label}
            </Text>
            {l.share != null ? (
              <Text
                style={{
                  fontFamily: "Menlo",
                  fontSize: 10.5,
                  color: tint.pillFg,
                  opacity: 0.85,
                  marginLeft: 2,
                }}
              >
                · {l.share}%
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
