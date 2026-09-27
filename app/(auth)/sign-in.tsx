import { router } from "expo-router";
import { ArrowRight } from "lucide-react-native";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FocusStatusBar } from "@/components/focus-status-bar";
import { Logo } from "@/components/logo";
import { GentleIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useSaj } from "@/lib/store";

/**
 * "Let's begin beautifully." UI only for now: both buttons just enter the app.
 * Step 13 of the build guide wires this to Supabase sign-in.
 */
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const { finishOnboarding } = useSaj();

  const enter = () => {
    finishOnboarding();
    router.replace("/home");
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-background">
      <FocusStatusBar style="dark" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="grow justify-between px-6"
        contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }}
      >
        <View className="flex-row items-start justify-between">
          <Logo />
          <Text className="text-xs leading-4 text-muted-foreground">WELCOME</Text>
        </View>

        <GentleIn className="py-10">
          <Text className="font-semibold text-xs leading-4 tracking-[2.16px] text-primary">YOUR BRIDAL EDIT</Text>
          <Text className="mt-3 font-display text-5xl leading-[50.4px]">{"Let’s begin\nbeautifully."}</Text>
          <Text className="mt-4 max-w-xs text-sm leading-[22.75px] text-muted-foreground">
            Save artists, plan your services and keep every booking in one calm place.
          </Text>
          <View className="mt-9 gap-3">
            <Input
              accessibilityLabel="Phone number"
              placeholder="Phone number"
              keyboardType="phone-pad"
              autoComplete="tel"
              maxLength={10}
              className="h-14 rounded-2xl bg-card px-4"
            />
            <Button size="lg" className="w-full" iconRight={ArrowRight} onPress={enter}>
              Continue with phone
            </Button>
          </View>
        </GentleIn>

        <Button variant="ghost" onPress={enter}>
          Explore as guest
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
