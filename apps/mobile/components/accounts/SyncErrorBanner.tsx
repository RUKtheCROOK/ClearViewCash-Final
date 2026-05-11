import { Pressable, View } from "react-native";
import { I, Text } from "@cvc/ui";
import { useTheme } from "../../lib/theme";

export interface SyncErrorItem {
  itemRowId: string;
  institutionName: string;
}

interface Props {
  items: SyncErrorItem[];
  reconnectingItemId: string | null;
  onReconnect: (itemRowId: string) => void;
}

export function SyncErrorBanner({ items, reconnectingItemId, onReconnect }: Props) {
  const { palette } = useTheme();
  if (items.length === 0) return null;

  const titleCount = items.length === 1 ? "1 institution" : `${items.length} institutions`;
  const titleVerb = items.length === 1 ? "needs reconnecting" : "need reconnecting";

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
      <View
        style={{
          backgroundColor: palette.warnTint,
          borderColor: palette.warn,
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <I.syncErr color={palette.warn} size={16} />
          <Text style={{ fontSize: 13.5, fontWeight: "600", color: palette.warn, flex: 1 }}>
            {titleCount} {titleVerb}
          </Text>
        </View>
        <Text style={{ fontSize: 12, color: palette.ink2, lineHeight: 17, marginBottom: 6 }}>
          Balances on affected accounts may be out of date until you reconnect.
        </Text>
        <View style={{ gap: 2 }}>
          {items.map((it) => {
            const busy = reconnectingItemId === it.itemRowId;
            return (
              <Pressable
                key={it.itemRowId}
                onPress={() => onReconnect(it.itemRowId)}
                disabled={busy}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 10,
                  borderTopColor: palette.warn,
                  borderTopWidth: 1,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 13, color: palette.ink1, fontWeight: "500", flex: 1 }} numberOfLines={1}>
                  {it.institutionName}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: palette.warn,
                      textTransform: "uppercase",
                      letterSpacing: 0.7,
                    }}
                  >
                    {busy ? "Reconnecting…" : "Reconnect"}
                  </Text>
                  <I.chevR color={palette.warn} size={12} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
