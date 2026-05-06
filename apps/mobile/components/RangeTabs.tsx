import { Pressable, View } from "react-native";
import { Text, type Palette } from "@cvc/ui";

const RANGES = ["7D", "30D", "90D", "1Y"] as const;
export type RangeKey = (typeof RANGES)[number];

export const RANGE_DAYS: Record<RangeKey, number> = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
  "1Y": 365,
};

export function RangeTabs({
  value,
  onChange,
  palette: p,
}: {
  value: RangeKey;
  onChange: (k: RangeKey) => void;
  palette: Palette;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: p.tinted,
        padding: 3,
        borderRadius: 9,
        gap: 2,
      }}
    >
      {RANGES.map((k) => {
        const active = k === value;
        return (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            style={{
              flex: 1,
              height: 30,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? p.surface : "transparent",
              borderRadius: 7,
              ...(active
                ? {
                    shadowColor: "#000",
                    shadowOpacity: 0.06,
                    shadowOffset: { width: 0, height: 1 },
                    shadowRadius: 2,
                    elevation: 1,
                  }
                : {}),
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "500",
                color: active ? p.ink1 : p.ink2,
              }}
            >
              {k}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
