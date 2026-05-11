import { Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { I, Text } from "@cvc/ui";
import { useTheme } from "../../lib/theme";

interface Props {
  variant: "fresh" | "sharedEmpty";
  spaceName?: string;
  onLinkBank?: () => void;
  onSwitchToMyView?: () => void;
}

export function AccountsEmptyState({ variant, spaceName, onLinkBank, onSwitchToMyView }: Props) {
  const { mode, palette } = useTheme();
  const illoBg = mode === "dark" ? "#0b2f2f" : "#e0f3f3";

  const title =
    variant === "fresh"
      ? "Connect a bank to get started"
      : `Nothing shared into ${spaceName ?? "this space"} yet`;
  const body =
    variant === "fresh"
      ? "We'll pull your balances and recent transactions automatically. Your cash, credit, and loans land in one place."
      : "Accounts you've added are still in your own view. Switch over to see them.";

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
      <View style={{ alignItems: "center" }}>
        <View style={{ width: 120, height: 120, marginBottom: 4, position: "relative" }}>
          <View
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              right: 14,
              bottom: 14,
              borderRadius: 999,
              backgroundColor: illoBg,
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 120,
              height: 120,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Svg width={64} height={64} viewBox="0 0 64 64">
              <Circle
                cx={32}
                cy={32}
                r={26}
                stroke={palette.brand}
                strokeOpacity={0.4}
                strokeWidth={1.5}
                strokeDasharray="3 4"
                fill="none"
              />
              {variant === "fresh" ? (
                <Path
                  d="M20 28h24v18a2 2 0 01-2 2H22a2 2 0 01-2-2V28zM18 28l14-10 14 10M28 38h8"
                  stroke={palette.brand}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ) : (
                <Path
                  d="M22 32h20M22 32l6-6M22 32l6 6"
                  stroke={palette.brand}
                  strokeWidth={2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
            </Svg>
          </View>
        </View>

        <Text
          style={{
            marginTop: 8,
            fontSize: 20,
            fontWeight: "500",
            color: palette.ink1,
            letterSpacing: -0.3,
            textAlign: "center",
            lineHeight: 26,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            marginTop: 10,
            fontSize: 13.5,
            color: palette.ink2,
            lineHeight: 20,
            textAlign: "center",
            maxWidth: 300,
          }}
        >
          {body}
        </Text>
      </View>

      <View style={{ paddingTop: 22, gap: 8 }}>
        {variant === "fresh" && onLinkBank ? (
          <Pressable
            onPress={onLinkBank}
            style={({ pressed }) => ({
              height: 50,
              borderRadius: 12,
              backgroundColor: palette.brand,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 8,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <I.plus color={palette.brandOn} size={16} />
            <Text style={{ color: palette.brandOn, fontWeight: "500", fontSize: 14.5 }}>
              Link your first account
            </Text>
          </Pressable>
        ) : null}
        {variant === "sharedEmpty" && onSwitchToMyView ? (
          <Pressable
            onPress={onSwitchToMyView}
            style={({ pressed }) => ({
              height: 50,
              borderRadius: 12,
              backgroundColor: palette.brand,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ color: palette.brandOn, fontWeight: "500", fontSize: 14.5 }}>
              Switch to My View
            </Text>
          </Pressable>
        ) : null}
      </View>

      {variant === "fresh" ? (
        <View
          style={{
            marginTop: 18,
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: palette.infoTint,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <I.lock color={palette.info} size={14} />
          <Text style={{ flex: 1, fontSize: 12, color: palette.ink2, lineHeight: 17 }}>
            ClearView Cash uses Plaid to read balances and transactions. We never see or store your bank password.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
