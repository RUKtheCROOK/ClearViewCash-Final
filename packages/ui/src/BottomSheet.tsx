import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { Animated, Modal, PanResponder, Pressable, View } from "react-native";
import type { DimensionValue } from "react-native";
import { radius, space, type Palette } from "./theme";

// Shared bottom-sheet wrapper. Provides the backdrop, slide-in animation,
// rounded top corners, tap-outside-to-dismiss, and a drag handle that
// supports swipe-down-to-dismiss. Consumers render their own header /
// content inside. Pairs naturally with <SheetHeader withGrabHandle={false}>
// since this component renders the grab handle itself.

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  palette: Palette;
  children: ReactNode;
  /** Sheet body maxHeight; defaults to "92%". */
  maxHeight?: DimensionValue;
  /** Render the grab handle. Defaults to true. */
  withGrabHandle?: boolean;
}

const DISMISS_DISTANCE_PX = 80;
const DISMISS_VELOCITY = 0.6;

export function BottomSheet({
  visible,
  onClose,
  palette,
  children,
  maxHeight = "92%",
  withGrabHandle = true,
}: BottomSheetProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) =>
        g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        if (g.dy > DISMISS_DISTANCE_PX || g.vy > DISMISS_VELOCITY) {
          Animated.timing(translateY, {
            toValue: 800,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 14,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 14,
        }).start();
      },
    }),
  ).current;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}
      >
        <Animated.View
          style={{
            transform: [{ translateY }],
            maxHeight,
            backgroundColor: palette.canvas,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            overflow: "hidden",
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {withGrabHandle ? (
              <View
                {...panResponder.panHandlers}
                style={{ alignItems: "center", paddingTop: space.s2, paddingBottom: 4 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: radius.pill,
                    backgroundColor: palette.lineFirm,
                  }}
                />
              </View>
            ) : null}
            {children}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
