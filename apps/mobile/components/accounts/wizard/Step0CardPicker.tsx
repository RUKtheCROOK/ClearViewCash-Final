import { Pressable, View } from "react-native";
import { I, Money, Text } from "@cvc/ui";
import { accountDisplayName, hueForCardId, tintForHue, type LinkTintMode } from "@cvc/domain";
import { useTheme } from "../../../lib/theme";
import { StepShell } from "./StepShell";
import type { DraftCard } from "./usePaymentLinkDraft";

interface Props {
  cards: DraftCard[];
  selectedId: string | null;
  onSelect: (card: DraftCard) => void;
  onContinue: () => void;
  onClose: () => void;
}

export function Step0CardPicker({ cards, selectedId, onSelect, onContinue, onClose }: Props) {
  const { mode, palette } = useTheme();
  const totalSteps = 4;
  return (
    <StepShell
      step={1}
      total={totalSteps}
      title="Pick a card to fund"
      subtitle="Choose the credit card whose balance you want covered by one or more cash accounts."
      primaryLabel="Continue"
      primaryDisabled={!selectedId}
      onPrimary={onContinue}
      onClose={onClose}
    >
      {cards.length === 0 ? (
        <View
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: palette.tinted,
          }}
        >
          <Text style={{ fontSize: 13, color: palette.ink2, lineHeight: 20 }}>
            No credit cards found in this space. Connect a card with the + Add bank
            button on the Accounts page first, then come back to set up funding.
          </Text>
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        {cards.map((card) => {
          const sel = selectedId === card.id;
          const tint = tintForHue(hueForCardId(card.id), mode as LinkTintMode);
          return (
            <Pressable
              key={card.id}
              onPress={() => onSelect(card)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: sel ? palette.brandTint : palette.surface,
                borderColor: sel ? palette.brand : palette.line,
                borderWidth: 1.5,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 9,
                  backgroundColor: tint.swatch,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <I.card color="#ffffff" size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                  {accountDisplayName(card)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
                  {card.mask ? (
                    <Text style={{ fontFamily: "Menlo", fontSize: 11.5, color: palette.ink3 }}>
                      ···{card.mask}
                    </Text>
                  ) : null}
                  <Text style={{ fontSize: 11.5, color: palette.ink3 }}>
                    · Balance{" "}
                  </Text>
                  <Money
                    cents={card.current_balance ?? 0}
                    style={{ fontSize: 11.5, color: palette.ink3 }}
                  />
                </View>
              </View>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  borderColor: sel ? palette.brand : palette.lineFirm,
                  borderWidth: 2,
                  backgroundColor: sel ? palette.brand : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {sel ? (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      backgroundColor: palette.surface,
                    }}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </StepShell>
  );
}
