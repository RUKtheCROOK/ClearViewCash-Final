import { View } from "react-native";
import { Card, HStack, Money, Stack, Text, colors, radius, space } from "@cvc/ui";
import type { CoverageReport } from "@cvc/domain";

const STATUS_LABELS: Record<CoverageReport["status"], string> = {
  green: "Fully covered",
  yellow: "Tight — watch the dip",
  red: "Shortfall ahead",
};

const STATUS_COLORS: Record<CoverageReport["status"], string> = {
  green: colors.positive,
  yellow: colors.warning,
  red: colors.negative,
};

export interface CoverageStatusCardProps {
  report: CoverageReport;
  compact?: boolean;
}

export function CoverageStatusCard({ report, compact = false }: CoverageStatusCardProps) {
  const tone = STATUS_COLORS[report.status];

  return (
    <Card>
      <Stack gap="sm">
        <HStack align="center" gap="sm">
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: radius.pill,
              backgroundColor: tone,
            }}
          />
          <Text variant="label" style={{ color: tone, letterSpacing: 0.6 }}>
            Funding coverage
          </Text>
        </HStack>
        <Text style={{ fontSize: compact ? 16 : 20, fontWeight: "600" }}>
          {STATUS_LABELS[report.status]}
        </Text>

        {report.status !== "green" ? (
          <Stack gap="xs">
            {report.insolvencyDate ? (
              <HStack justify="space-between">
                <Text variant="muted">Drops below threshold</Text>
                <Text style={{ fontWeight: "600" }}>
                  {report.daysUntilInsolvency != null
                    ? `In ${report.daysUntilInsolvency} day${report.daysUntilInsolvency === 1 ? "" : "s"}`
                    : report.insolvencyDate}
                </Text>
              </HStack>
            ) : null}
            {report.worstShortfallDate && report.worstShortfall < 0 ? (
              <HStack justify="space-between">
                <Text variant="muted">Worst position</Text>
                <Money cents={report.worstShortfall} positiveColor style={{ fontWeight: "600" }} />
              </HStack>
            ) : null}
          </Stack>
        ) : null}

        {!compact && report.uncoveredBills.length > 0 ? (
          <View style={{ marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Text variant="muted" style={{ fontSize: 11, marginBottom: space.xs }}>
              {report.uncoveredBills.length} bill{report.uncoveredBills.length === 1 ? "" : "s"} not covered
            </Text>
            {report.uncoveredBills.slice(0, 3).map((b, idx) => (
              <HStack
                key={`${b.billId}-${b.date}-${idx}`}
                justify="space-between"
                style={{ paddingVertical: space.xs }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600" }}>{b.billName}</Text>
                  <Text variant="muted" style={{ fontSize: 11 }}>{b.date}</Text>
                </View>
                <Money cents={-b.amount} positiveColor style={{ fontSize: 13 }} />
              </HStack>
            ))}
            {report.uncoveredBills.length > 3 ? (
              <Text variant="muted" style={{ fontSize: 11, marginTop: space.xs }}>
                +{report.uncoveredBills.length - 3} more
              </Text>
            ) : null}
          </View>
        ) : null}
      </Stack>
    </Card>
  );
}
