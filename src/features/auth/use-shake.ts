import { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

/** A quick side-to-side shake, played when a form is submitted with mistakes. */
export function useShake() {
  const x = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const shake = () =>
    x.set(withSequence(withTiming(-9, { duration: 45 }), withRepeat(withTiming(9, { duration: 90 }), 4, true), withTiming(0, { duration: 45 })));
  return { style, shake };
}
