import { Image } from "expo-image";
import { router } from "expo-router";
import { Heart } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Header, useHeaderHeight } from "@/components/layout/header";
import { Button, IconButton } from "@/components/ui/button";
import { FadeInView, GentleIn, listExit, listLayout } from "@/components/ui/motion";
import { PressableScale } from "@/components/ui/pressable-scale";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Text } from "@/components/ui/text";
import { pictureOf } from "@/data/catalogue";
import { useAuth } from "@/features/auth/auth-provider";
import { askToSignIn, useSaved } from "@/features/saved/use-saved";
import { useScreen } from "@/hooks/use-screen";
import { useRefreshOnFocus } from "@/lib/queries";
import { shadows } from "@/theme";
import { sz } from "@/theme/scale";

export default function Saved() {
  const headerHeight = useHeaderHeight();
  const { width } = useScreen();
  const { status } = useAuth();
  const saved = useSaved();
  const cardW = (width - sz(52)) / 2;
  useRefreshOnFocus(saved.refetch, status === "signed-in");

  const body = () => {
    if (status !== "signed-in") {
      return (
        <EmptyState
          icon={Heart}
          title="Keep a shortlist"
          body="Sign in to save the artists you love. Your shortlist follows you to any phone."
          action={
            <Button size="lg" className="mt-6 min-w-44" onPress={askToSignIn}>
              Sign in
            </Button>
          }
        />
      );
    }
    if (saved.isLoading) return <LoadingState />;
    if (saved.isError) return <ErrorState error={null} onRetry={() => void saved.refetch()} />;
    if (!saved.saved.length) {
      return (
        <FadeInView>
          <EmptyState icon={Heart} title="Your edit awaits" body="Tap the heart on an artist you love." />
        </FadeInView>
      );
    }
    return (
      <View className="mt-6 flex-row flex-wrap gap-3">
        {saved.saved.map((a) => (
          <Animated.View key={a.id} layout={listLayout} exiting={listExit} style={[shadows.sm, { width: cardW, borderRadius: sz(29.6) }]}>
            <View className="overflow-hidden rounded-2xl bg-card">
              <PressableScale
                onPress={() => router.push({ pathname: "/artist/[id]", params: { id: a.id } })}
                accessibilityRole="button"
                accessibilityLabel={a.studioName}
              >
                <Image source={pictureOf(a.profileImageUrl, a.id)} contentFit="cover" style={{ width: "100%", aspectRatio: 4 / 5 }} />
                <View className="p-3">
                  <Text numberOfLines={1} className="font-display text-lg leading-7">
                    {a.studioName}
                  </Text>
                  <Text className="mt-1 text-[0.6875rem] leading-[1.0312rem] text-muted-foreground">
                    ★ {a.rating ?? "New"} · {a.city}
                  </Text>
                </View>
              </PressableScale>
              <View className="absolute right-2 top-2">
                <IconButton label="Remove saved artist" icon={Heart} active filled onPress={() => saved.toggle(a)} />
              </View>
            </View>
          </Animated.View>
        ))}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: sz(112) }}>
        <GentleIn>
          <View className="px-5 py-7">
            <Text className="font-display text-4xl leading-10">Your shortlist.</Text>
            <Text className="mt-2 text-sm leading-5 text-muted-foreground">The artists you’d love to come back to.</Text>
            {body()}
          </View>
        </GentleIn>
      </ScrollView>
      <Header title="Saved artists" />
    </View>
  );
}
