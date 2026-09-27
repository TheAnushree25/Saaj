import { Redirect, router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { FocusStatusBar } from "@/components/focus-status-bar";
import { FadeInView, GentleIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useSaj } from "@/lib/store";
import { ivory } from "@/lib/theme";

/**
 * The cinematic opening. Returning brides skip straight to Home, exactly like
 * the web version. (The three-bride onboarding slides are left out on purpose.)
 */
export default function Opening() {
  const { onboarded } = useSaj();
  if (onboarded) return <Redirect href="/home" />;

  return (
    <View className="flex-1 items-center justify-center overflow-hidden bg-primary px-8">
      <FocusStatusBar style="light" />
      <Outlines />
      <View className="items-center">
        <GentleIn>
          <Text className="font-display text-8xl leading-[96px] text-primary-foreground">SAJ</Text>
        </GentleIn>
        <GentleIn delay={120}>
          <Text className="mt-5 text-xs leading-4 tracking-[3.36px] text-primary-foreground/70">BRIDAL BEAUTY</Text>
        </GentleIn>
        <GentleIn delay={240}>
          <Text className="mt-14 text-center font-display text-2xl leading-[33px] text-primary-foreground">
            {"Everything she needs\nfor her big day."}
          </Text>
        </GentleIn>
        <GentleIn delay={380}>
          <Button variant="glass" size="lg" className="mt-12 min-w-44" iconRight={ArrowRight} onPress={() => router.push("/sign-in")}>
            Begin
          </Button>
        </GentleIn>
      </View>
    </View>
  );
}

/** The two hairline shapes behind the logo: a tall 40%-rounded frame and a circle. */
function Outlines() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const line = ivory(0.1);
  return (
    <FadeInView
      duration={1200}
      style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
    >
      <View style={StyleSheet.absoluteFill} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })} />
      {size.w > 0 ? (
        <Svg width={size.w} height={size.h}>
          <Rect
            x={24.5}
            y={24.5}
            width={size.w - 49}
            height={size.h - 49}
            rx={(size.w - 48) * 0.4}
            ry={(size.h - 48) * 0.4}
            stroke={line}
            strokeWidth={1}
            fill="none"
          />
          <Circle cx={52} cy={208} r={111.5} stroke={line} strokeWidth={1} fill="none" />
        </Svg>
      ) : null}
    </FadeInView>
  );
}
