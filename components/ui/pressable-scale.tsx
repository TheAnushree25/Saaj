import type { GestureResponderEvent, PressableProps, StyleProp, ViewStyle } from "react-native";
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { AnimatedPressable } from "@/lib/interop";

/**
 * The sink-and-spring press effect on its own, for when the thing that should
 * shrink is not the Pressable itself (e.g. a card with its own save button).
 */
export function usePressScale(scaleTo = 0.98) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return {
    style,
    onPressIn: () => scale.set(withTiming(scaleTo, { duration: 120 })),
    onPressOut: () => scale.set(withSpring(1, { damping: 15, stiffness: 280, mass: 0.6 })),
  };
}

type Props = Omit<PressableProps, "style"> & {
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** How far it sinks while pressed. The web design uses 0.98 on cards. */
  scaleTo?: number;
};

/** A Pressable that sinks slightly under the finger and springs back. */
export function PressableScale({ scaleTo = 0.98, onPressIn, onPressOut, style, ...rest }: Props) {
  const press = usePressScale(scaleTo);
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e: GestureResponderEvent) => {
        press.onPressIn();
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        press.onPressOut();
        onPressOut?.(e);
      }}
      style={[style, press.style]}
    />
  );
}
