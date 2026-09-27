import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { Text } from "@/components/ui/text";
import { colors, shadows } from "@/theme";
import { sz } from "@/theme/scale";

type Props = { label: string; loading?: boolean; onPress: () => void };

/** The main call to action: a berry pill with a slow sheen of light passing across it. */
export function ShimmerButton({ label, loading = false, onPress }: Props) {
  const [width, setWidth] = useState(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.set(
      withRepeat(
        withSequence(withDelay(1400, withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) })), withTiming(0, { duration: 0 })),
        -1,
      ),
    );
  }, [sweep]);

  const sheen = useAnimatedStyle(() => ({
    transform: [{ translateX: -120 + sweep.get() * (width + 240) }, { rotate: "18deg" }],
  }));

  return (
    <View className="rounded-full" style={shadows.luxury}>
      <Pressable
        onPress={onPress}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy: loading }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        className="h-14 flex-row items-center justify-center gap-2 overflow-hidden rounded-full bg-primary active:opacity-90"
      >
        <Animated.View style={[styles.sheen, sheen]}>
          <LinearGradient
            colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.28)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {loading ? (
          <ActivityIndicator color={colors.primaryForeground} />
        ) : (
          <>
            <Text className="font-semibold text-[0.9375rem] leading-5 text-primary-foreground">{label}</Text>
            <ArrowRight size={sz(16)} color={colors.primaryForeground} />
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheen: { position: "absolute", top: -sz(24), bottom: -sz(24), left: 0, width: sz(90), pointerEvents: "none" },
});
