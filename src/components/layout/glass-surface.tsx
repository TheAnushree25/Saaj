import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "@/theme";
import { cn } from "@/lib/utils";

type Props = { className?: string; style?: StyleProp<ViewStyle>; children?: ReactNode };

/**
 * The design's ivory glass (82% ivory with a backdrop blur).
 * iPhone and web get a real blur under a lighter tint. Android gets the 82%
 * glass on its own: live blur on Android needs an experimental wrapper around
 * the whole screen, which is not worth the risk for a surface this opaque.
 */
export function GlassSurface({ className, style, children }: Props) {
  if (Platform.OS === "android") {
    return (
      <View className={cn("bg-glass", className)} style={style}>
        {children}
      </View>
    );
  }
  return (
    <View className={cn("overflow-hidden", className)} style={style}>
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassOverBlur, pointerEvents: "none" }]} />
      {children}
    </View>
  );
}
