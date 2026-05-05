import { Pressable, View } from "react-native";
import { I, Money, Text } from "@cvc/ui";
import { accountDisplayName, hueForCardId, tintForHue, type LinkTintMode } from "@cvc/domain";
import { useTheme } from "../../../lib/theme";
import { StepShell } from "./StepShell";
import type { DraftAccount, DraftCard } from "./usePaymentLinkDraft";

interface Props {
  card: DraftCard;
  funders: DraftAccount[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
  onClose: () => void;
  step: number;
  total: number;
}

export function Step1Funders({
  card,
  funders,
  selectedIds,
  onToggle,
  onContinue,
  onBack,
  onClose,
  step,
  total,
}: Props) {
  const { mode, palette } = useTheme();
  const tint = tintForHue(hueForCardId(card.id), mode as LinkTintMode);
  return (
    <StepShell
      step={step}
      total={total}
      title={`Which accounts fund ${accountDisplayName(card)}${card.mask ? ` ${card.mask}` : ""}?`}
      subtitle="When the card balance changes, ClearView will deduct it from these accounts to compute Effective Available."
      primaryLabel={`Continue${selectedIds.length ? ` · ${selectedIds.length} selected` : ""}`}
      primaryDisabled={selectedIds.length === 0}
      onPrimary={onContinue}
      secondaryLabel="Back"
      onSecondary={onBack}
      onClose={onClose}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 12,
          backgroundColor: tint.pillBg,
          marginBottom: 14,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            backgroundColor: tint.swatch,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I.card color="#ffffff" size={16} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: "500", color: tint.pillFg }}>
            {accountDisplayName(card)}
            {card.mask ? (
              <Text style={{ fontFamily: "Menlo", fontSize: 11, color: tint.pillFg }}>
                {" "}···{card.mask}
              </Text>
            ) : null}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
            <Text style={{ fontSize: 11, color: tint.pillFg }}>Statement balance</Text>
            <Money
              cents={card.current_balance ?? 0}
              style={{ fontSize: 11, color: tint.pillFg, fontWeight: "500" }}
            />
          </View>
        </View>
      </View>

      <View style={{ gap: 8 }}>
        {funders.map((a) => {
          const sel = selectedIds.includes(a.id);
          return (
            <Pressable
              key={a.id}
              onPress={() => onToggle(a.id)}
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
                  backgroundColor: palette.tinted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <I.bank color={palette.ink2} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
                  {accountDisplayName(a)}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
                  {a.mask ? (
                    <Text style={{ fontFamily: "Menlo", fontSize: 11.5, color: palette.ink3 }}>
                      ···{a.mask} ·{" "}
                    </Text>
                  ) : null}
                  <Money
                    cents={a.current_balance ?? 0}
                    style={{ fontSize: 11.5, color: palette.ink3 }}
                  />
                  <Text style={{ fontSize: 11.5, color: palette.ink3 }}> available</Text>
                </View>
              </View>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  borderColor: sel ? palette.brand : palette.lineFirm,
                  borderWidth: 2,
                  backgroundColor: sel ? palette.brand : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {sel ? <I.check color={palette.brandOn} size={14} /> : null}
              </View>
            </Pressable>
          );
        })}
        {funders.length === 0 ? (
          <View
            style={{
              padding: 16,
              borderRadius: 12,
              backgroundColor: palette.tinted,
            }}
          >
            <Text style={{ fontSize: 13, color: palette.ink2, lineHeight: 20 }}>
              No cash accounts available. Connect a checking or savings account first.
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "flex-start",
          marginTop: 18,
          padding: 12,
          borderRadius: 12,
          backgroundColor: palette.tinted,
        }}
      >
        <I.info color={palette.ink2} size={13} />
        <Text style={{ flex: 1, fontSize: 12, color: palette.ink2, lineHeight: 18 }}>
          Pick more than one if you split this card across funders. You&apos;ll set the
          split next.
        </Text>
      </View>
    </StepShell>
  );
}
