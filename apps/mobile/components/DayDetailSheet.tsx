import { Modal, Pressable, ScrollView, View } from "react-native";
import { HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import type { AppliedDayItem, ForecastBucket } from "@cvc/domain";

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export interface DayDetailSheetProps {
  bucket: ForecastBucket | null;
  onClose: () => void;
  accountsById?: Record<string, string>;
}

export function DayDetailSheet({ bucket, onClose, accountsById = {} }: DayDetailSheetProps) {
  const visible = bucket != null;
  const isMultiDay = bucket ? bucket.startDate !== bucket.endDate : false;
  const headerLabel = bucket
    ? isMultiDay
      ? bucket.label
      : prettyDate(bucket.startDate)
    : "";
  const netChange = bucket ? bucket.effectiveAvailable - bucket.openEffectiveAvailable : 0;

  const scheduled = bucket ? bucket.appliedItems.filter((i) => i.source === "scheduled") : [];
  const estimated = bucket ? bucket.appliedItems.filter((i) => i.source === "estimated") : [];
  const incomeItems = scheduled.filter((i) => i.kind === "income");
  const billItems = scheduled.filter((i) => i.kind === "bill");

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)", justifyContent: "flex-end" }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            maxHeight: "85%",
            overflow: "hidden",
          }}
        >
          {bucket ? (
            <>
              <View
                style={{
                  paddingHorizontal: space.lg,
                  paddingVertical: space.md,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 4,
                    backgroundColor: colors.border,
                    borderRadius: 999,
                    alignSelf: "center",
                    marginBottom: space.md,
                  }}
                />
                <HStack justify="space-between" align="flex-start">
                  <View style={{ flex: 1 }}>
                    <Text variant="label">{isMultiDay ? "Period" : "Day"}</Text>
                    <Text variant="title" style={{ marginTop: 2 }}>
                      {headerLabel}
                    </Text>
                    {isMultiDay ? (
                      <Text variant="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {bucket.startDate} → {bucket.endDate}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={onClose}
                    accessibilityLabel="Close"
                    style={{ paddingHorizontal: space.sm, paddingVertical: 2 }}
                  >
                    <Text style={{ fontSize: 22, color: colors.textMuted }}>×</Text>
                  </Pressable>
                </HStack>
              </View>

              {bucket.belowThreshold ? (
                <View
                  style={{
                    backgroundColor: "#FEF2F2",
                    paddingHorizontal: space.lg,
                    paddingVertical: space.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ color: colors.negative, fontSize: 13, fontWeight: "500" }}>
                    Effective available drops below your threshold here.
                  </Text>
                </View>
              ) : null}

              <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
                <HStack
                  style={{
                    backgroundColor: colors.bg,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Kpi label="Open" cents={bucket.openEffectiveAvailable} />
                  <Kpi
                    label="Close"
                    cents={bucket.effectiveAvailable}
                    tone={bucket.effectiveAvailable < 0 ? "negative" : undefined}
                  />
                  <Kpi
                    label="Net change"
                    cents={netChange}
                    showSign
                    tone={netChange > 0 ? "positive" : netChange < 0 ? "negative" : undefined}
                    last
                  />
                </HStack>

                <View style={{ padding: space.lg }}>
                  <SectionHeading
                    title="Scheduled"
                    subtitle="Known bills and income"
                    count={scheduled.length}
                  />
                  {scheduled.length === 0 ? (
                    <Text variant="muted" style={{ marginTop: space.sm, fontSize: 13 }}>
                      Nothing scheduled on this day.
                    </Text>
                  ) : (
                    <Stack gap="sm" style={{ marginTop: space.sm }}>
                      {incomeItems.map((item, idx) => (
                        <ItemRow
                          key={`inc-${item.refId}-${idx}`}
                          item={item}
                          accountsById={accountsById}
                          bucket={bucket}
                        />
                      ))}
                      {billItems.map((item, idx) => (
                        <ItemRow
                          key={`bill-${item.refId}-${idx}`}
                          item={item}
                          accountsById={accountsById}
                          bucket={bucket}
                        />
                      ))}
                    </Stack>
                  )}
                </View>

                {estimated.length > 0 ? (
                  <View
                    style={{
                      padding: space.lg,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                      backgroundColor: "#FFFBEB",
                    }}
                  >
                    <SectionHeading
                      title="Estimated"
                      subtitle="Projected from your last 30 days of spending"
                      count={estimated.length}
                    />
                    <Stack gap="sm" style={{ marginTop: space.sm }}>
                      {estimated.map((item, idx) => (
                        <ItemRow
                          key={`est-${item.refId}-${idx}`}
                          item={item}
                          accountsById={accountsById}
                          bucket={bucket}
                        />
                      ))}
                    </Stack>
                    <Text variant="muted" style={{ fontSize: 11, marginTop: space.md, lineHeight: 16 }}>
                      Estimates assume your average daily spend on each card continues. Actual
                      charges will vary; this isn't a fixed bill.
                    </Text>
                  </View>
                ) : null}

                {scheduled.length === 0 && estimated.length === 0 ? (
                  <View style={{ padding: space.xl }}>
                    <Text variant="muted" style={{ fontSize: 13 }}>
                      Nothing changes on this {isMultiDay ? "period" : "day"}.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Kpi({
  label,
  cents,
  tone,
  showSign,
  last,
}: {
  label: string;
  cents: number;
  tone?: "positive" | "negative";
  showSign?: boolean;
  last?: boolean;
}) {
  const color = tone === "positive" ? colors.positive : tone === "negative" ? colors.negative : colors.text;
  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: space.md,
        paddingVertical: space.md,
        borderRightWidth: last ? 0 : 1,
        borderRightColor: colors.border,
      }}
    >
      <Text variant="label">{label}</Text>
      <Money
        cents={cents}
        showSign={showSign}
        style={{ marginTop: 4, fontSize: 16, fontWeight: "600", color }}
      />
    </View>
  );
}

function SectionHeading({
  title,
  subtitle,
  count,
}: {
  title: string;
  subtitle: string;
  count: number;
}) {
  return (
    <Stack gap="xs">
      <HStack gap="sm" align="center">
        <Text style={{ fontSize: 14, fontWeight: "600" }}>{title}</Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 1,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bg,
          }}
        >
          <Text variant="muted" style={{ fontSize: 11 }}>
            {count}
          </Text>
        </View>
      </HStack>
      <Text variant="muted" style={{ fontSize: 12 }}>
        {subtitle}
      </Text>
    </Stack>
  );
}

function ItemRow({
  item,
  accountsById,
  bucket,
}: {
  item: AppliedDayItem;
  accountsById: Record<string, string>;
  bucket: ForecastBucket;
}) {
  const positive = item.amount > 0;
  const color =
    item.source === "estimated" ? colors.warning : positive ? colors.positive : colors.negative;
  const accountName = item.accountId ? accountsById[item.accountId] : null;
  const isMultiDay = bucket.startDate !== bucket.endDate;
  const itemDate = isMultiDay ? findItemDate(bucket, item) : null;
  const meta = [itemDate, accountName, item.note].filter(Boolean).join(" · ");

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space.md,
        padding: space.md,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.sm,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <HStack gap="sm" align="center" wrap>
          <Text style={{ fontSize: 14, fontWeight: "500" }}>{item.name}</Text>
          {item.source === "estimated" ? (
            <View
              style={{
                paddingHorizontal: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.warning,
              }}
            >
              <Text style={{ fontSize: 10, color: colors.warning, fontWeight: "600", letterSpacing: 0.4 }}>
                ESTIMATED
              </Text>
            </View>
          ) : item.cadence ? (
            <View
              style={{
                paddingHorizontal: 6,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text variant="muted" style={{ fontSize: 10 }}>
                {item.cadence}
              </Text>
            </View>
          ) : null}
        </HStack>
        {meta ? (
          <Text variant="muted" style={{ fontSize: 11, marginTop: 2 }}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Money
        cents={item.amount}
        showSign
        style={{ fontWeight: "600", fontSize: 14, color }}
      />
    </View>
  );
}

function findItemDate(bucket: ForecastBucket, item: AppliedDayItem): string | null {
  for (const d of bucket.days) {
    if (d.appliedItems.includes(item)) return d.date;
  }
  return null;
}
