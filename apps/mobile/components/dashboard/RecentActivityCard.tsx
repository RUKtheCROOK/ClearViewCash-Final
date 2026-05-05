import { Pressable, View } from "react-native";
import { I, Money, Text, type IconKey } from "@cvc/ui";
import { displayMerchantName } from "@cvc/domain";
import { useTheme } from "../../lib/theme";
import type { EditableTxn } from "../TransactionEditSheet";

interface Props {
  transactions: EditableTxn[];
  accountNameById: Map<string, string>;
  onPressTxn: (txn: EditableTxn) => void;
}

const CATEGORY_ICON: Record<string, IconKey> = {
  groceries: "cart",
  dining: "coffee",
  food: "coffee",
  utilities: "bolt",
  transportation: "card",
  shopping: "cart",
  entertainment: "film",
  income: "bolt",
  housing: "home",
};

function categoryIcon(category: string | null | undefined): IconKey {
  if (!category) return "card";
  const key = category.toLowerCase();
  return CATEGORY_ICON[key] ?? "card";
}

function whenLabel(postedAt: string, pending: boolean): string {
  if (pending) return "PEND";
  const today = new Date();
  const posted = new Date(postedAt + "T00:00:00Z");
  const diff = Math.round((today.getTime() - posted.getTime()) / 86400000);
  if (diff <= 0) {
    return today.toISOString().slice(11, 16);
  }
  if (diff === 1) return "YST";
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${posted.getUTCDate().toString().padStart(2, "0")} ${months[posted.getUTCMonth()]}`;
}

export function RecentActivityCard({ transactions, accountNameById, onPressTxn }: Props) {
  const { palette } = useTheme();

  if (transactions.length === 0) {
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
        <Text style={{ color: palette.ink2 }}>No recent activity.</Text>
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
      {transactions.map((t, i) => {
        const isIncome = t.amount > 0;
        const isPending = t.pending;
        const last = i === transactions.length - 1;
        const Icon = I[categoryIcon(t.category)];
        const amtColor = isIncome ? palette.pos : isPending ? palette.ink3 : palette.ink1;
        return (
          <Pressable
            key={t.id}
            onPress={() => onPressTxn(t)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 11,
              paddingHorizontal: 14,
              borderBottomColor: palette.line,
              borderBottomWidth: last ? 0 : 1,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: isIncome ? palette.posTint : palette.tinted,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isIncome ? (
                <I.bolt color={palette.pos} size={16} />
              ) : (
                <Icon color={palette.ink2} size={16} />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: isPending ? palette.ink2 : palette.ink1,
                  fontStyle: isPending ? "italic" : "normal",
                }}
              >
                {displayMerchantName(t)}
              </Text>
              <Text style={{ fontSize: 12, color: palette.ink3, marginTop: 1 }}>
                {accountNameById.get(t.account_id) ?? "Account"}
                {isPending ? " · pending" : ""}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Money
                cents={t.amount}
                showSign={isIncome}
                style={{
                  fontSize: 14,
                  fontWeight: "500",
                  color: amtColor,
                  fontStyle: isPending ? "italic" : "normal",
                }}
              />
              <Text style={{ fontSize: 10, color: palette.ink3, marginTop: 1 }}>
                {whenLabel(t.posted_at, t.pending)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
