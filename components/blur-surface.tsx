import { BlurView } from "expo-blur";
import type { ReactNode, RefObject } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type Props = {
  /**
   * The BlurTargetView holding the content behind this surface. Android can
   * only blur a view it is told about (Android 12+); without a target, or on
   * older phones, the surface is just the translucent tint.
   */
  target?: RefObject<View | null>;
  tint?: string;
  intensity?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** Frosted ivory glass: blur of whatever scrolls underneath, plus a tint. */
export function BlurSurface({ target, tint = "rgba(255, 251, 246, 0.74)", intensity = 60, className, style, children }: Props) {
  return (
    <View className={className} style={[styles.clip, style]}>
      <BlurView
        blurTarget={target}
        blurMethod={target ? "dimezisBlurViewSdk31Plus" : "none"}
        intensity={intensity}
        tint="light"
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint, pointerEvents: "none" }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: "hidden" } });
