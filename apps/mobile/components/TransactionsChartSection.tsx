import { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, View } from "react-native";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import { buildTransactionBuckets, displayMerchantName } from "@cvc/domain";
import { ForecastChart } from "./ForecastChart";

interface Txn {
  id: string;
  merchant_name: string | null;
  display_name: string | null;
  amount: number;
  posted_at: string;
  category: string | null;
  pending: boolean;
  is_recurring: boolean;
  account_id: string;
  owner_user_id: string;
  note: string | null;
}

const WINDOW_DAYS = 30;

function todayLocalIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

export function TransactionsChartSection({ txns }: { txns: Txn[] }) {
  const endDate = useMemo(() => todayLocalIso(), []);
  const buckets = useMemo(
    () => buildTransactionBuckets(txns, { days: WINDOW_DAYS, endDate }),
    [txns, endDate],
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    setSelectedIndex(null);
    setResetSignal((s) => s + 1);
  }, [txns]);

  const onChartLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  const hasData = buckets.some((b) => b.cashIn !== 0 || b.cashOut !== 0);
  if (!hasData) return null;

  const selectedBucket = selectedIndex != null ? buckets[selectedIndex] ?? null : null;
  const selectedDay = selectedBucket?.startDate ?? null;
  const selectedTxns = selectedDay ? txns.filter((t) => t.posted_at === selectedDay) : [];

  const totals = buckets.reduce(
    (acc, b) => ({ cashIn: acc.cashIn + b.cashIn, cashOut: acc.cashOut + b.cashOut }),
    { cashIn: 0, cashOut: 0 },
  );
  const totalNet = totals.cashIn - totals.cashOut;

  return (
    <Card padded={false}>
      <Stack gap="sm" style={{ padding: space.lg }}>
        <HStack justify="space-between" align="center" wrap>
          <View>
            <Text variant="title">Last 30 days</Text>
            <Text variant="muted">Cash in vs cash out from your filtered transactions.</Text>
          </View>
        </HStack>
        <HStack gap="md" wrap>
          <SummaryStat label="In" cents={totals.cashIn} color={colors.positive} />
          <SummaryStat label="Out" cents={-totals.cashOut} color={colors.negative} />
          <SummaryStat label="Net" cents={totalNet} color={totalNet < 0 ? colors.negative : colors.positive} />
        </HStack>
      </Stack>
      <View onLayout={onChartLayout} style={{ paddingHorizontal: space.sm }}>
        <ForecastChart
          buckets={buckets}
          width={chartWidth}
          chartType="flows"
          selectedIndex={selectedIndex}
          onSelectBucket={(_, i) => setSelectedIndex(i)}
          resetSignal={resetSignal}
        />
      </View>
      {selectedBucket ? (
        <Stack
          gap="sm"
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            padding: space.lg,
          }}
        >
          <HStack justify="space-between" align="center" wrap>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600" }}>{selectedBucket.label}</Text>
              <Text variant="muted">
                {selectedBucket.startDate} · {selectedTxns.length}{" "}
                {selectedTxns.length === 1 ? "transaction" : "transactions"}
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedIndex(null)}
              style={{
                paddingHorizontal: space.md,
                paddingVertical: space.xs,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textMuted }}>Close</Text>
            </Pressable>
          </HStack>
          <HStack gap="md" wrap>
            <SummaryStat label="In" cents={selectedBucket.cashIn} color={colors.positive} />
            <SummaryStat label="Out" cents={-selectedBucket.cashOut} color={colors.negative} />
            <SummaryStat
              label="Net"
              cents={selectedBucket.cashIn - selectedBucket.cashOut}
              color={selectedBucket.cashIn - selectedBucket.cashOut < 0 ? colors.negative : colors.positive}
            />
          </HStack>
          {selectedTxns.length === 0 ? (
            <Text variant="muted">No transactions on this day in your current view.</Text>
          ) : (
            <Stack gap="xs">
              {selectedTxns.map((t) => (
                <HStack
                  key={t.id}
                  justify="space-between"
                  align="center"
                  style={{
                    paddingHorizontal: space.md,
                    paddingVertical: space.sm,
                    borderRadius: radius.sm,
                    backgroundColor: colors.bg,
                  }}
                >
                  <View style={{ flex: 1, paddingRight: space.sm }}>
                    <Text>{displayMerchantName(t)}</Text>
                    <Text variant="muted" style={{ fontSize: 12 }}>
                      {t.category ?? "Uncategorized"}
                      {t.pending ? " · pending" : ""}
                      {t.is_recurring ? " · recurring" : ""}
                    </Text>
                  </View>
                  <Money cents={t.amount} positiveColor style={{ fontWeight: "600" }} />
                </HStack>
              ))}
            </Stack>
          )}
        </Stack>
      ) : null}
    </Card>
  );
}

function SummaryStat({ label, cents, color }: { label: string; cents: number; color: string }) {
  return (
    <HStack gap="xs" align="baseline">
      <Text variant="muted" style={{ fontSize: 12 }}>{label}</Text>
      <Money cents={cents} style={{ color, fontWeight: "600" }} />
    </HStack>
  );
}
