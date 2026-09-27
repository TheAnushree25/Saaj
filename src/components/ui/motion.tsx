import { useEffect, type ReactNode } from "react";
import { Platform, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// Entrance animations driven by plain shared values.
//
// Rule for the whole app: animated components get `style` only, never
// `className`. NativeWind styles plain React Native components; mixing its
// className handling with Reanimated's animated styles is what broke layouts
// on Android. Put classes on a View inside (or around) these wrappers.

const EASE_OUT = Easing.bezier(0, 0, 0.58, 1); // CSS ease-out

type Props = { delay?: number; style?: StyleProp<ViewStyle>; children?: ReactNode };

/** The design's "gentle-in": fade up 10px over 450ms. */
export function GentleIn({ delay = 0, style, children }: Props) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay, withTiming(1, { duration: 450, easing: EASE_OUT })));
  }, [p, delay]);
  const anim = useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ translateY: (1 - p.get()) * 10 }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** A plain fade, for things that should appear without moving. */
export function FadeInView({ delay = 0, duration = 350, style, children }: Props & { duration?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay, withTiming(1, { duration })));
  }, [p, delay, duration]);
  const anim = useAnimatedStyle(() => ({ opacity: p.get() }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Rises further and slower: for sheets and cards that slide into place. */
export function RiseIn({ delay = 0, distance = 36, style, children }: Props & { distance?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay, withTiming(1, { duration: 650, easing: Easing.bezier(0.16, 1, 0.3, 1) })));
  }, [p, delay]);
  const anim = useAnimatedStyle(() => ({ opacity: p.get(), transform: [{ translateY: (1 - p.get()) * distance }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

/** Springs up from nothing, like the tick on the confirmation screen. */
export function PopIn({ delay = 0, style, children }: Props) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(delay, withSpring(1, { damping: 12, stiffness: 140 })));
  }, [p, delay]);
  const anim = useAnimatedStyle(() => ({ opacity: Math.min(1, p.get() * 2), transform: [{ scale: p.get() }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

// Smooth re-flow when list items are added, removed or re-sorted. Phone only:
// the web preview simply swaps the items.
const native = Platform.OS !== "web";
export const listLayout = native ? LinearTransition.duration(360) : undefined;
export const listEnter = native ? FadeIn.duration(260) : undefined;
export const listExit = native ? FadeOut.duration(160) : undefined;
