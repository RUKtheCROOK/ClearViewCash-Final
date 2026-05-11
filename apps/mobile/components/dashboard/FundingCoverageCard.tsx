import { Pressable, View } from "react-native";
import { I, Money, Text } from "@cvc/ui";
import type { FundingCoverageReport } from "@cvc/domain";
import { useTheme } from "../../lib/theme";

interface Props {
  report: FundingCoverageReport;
  onManage?: () => void;
}

export function FundingCoverageCard({ report, onManage }: Props) {
  const { palette } = useTheme();
  const { rows, pct, status, shortByCents } = report;

  const statusColor =
    status === "ok" ? palette.pos : status === "warn" ? palette.warn : palette.neg;
  const statusTint =
    status === "ok" ? palette.posTint : status === "warn" ? palette.warnTint : palette.negTint;
  const statusLabel =
    status === "ok"
      ? "Fully covered"
      : status === "warn"
        ? "Mostly covered"
        : `Short by $${(shortByCents / 100).toFixed(2)}`;

  if (rows.length === 0) {
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
        <Text variant="body" style={{ color: palette.ink1 }}>No credit cards linked</Text>
        <Text variant="small" style={{ color: palette.ink3, marginTop: 4 }}>
          Add a payment link in Accounts to see how much of your card balances your funding accounts can cover.
        </Text>
        {onManage ? (
          <Pressable
            onPress={onManage}
            accessibilityLabel="Manage payment links in Accounts"
            style={({ pressed }) => ({
              marginTop: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: "500", color: palette.brand }}>
              Manage in Accounts
            </Text>
            <I.chevR color={palette.brand} size={12} />
          </Pressable>
        ) : null}
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
        padding: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "500", color: palette.ink1 }}>
            Funding coverage
          </Text>
          <Text style={{ fontSize: 12, color: palette.ink3, marginTop: 2 }}>
            {rows.length} card{rows.length === 1 ? "" : "s"} linked
          </Text>
        </View>
        <View
          style={{
            backgroundColor: statusTint,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <View style={{ width: 6, height: 6, borderRadius: 999, backgroundColor: statusColor }} />
          <Text style={{ fontSize: 12, fontWeight: "500", color: statusColor }}>{statusLabel}</Text>
        </View>
      </View>

      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: palette.tinted,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: statusColor,
            opacity: 0.85,
          }}
        />
      </View>

      <View style={{ gap: 10 }}>
        {rows.map((c) => {
          const ok = c.ok;
          const short = c.debtCents - c.coverCents;
          return (
            <View
              key={c.cardAccountId}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: ok ? palette.posTint : palette.negTint,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {ok ? (
                    <I.check color={palette.pos} />
                  ) : (
                    <Text style={{ fontSize: 12, fontWeight: "700", color: palette.neg }}>!</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                      {c.cardName}
                    </Text>
                    {c.mask ? (
                      <Text style={{ fontSize: 12, color: palette.ink3 }}>···{c.mask}</Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 12, color: palette.ink3 }}>
                    {c.fundingAccountName ? `from ${c.fundingAccountName}` : "no funder linked"}
                  </Text>
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Money
                  cents={-c.debtCents}
                  style={{ fontSize: 14, fontWeight: "500", color: ok ? palette.ink1 : palette.neg }}
                />
                {!ok ? (
                  <Text style={{ fontSize: 11, color: palette.neg, marginTop: 1 }}>
                    short ${(short / 100).toFixed(2)}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
