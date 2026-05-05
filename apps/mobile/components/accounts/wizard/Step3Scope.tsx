import { Pressable, View } from "react-native";
import { I, Text } from "@cvc/ui";
import { accountDisplayName, hueForCardId, tintForHue, type LinkTintMode } from "@cvc/domain";
import { useTheme } from "../../../lib/theme";
import { StepShell } from "./StepShell";
import type { DraftCard, Scope } from "./usePaymentLinkDraft";

interface Props {
  card: DraftCard;
  scope: Scope;
  onSetScope: (s: Scope) => void;
  onSave: () => void;
  onBack: () => void;
  onClose: () => void;
  spaceName: string;
  saving: boolean;
  error: string | null;
  step: number;
  total: number;
}

export function Step3Scope({
  card,
  scope,
  onSetScope,
  onSave,
  onBack,
  onClose,
  spaceName,
  saving,
  error,
  step,
  total,
}: Props) {
  const { mode, palette, sp } = useTheme();
  const cardTint = tintForHue(hueForCardId(card.id), mode as LinkTintMode);

  const opts: Array<{ id: Scope; name: string; tag: string; desc: string }> = [
    {
      id: "single",
      name: "Single space",
      tag: "Recommended",
      desc: `Only ${spaceName} sees this link. Effective Available is computed per-space.`,
    },
    {
      id: "cross",
      name: "Cross-space",
      tag: "Advanced",
      desc:
        "Visible in every space the card is shared with. Useful when one card serves both Personal and Household.",
    },
  ];

  return (
    <StepShell
      step={step}
      total={total}
      title="Where does this link apply?"
      subtitle="Spaces are independent contexts. Choose how this funding link travels across them."
      primaryLabel={saving ? "Saving…" : "Save link"}
      primaryDisabled={saving}
      onPrimary={onSave}
      secondaryLabel="Back"
      onSecondary={onBack}
      onClose={onClose}
    >
      <View style={{ gap: 10 }}>
        {opts.map((o) => {
          const sel = scope === o.id;
          return (
            <Pressable
              key={o.id}
              onPress={() => onSetScope(o.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 14,
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
                  borderRadius: 10,
                  backgroundColor: sel ? palette.brand : palette.tinted,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {o.id === "single" ? (
                  <I.lock color={sel ? palette.brandOn : palette.ink2} size={14} />
                ) : (
                  <I.share color={sel ? palette.brandOn : palette.ink2} size={14} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text style={{ fontSize: 14.5, fontWeight: "500", color: palette.ink1 }}>
                    {o.name}
                  </Text>
                  <View
                    style={{
                      paddingVertical: 1,
                      paddingHorizontal: 7,
                      borderRadius: 999,
                      backgroundColor: palette.tinted,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10.5,
                        fontWeight: "500",
                        color: palette.ink3,
                        textTransform: "uppercase",
                        letterSpacing: 0.7,
                      }}
                    >
                      {o.tag}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12.5, color: palette.ink2, marginTop: 4, lineHeight: 18 }}>
                  {o.desc}
                </Text>
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

      <View style={{ marginTop: 18 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: "500",
            color: palette.ink2,
            textTransform: "uppercase",
            letterSpacing: 0.85,
            marginBottom: 8,
          }}
        >
          Preview
        </Text>
        <View
          style={{ backgroundColor: palette.sunken, borderRadius: 12, padding: 14, gap: 10 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderRadius: 999,
                backgroundColor: sp.pillBg,
              }}
            >
              <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: sp.swatch }} />
              <Text style={{ fontSize: 12, fontWeight: "500", color: sp.pillFg }}>{spaceName}</Text>
            </View>
            <I.arrowR color={palette.ink3} size={11} />
            <View
              style={{
                paddingVertical: 3,
                paddingHorizontal: 8,
                borderRadius: 999,
                backgroundColor: cardTint.pillBg,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "500", color: cardTint.pillFg }}>
                {accountDisplayName(card)}
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: palette.ink3, lineHeight: 18 }}>
            {scope === "single"
              ? `Effective Available reduced in ${spaceName} only.`
              : "Effective Available reduced in any space the card is shared into."}
          </Text>
        </View>
      </View>

      {error ? (
        <Text style={{ color: palette.neg, fontSize: 12, marginTop: 10 }}>{error}</Text>
      ) : null}
    </StepShell>
  );
}
