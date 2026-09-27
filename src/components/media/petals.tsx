import { useEffect } from "react";
import { useScreen } from "@/hooks/use-screen";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { ivory } from "@/theme";
import { sz } from "@/theme/scale";

type PetalProps = { left: `${number}%`; top: number; size: number; alpha: number; delay: number };

// The web design's "petal-float": drift down 110% of the screen and 18px right
// while turning 200°, fading in to half opacity and back out, every 7 seconds.
function Petal({ left, top, size, alpha, delay }: PetalProps) {
  const { height } = useScreen();
  const t = useSharedValue(0);

  useEffect(() => {
    t.set(withDelay(delay, withRepeat(withTiming(1, { duration: 7000, easing: Easing.linear }), -1, false)));
  }, [t, delay]);

  const style = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: p < 0.15 ? interpolate(p, [0, 0.15], [0, 0.5]) : interpolate(p, [0.15, 1], [0.5, 0]),
      transform: [{ translateX: 18 * p }, { translateY: -8 + (height * 1.1 + 8) * p }, { rotate: `${200 * p}deg` }],
    };
  });

  return (
    <Animated.Text style={[{ position: "absolute", left, top, fontSize: size, color: ivory(alpha), pointerEvents: "none" }, style]}>
      ✦
    </Animated.Text>
  );
}

export function Petals() {
  return (
    <>
      <Petal left="15%" top={0} size={sz(24)} alpha={0.3} delay={0} />
      <Petal left="75%" top={-160} size={sz(18)} alpha={0.2} delay={2000} />
      <Petal left="42%" top={-60} size={sz(14)} alpha={0.22} delay={3600} />
      <Petal left="88%" top={-20} size={sz(12)} alpha={0.18} delay={5200} />
      <Petal left="6%" top={-120} size={sz(16)} alpha={0.2} delay={1200} />
    </>
  );
}
