import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Small, deliberate vibrations on the moments that matter. No-ops on web.
const native = Platform.OS !== "web";

export const hapticTap = () => {
  if (native) Haptics.selectionAsync().catch(() => {});
};

export const hapticImpact = () => {
  if (native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const hapticSuccess = () => {
  if (native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
