import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Logo } from "@/components/brand/logo";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Petals } from "@/components/media/petals";
import { GentleIn, RiseIn } from "@/components/ui/motion";
import { Text } from "@/components/ui/text";
import { images } from "@/data/catalogue";
import { useScreen } from "@/hooks/use-screen";
import { berry } from "@/theme";

type Props = {
  title: string;
  /** Short line at the top of the ivory card. */
  intro: string;
  children: ReactNode;
};

/**
 * The cinematic frame shared by sign-in and sign-up: a bridal portrait drifting
 * in a slow zoom behind a berry veil, floating petals, the headline over the
 * photo, and an ivory card that rises into place with the form.
 */
export function AuthShell({ title, intro, children }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useScreen();

  // Ken Burns: 18s in, 18s out, forever.
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 18000, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
      ),
    );
  }, [drift]);
  const photo = useAnimatedStyle(() => ({
    transform: [{ scale: 1.06 + drift.get() * 0.12 }, { translateY: -drift.get() * 22 }],
  }));

  return (
    <View className="flex-1 bg-berry-deep">
      <FocusStatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, photo]}>
        <Image source={images.rhea} contentFit="cover" contentPosition={{ left: "50%", top: "18%" }} transition={400} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <LinearGradient
        colors={[berry(0.45), berry(0.05), berry(0.55), berry(0.97)]}
        locations={[0, 0.3, 0.52, 0.72]}
        style={StyleSheet.absoluteFill}
      />
      <Petals />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="grow">
          <View className="flex-row items-start justify-between px-6" style={{ paddingTop: insets.top + 20 }}>
            <Logo light />
            <Text className="text-xs leading-4 tracking-[1.5px] text-primary-foreground/80">WELCOME</Text>
          </View>

          <View className="flex-1 justify-end" style={{ minHeight: height * 0.3 }}>
            <GentleIn delay={200} style={{ paddingHorizontal: 24, paddingBottom: 28 }}>
              <Text className="font-bold text-xs leading-4 tracking-[2.16px] text-primary-foreground/85">YOUR BRIDAL EDIT</Text>
              <Text className="mt-3 font-display text-5xl leading-[50.4px] text-primary-foreground">{title}</Text>
            </GentleIn>
          </View>

          <RiseIn delay={320}>
            <View
              className="rounded-t-[34px] bg-background px-6 pt-7"
              style={{ paddingBottom: insets.bottom + 24, boxShadow: "0px -18px 50px rgba(64, 3, 20, 0.35)" }}
            >
              <View className="mb-6 h-1 w-10 self-center rounded-full bg-border" />
              <Text className="mb-6 text-sm leading-[22.75px] text-muted-foreground">{intro}</Text>
              {children}
            </View>
          </RiseIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
