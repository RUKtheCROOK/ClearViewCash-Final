import * as ExpoHaptics from "expo-haptics";

// Thin wrapper that swallows platform-not-supported errors (e.g. RN-Web).
// Lets call sites stay one line.
export const haptics = {
  selection: () => {
    ExpoHaptics.selectionAsync().catch(() => undefined);
  },
  light: () => {
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  medium: () => {
    ExpoHaptics.impactAsync(ExpoHaptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  },
  success: () => {
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warning: () => {
    ExpoHaptics.notificationAsync(ExpoHaptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
};
