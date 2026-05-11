import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { fonts, space, radius, type Palette } from "./theme";
import { I } from "./icons";

// Shared sheet/modal header: drag-handle ░ title ░ optional save action,
// with a close button on the left. Used by Profile rename, Spaces rename /
// color / invite, and any future bottom sheets. Lives in @cvc/ui so that
// web + mobile share the same shape.

interface SheetHeaderProps {
  title: ReactNode;
  onClose: () => void;
  onSave?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  saveBusy?: boolean;
  palette: Palette;
  /** Show a 4px-tall grab handle above the title. Set on draggable sheets. */
  withGrabHandle?: boolean;
}

export function SheetHeader({
  title,
  onClose,
  onSave,
  saveLabel = "Save",
  saveDisabled,
  saveBusy,
  palette,
  withGrabHandle,
}: SheetHeaderProps) {
  const Close = I.close;
  return (
    <View>
      {withGrabHandle ? (
        <View style={{ alignItems: "center", paddingTop: space.s2 }}>
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: radius.pill,
              backgroundColor: palette.lineFirm,
            }}
          />
        </View>
      ) : null}
      <View
        style={{
          paddingHorizontal: space.s4,
          paddingTop: space.s3,
          paddingBottom: space.s3,
          flexDirection: "row",
          alignItems: "center",
          gap: space.s3,
        }}
      >
        <Pressable
          onPress={onClose}
          hitSlop={10}
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.pill,
            backgroundColor: palette.tinted,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Close color={palette.ink2} size={16} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.uiMedium,
              fontSize: 16,
              fontWeight: "500",
              color: palette.ink1,
            }}
          >
            {title}
          </Text>
        </View>
        {onSave ? (
          <Pressable
            onPress={onSave}
            disabled={saveBusy || saveDisabled}
            style={({ pressed }) => ({
              height: 32,
              paddingHorizontal: space.s3,
              borderRadius: radius.r3,
              backgroundColor: palette.brand,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed || saveBusy || saveDisabled ? 0.5 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: fonts.uiMedium,
                fontSize: 13,
                fontWeight: "500",
                color: palette.brandOn,
              }}
            >
              {saveBusy ? "Saving…" : saveLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
