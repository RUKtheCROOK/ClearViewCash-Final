import { View } from "react-native";
import { Money, Text } from "@cvc/ui";
import { useTheme } from "../../lib/theme";

interface UpcomingBillRow {
  id: string;
  name: string;
  amountCents: number;
  dueDate: string;        // ISO date (YYYY-MM-DD)
  daysUntil: number;
  fundingAccountName: string | null;
  autopay: boolean;
}

interface Props {
  bills: UpcomingBillRow[];
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function UpcomingBillsCard({ bills }: Props) {
  const { palette } = useTheme();

  if (bills.length === 0) {
    return (
      <View
        style={{
          backgroundColor: palette.surface,
          borderColor: palette.line,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
        }}
      >
        <Text style={{ color: palette.ink2 }}>No bills due in the next 7 days.</Text>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: palette.surface,
        borderColor: palette.line,
        borderWidth: 1,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      {bills.map((b, i) => {
        const date = new Date(b.dueDate + "T00:00:00Z");
        const month = MONTHS[date.getUTCMonth()];
        const day = date.getUTCDate();
        const last = i === bills.length - 1;
        return (
          <View
            key={b.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderBottomColor: palette.line,
              borderBottomWidth: last ? 0 : 1,
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: palette.tinted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: "500", color: palette.ink3, letterSpacing: 0.5 }}>
                {month}
              </Text>
              <Text style={{ fontSize: 15, fontWeight: "600", color: palette.ink1, marginTop: 2 }}>
                {day}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{ fontSize: 14, fontWeight: "500", color: palette.ink1 }}
              >
                {b.name}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                <Text style={{ fontSize: 12, color: palette.ink3 }}>
                  {b.daysUntil <= 0 ? "today" : `in ${b.daysUntil} day${b.daysUntil === 1 ? "" : "s"}`}
                </Text>
                {b.fundingAccountName ? (
                  <>
                    <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: palette.ink4 }} />
                    <Text style={{ fontSize: 12, color: palette.ink3 }} numberOfLines={1}>
                      {b.fundingAccountName}
                    </Text>
                  </>
                ) : null}
                {b.autopay ? (
                  <View
                    style={{
                      backgroundColor: palette.tinted,
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "500",
                        letterSpacing: 0.4,
                        color: palette.ink2,
                      }}
                    >
                      AUTO
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <Money
              cents={-b.amountCents}
              style={{ fontSize: 14, fontWeight: "500", color: palette.ink1 }}
            />
          </View>
        );
      })}
    </View>
  );
}

export type { UpcomingBillRow };
