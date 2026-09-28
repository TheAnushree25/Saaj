import { Image, type ImageContentPosition } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useState, type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { Picture } from "@/data/catalogue";

export type Gradient = {
  colors: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
};

type Props = {
  /** The photo this panel floats on. */
  source: Picture;
  /** Size of that photo's container. The panel must be its direct child. */
  frame: { width: number; height: number };
  contentPosition?: ImageContentPosition;
  imageScale?: number;
  /** The gradient laid over the photo, repeated so the tones line up. */
  gradient?: Gradient;
  tint: string;
  radius: number;
  blurRadius?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * Frosted glass over a photo. Instead of a live blur (expensive on Android and
 * missing before Android 12), it draws a blurred copy of the same photo,
 * shifted so the copy lines up exactly with the photo behind the panel.
 */
export function Frosted({ source, frame, contentPosition, imageScale = 1, gradient, tint, radius, blurRadius = 22, className, style, children }: Props) {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  return (
    <View
      className={className}
      style={[{ borderRadius: radius }, style]}
      onLayout={(e) => setOrigin({ x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y })}
    >
      <View style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden", pointerEvents: "none" }]}>
        {origin && frame.width > 0 ? (
          <View style={{ position: "absolute", left: -origin.x, top: -origin.y, width: frame.width, height: frame.height }}>
            <Image
              source={source}
              contentFit="cover"
              contentPosition={contentPosition}
              blurRadius={blurRadius}
              style={{ width: "100%", height: "100%", transform: [{ scale: imageScale }] }}
            />
            {gradient ? <LinearGradient {...gradient} style={StyleSheet.absoluteFill} /> : null}
          </View>
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      </View>
      {children}
    </View>
  );
}
