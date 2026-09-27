import { Image } from "expo-image";
import { router } from "expo-router";
import { Heart } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import Animated from "react-native-reanimated";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Header, useHeaderHeight } from "@/components/layout/header";
import { IconButton } from "@/components/ui/button";
import { FadeInView, GentleIn, listExit, listLayout } from "@/components/ui/motion";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Text } from "@/components/ui/text";
import { artists } from "@/data/catalogue";
import { useScreen } from "@/hooks/use-screen";
import { hapticImpact } from "@/lib/haptics";
import { useSaj } from "@/store/saj-store";
import { colors, shadows } from "@/theme";
import { sz } from "@/theme/scale";

export default function Saved() {
  const headerHeight = useHeaderHeight();
  const { width } = useScreen();
  const { saved, toggleSave } = useSaj();
  const list = artists.filter((a) => saved.includes(a.id));
  const cardW = (width - sz(52)) / 2;

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: sz(112) }}>
        <GentleIn>
          <View className="px-5 py-7">
            <Text className="font-display text-4xl leading-10">Your shortlist.</Text>
            <Text className="mt-2 text-sm leading-5 text-muted-foreground">The artists you’d love to come back to.</Text>

            {list.length ? (
              <View className="mt-6 flex-row flex-wrap gap-3">
                {list.map((a) => (
                  <Animated.View key={a.id} layout={listLayout} exiting={listExit} style={[shadows.sm, { width: cardW, borderRadius: sz(29.6) }]}>
                    <View className="overflow-hidden rounded-2xl bg-card">
                      <PressableScale
                        onPress={() => router.push({ pathname: "/artist/[id]", params: { id: String(a.id) } })}
                        accessibilityRole="button"
                        accessibilityLabel={a.studio}
                      >
                        <Image source={a.image} contentFit="cover" style={{ width: "100%", aspectRatio: 4 / 5 }} />
                        <View className="p-3">
                          <Text numberOfLines={1} className="font-display text-lg leading-7">
                            {a.studio}
                          </Text>
                          <Text className="mt-1 text-[0.6875rem] leading-[1.0312rem] text-muted-foreground">
                            ★ {a.rating} · {a.location}
                          </Text>
                        </View>
                      </PressableScale>
                      <View className="absolute right-2 top-2">
                        <IconButton
                          label="Remove saved artist"
                          icon={Heart}
                          active
                          filled
                          onPress={() => {
                            hapticImpact();
                            toggleSave(a.id);
                          }}
                        />
                      </View>
                    </View>
                  </Animated.View>
                ))}
              </View>
            ) : (
              <FadeInView>
                <View className="items-center py-24">
                  <Heart size={sz(36)} color={colors.mutedForeground} />
                  <Text className="mt-4 font-display text-2xl leading-8">Your edit awaits</Text>
                  <Text className="mt-2 text-sm leading-5 text-muted-foreground">Tap the heart on an artist you love.</Text>
                </View>
              </FadeInView>
            )}
          </View>
        </GentleIn>
      </ScrollView>
      <Header title="Saved artists" />
    </View>
  );
}
