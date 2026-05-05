import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { I, Text } from "@cvc/ui";
import { useTheme } from "../../../lib/theme";

interface Props {
  step: number;
  total: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose: () => void;
}

export function StepShell({
  step,
  total,
  title,
  subtitle,
  children,
  primaryLabel,
  primaryDisabled,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
}: Props) {
  const { palette } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: palette.surface }}>
      <View style={{ alignItems: "center", paddingTop: 8 }}>
        <View
          style={{
            width: 36,
            height: 5,
            borderRadius: 3,
            backgroundColor: palette.lineFirm,
          }}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 18,
          paddingTop: 4,
        }}
      >
        <View style={{ width: 32 }} />
        <Text style={{ fontSize: 14, fontWeight: "500", color: palette.ink1 }}>
          Payment link
        </Text>
        <Pressable
          onPress={onClose}
          hitSlop={6}
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: palette.tinted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <I.close color={palette.ink2} size={16} />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          justifyContent: "center",
          paddingTop: 14,
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={{
              width: i === step - 1 ? 22 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i < step ? palette.brand : palette.tinted,
            }}
          />
        ))}
      </View>

      <View style={{ paddingHorizontal: 22, paddingTop: 14, paddingBottom: 6 }}>
        <Text
          style={{
            fontFamily: "Menlo",
            fontSize: 10.5,
            color: palette.ink3,
            letterSpacing: 0.85,
            textTransform: "uppercase",
          }}
        >
          Step {step} of {total}
        </Text>
        <Text
          style={{
            marginTop: 4,
            fontSize: 22,
            fontWeight: "500",
            color: palette.ink1,
            letterSpacing: -0.4,
            lineHeight: 26,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ marginTop: 8, fontSize: 13, color: palette.ink2, lineHeight: 20 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      <View
        style={{
          borderTopColor: palette.line,
          borderTopWidth: 1,
          backgroundColor: palette.surface,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 30,
          flexDirection: "row",
          gap: 8,
        }}
      >
        {secondaryLabel ? (
          <Pressable
            onPress={onSecondary}
            style={{
              flex: 1,
              height: 50,
              borderRadius: 14,
              borderColor: palette.lineFirm,
              borderWidth: 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: palette.ink1, fontWeight: "500", fontSize: 15 }}>
              {secondaryLabel}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          disabled={primaryDisabled}
          onPress={onPrimary}
          style={{
            flex: 1,
            height: 50,
            borderRadius: 14,
            backgroundColor: primaryDisabled ? palette.ink4 : palette.brand,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: palette.brandOn, fontWeight: "500", fontSize: 15 }}>
            {primaryLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
