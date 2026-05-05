import { Modal, Pressable, ScrollView, View } from "react-native";
import { I, Text, type IconKey } from "@cvc/ui";
import { useTheme } from "../lib/theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  onStartTrial: () => void;
}

interface Feature {
  icon: IconKey;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: "spark",
    title: "30-day forecast",
    body: "Daily projection with low-balance warnings and what-if scenarios for upcoming bills, income, and card payoffs.",
  },
  {
    icon: "share",
    title: "Payment links across spaces",
    body: "Tie funding accounts to specific cards or shared obligations so the right account always covers the right charge.",
  },
  {
    icon: "summary",
    title: "Reports & exports",
    body: "Net worth over time, cash flow, and category spending — exportable to CSV and PDF for taxes or planning.",
  },
  {
    icon: "fam",
    title: "Up to 5 members per space",
    body: "Household and Family Trust spaces with granular per-account / per-transaction sharing rules.",
  },
];

export function PremiumModal({ visible, onClose, onStartTrial }: Props) {
  const { palette } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(20,22,28,0.45)",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          onPress={() => undefined}
          style={{
            width: "100%",
            backgroundColor: palette.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: 36,
            maxHeight: "92%",
          }}
        >
          <View style={{ alignItems: "center", paddingTop: 8, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: palette.lineFirm }} />
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ alignItems: "center", marginBottom: 18 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: palette.brandTint,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <I.spark color={palette.brand} size={28} />
              </View>
              <Text variant="h2" style={{ color: palette.ink1, textAlign: "center" }}>
                Clear View Pro
              </Text>
              <Text style={{ fontSize: 14, color: palette.ink2, textAlign: "center", marginTop: 6, lineHeight: 20 }}>
                See further, share smarter, and keep every dollar accounted for.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {FEATURES.map((f) => {
                const Icon = I[f.icon];
                return (
                  <View
                    key={f.title}
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      padding: 14,
                      borderRadius: 14,
                      backgroundColor: palette.canvas,
                      borderColor: palette.line,
                      borderWidth: 1,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: palette.brandTint,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon color={palette.brand} size={18} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: "600", color: palette.ink1 }}>
                        {f.title}
                      </Text>
                      <Text style={{ fontSize: 12, color: palette.ink2, marginTop: 3, lineHeight: 17 }}>
                        {f.body}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View
              style={{
                marginTop: 18,
                padding: 16,
                borderRadius: 16,
                backgroundColor: palette.brandTint,
                borderColor: palette.brand,
                borderWidth: 1,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: palette.brand, letterSpacing: 0.6 }}>
                14-DAY FREE TRIAL
              </Text>
              <Text style={{ fontSize: 13, color: palette.ink1, marginTop: 6, lineHeight: 18 }}>
                No charge for 14 days. Cancel anytime in Settings — your data and free-tier limits stay if you don&apos;t convert.
              </Text>
            </View>
          </ScrollView>

          <View style={{ paddingHorizontal: 20, gap: 8 }}>
            <Pressable
              onPress={onStartTrial}
              style={({ pressed }) => ({
                height: 52,
                borderRadius: 14,
                backgroundColor: palette.brand,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={{ color: palette.brandOn, fontSize: 16, fontWeight: "600", letterSpacing: -0.1 }}>
                Start 14-day free trial
              </Text>
            </Pressable>
            <Pressable
              onPress={onClose}
              style={{
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 14, color: palette.ink2, fontWeight: "500" }}>Maybe later</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
