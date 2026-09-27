import { useEffect } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useButtonColor } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { colors } from "@/theme";

/** Three bars that fill in as the bride moves through the steps. */
export function Progress({ step }: { step: number }) {
  return (
    <View className="px-5 pt-5">
      <View className="flex-row gap-2">
        {[1, 2, 3].map((n) => (
          <ProgressBar key={n} filled={n <= step} />
        ))}
      </View>
      <View className="mt-2 flex-row justify-between">
        {["SERVICE", "DATE & TIME", "DETAILS"].map((l) => (
          <Text key={l} className="font-bold text-[0.5625rem] leading-[0.8438rem] tracking-[0.0675rem] text-muted-foreground">
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

function ProgressBar({ filled }: { filled: boolean }) {
  const progress = useSharedValue(filled ? 1 : 0);
  useEffect(() => {
    progress.set(withTiming(filled ? 1 : 0, { duration: 420 }));
  }, [filled, progress]);
  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));
  return (
    <View className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
      <Animated.View style={[{ height: "100%", borderRadius: 999, backgroundColor: colors.primary }, fill]} />
    </View>
  );
}

export function DateFace({ dow, day }: { dow: string; day: string }) {
  const fg = useButtonColor();
  return (
    <>
      <Text className="font-medium text-[0.75rem] leading-4" style={{ color: fg }}>
        {dow}
      </Text>
      <Text className="font-bold text-lg leading-7" style={{ color: fg }}>
        {day}
      </Text>
    </>
  );
}

export function SlotFace({ time, available }: { time: string; available: boolean }) {
  const fg = useButtonColor();
  return (
    <>
      <Text className="font-medium text-sm leading-5" style={{ color: fg }}>
        {time}
      </Text>
      <Text className="font-medium text-[0.5625rem] leading-[0.8438rem]" style={{ color: available ? fg : colors.mutedForeground }}>
        {available ? "AVAILABLE" : "BOOKED"}
      </Text>
    </>
  );
}
