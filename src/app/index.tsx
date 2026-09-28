import { Redirect, router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { FadeInView, GentleIn } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/features/auth/auth-provider";
import { useSaj } from "@/store/saj-store";
import { ivory } from "@/theme";
import { sz } from "@/theme/scale";

/**
 * The cinematic opening. Returning brides skip straight to Home, exactly like
 * the web version. (The three-bride onboarding slides are left out on purpose.)
 */
export default function Opening() {
  const { onboarded } = useSaj();
  const { status } = useAuth();
  if (onboarded || status === "signed-in") return <Redirect href="/home" />;

  return (
    <View className="flex-1 items-center justify-center overflow-hidden bg-primary px-8">
      <FocusStatusBar style="light" />
      <Outlines />
      <View className="items-center">
        <GentleIn>
          <Text className="font-display text-8xl leading-[6rem] text-primary-foreground">SAJ</Text>
        </GentleIn>
        <GentleIn delay={120}>
          <Text className="mt-5 text-xs leading-4 tracking-[0.21rem] text-primary-foreground/70">BRIDAL BEAUTY</Text>
        </GentleIn>
        <GentleIn delay={240}>
          <Text className="mt-14 text-center font-display text-2xl leading-[2.0625rem] text-primary-foreground">
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
            x={sz(24) + 0.5}
            y={sz(24) + 0.5}
            width={size.w - sz(48) - 1}
            height={size.h - sz(48) - 1}
            rx={(size.w - sz(48)) * 0.4}
            ry={(size.h - sz(48)) * 0.4}
            stroke={line}
            strokeWidth={1}
            fill="none"
          />
          <Circle cx={sz(52)} cy={sz(208)} r={sz(112) - 0.5} stroke={line} strokeWidth={1} fill="none" />
        </Svg>
      ) : null}
    </FadeInView>
  );
}
