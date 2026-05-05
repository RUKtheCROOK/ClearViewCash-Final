import { View } from "react-native";
import { Money, Text } from "@cvc/ui";
import type { NetWorthSnapshot } from "@cvc/domain";
import { useTheme } from "../../lib/theme";

interface Props {
  snapshot: NetWorthSnapshot;
}

export function NetWorthCard({ snapshot }: Props) {
  const { palette } = useTheme();
  const { assetsCents, liabilitiesCents, netCents, liabilityRatio } = snapshot;
  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.line,
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 12, color: palette.ink3 }}>Net worth</Text>
          <Money cents={netCents} style={{ fontSize: 22, fontWeight: "500", color: palette.ink1 }} />
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
            <Text style={{ fontSize: 12, color: palette.ink3 }}>Assets</Text>
            <Money cents={assetsCents} style={{ fontSize: 12, color: palette.ink1 }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 2 }}>
            <Text style={{ fontSize: 12, color: palette.ink3 }}>Liab.</Text>
            <Money cents={-liabilitiesCents} style={{ fontSize: 12, color: palette.ink2 }} />
          </View>
        </View>
      </View>
      <View
        style={{
          marginTop: 10,
          height: 4,
          borderRadius: 2,
          backgroundColor: palette.tinted,
          overflow: "hidden",
          flexDirection: "row",
        }}
      >
        <View style={{ flex: 1 - liabilityRatio, backgroundColor: palette.ink2, opacity: 0.6 }} />
        <View style={{ flex: liabilityRatio, backgroundColor: palette.ink4 }} />
      </View>
    </View>
  );
}
