import { Pressable, View } from "react-native";
import { Money, Text } from "@cvc/ui";
import { accountDisplayName, hueForCardId, tintForHue, type LinkTintMode } from "@cvc/domain";
import { useTheme } from "../../../lib/theme";
import { StepShell } from "./StepShell";
import type { DraftAccount, DraftCard } from "./usePaymentLinkDraft";

interface Props {
  card: DraftCard;
  funders: DraftAccount[];
  splits: Record<string, number>;
  onSetSplit: (id: string, value: number) => void;
  onEvenSplit: () => void;
  onContinue: () => void;
  onBack: () => void;
  onClose: () => void;
  step: number;
  total: number;
}

export function Step2Split({
  card,
  funders,
  splits,
  onSetSplit,
  onEvenSplit,
  onContinue,
  onBack,
  onClose,
  step,
  total,
}: Props) {
  const { mode, palette } = useTheme();
  const cardBalance = Math.max(0, card.current_balance ?? 0);
  const splitTotal = funders.reduce((s, f) => s + (splits[f.id] ?? 0), 0);
  const valid = splitTotal === 100;

  return (
    <StepShell
      step={step}
      total={total}
      title="How is it split?"
      subtitle="Allocates the card's balance across funders for Effective Available math."
      primaryLabel="Continue"
      primaryDisabled={!valid}
      onPrimary={onContinue}
      secondaryLabel="Back"
      onSecondary={onBack}
      onClose={onClose}
    >
      <View
        style={{
          flexDirection: "row",
          height: 14,
          borderRadius: 7,
          overflow: "hidden",
          borderColor: palette.line,
          borderWidth: 1,
        }}
      >
        {funders.map((f, i) => {
          const tint = tintForHue(hueForCardId(card.id) + i * 35, mode as LinkTintMode);
          const flex = Math.max(0, splits[f.id] ?? 0);
          if (flex === 0) return null;
          return (
            <View
              key={f.id}
              style={{ flex, backgroundColor: i === 0 ? palette.brand : tint.pillFg }}
            />
          );
        })}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <Text style={{ fontFamily: "Menlo", fontSize: 11, color: palette.ink3 }}>0%</Text>
        <Text style={{ fontFamily: "Menlo", fontSize: 11, color: palette.ink3 }}>50%</Text>
        <Text style={{ fontFamily: "Menlo", fontSize: 11, color: palette.ink3 }}>100%</Text>
      </View>

      <View style={{ gap: 8, marginTop: 14 }}>
        {funders.map((f, i) => {
          const tint = tintForHue(hueForCardId(card.id) + i * 35, mode as LinkTintMode);
          const swatch = i === 0 ? palette.brand : tint.pillFg;
          const pct = splits[f.id] ?? 0;
          const coverCents = Math.round((cardBalance * pct) / 100);
          return (
            <View
              key={f.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: palette.surface,
                borderColor: palette.line,
                borderWidth: 1,
              }}
            >
              <View
                style={{ width: 10, height: 32, borderRadius: 3, backgroundColor: swatch }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                  {accountDisplayName(f)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
                  <Text style={{ fontSize: 11.5, color: palette.ink3 }}>Covers</Text>
                  <Money
                    cents={coverCents}
                    style={{ fontSize: 11.5, color: palette.ink2, fontWeight: "500" }}
                  />
                  <Text style={{ fontSize: 11.5, color: palette.ink3 }}>of</Text>
                  <Money
                    cents={cardBalance}
                    style={{ fontSize: 11.5, color: palette.ink3 }}
                  />
                </View>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Pressable
                  onPress={() => onSetSplit(f.id, Math.max(0, pct - 5))}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: palette.tinted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, color: palette.ink1, fontWeight: "500" }}>−</Text>
                </Pressable>
                <Text
                  style={{
                    fontFamily: "Menlo",
                    fontSize: 16,
                    fontWeight: "600",
                    color: palette.ink1,
                    minWidth: 36,
                    textAlign: "center",
                  }}
                >
                  {pct}%
                </Text>
                <Pressable
                  onPress={() => onSetSplit(f.id, Math.min(100, pct + 5))}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    backgroundColor: palette.tinted,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 16, color: palette.ink1, fontWeight: "500" }}>+</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <Pressable
          onPress={onEvenSplit}
          style={{
            flex: 1,
            height: 36,
            borderRadius: 10,
            borderColor: palette.lineFirm,
            borderWidth: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: palette.ink1, fontWeight: "500", fontSize: 13 }}>
            Even split
          </Text>
        </Pressable>
        <View
          style={{
            flex: 1,
            height: 36,
            borderRadius: 10,
            backgroundColor: valid ? palette.posTint : palette.warnTint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: valid ? palette.pos : palette.warn,
              fontFamily: "Menlo",
              fontSize: 13,
              fontWeight: "600",
            }}
          >
            Total · {splitTotal}%
          </Text>
        </View>
      </View>
    </StepShell>
  );
}
