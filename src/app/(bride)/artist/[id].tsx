import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowRight, ChevronRight, Clock3, Heart, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScreen } from "@/hooks/use-screen";
import { GlassSurface } from "@/components/layout/glass-surface";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Lightbox } from "@/components/media/lightbox";
import { GentleIn } from "@/components/ui/motion";
import { Button, IconButton } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Text } from "@/components/ui/text";
import { inr } from "@/lib/format";
import { hapticImpact } from "@/lib/haptics";
import { findArtist, images, services, type Service } from "@/data/catalogue";
import { useSaj } from "@/store/saj-store";
import { berry, colors, shadows } from "@/theme";

const GALLERY_FILTERS = ["All", "Bridal", "Engagement", "Reception", "Haldi", "Sangeet"];

/** An artist's portfolio: hero, gallery, about, services and a review. */
export default function Portfolio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artist = findArtist(id);
  const { saved, toggleSave } = useSaj();
  const isSaved = saved.includes(artist.id);

  const insets = useSafeAreaInsets();
  const { width, height } = useScreen();
  const heroH = Math.max(height * 0.67, 520);

  const [filter, setFilter] = useState("All");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const gallery = [artist.image, images.ananya, images.meher, images.rhea, artist.image, images.meher];

  // Parallax: the photo drifts at a slower pace than the page as you scroll.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const heroImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.get(), [-heroH, 0, heroH], [-heroH / 2, 0, heroH * 0.4]) },
      { scale: interpolate(scrollY.get(), [-heroH, 0], [2, 1], Extrapolation.CLAMP) },
    ],
  }));

  const openService = (s: Service) => router.push({ pathname: "/service/[id]", params: { id: String(s.id), artist: String(artist.id) } });
  const share = () => Share.share({ message: `${artist.studio} on SAJ — “${artist.tagline}”` }).catch(() => {});
  const colW = (width - 24 - 8) / 2;

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 112 + insets.bottom }}
        >
          {/* Hero */}
          <View style={{ height: heroH }} className="overflow-hidden bg-berry-deep">
            <Animated.View style={[StyleSheet.absoluteFill, heroImageStyle]}>
              <Image source={artist.image} contentFit="cover" transition={250} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <LinearGradient
              colors={[berry(1), berry(0), berry(0.2)]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View className="absolute inset-x-0 top-0 flex-row justify-between p-4" style={{ paddingTop: insets.top + 16 }}>
              <IconButton label="Go back" icon={ArrowLeft} onPress={() => router.back()} />
              <View className="flex-row gap-2">
                <IconButton label="Share" icon={Share2} onPress={share} />
                <IconButton
                  label={isSaved ? "Unsave artist" : "Save artist"}
                  icon={Heart}
                  active={isSaved}
                  filled={isSaved}
                  onPress={() => {
                    hapticImpact();
                    toggleSave(artist.id);
                  }}
                />
              </View>
            </View>
            <GentleIn delay={120} style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 24 }}>
              <View className="self-start rounded-full bg-ivory/15 px-3 py-1">
                <Text className="text-[10px] leading-[15px] tracking-[1.5px] text-primary-foreground">VERIFIED ARTIST</Text>
              </View>
              <Text className="mt-3 font-display text-4xl leading-10 text-primary-foreground">{artist.studio}</Text>
              <Text className="mt-2 font-display-italic text-xl leading-7 text-primary-foreground/85">“{artist.tagline}”</Text>
              <View className="mt-4 flex-row flex-wrap gap-4">
                <Text className="text-xs leading-4 text-primary-foreground">
                  ★ {artist.rating} · {artist.reviews} reviews
                </Text>
                <Text className="text-xs leading-4 text-primary-foreground">{artist.experience}</Text>
                <Text className="text-xs leading-4 text-primary-foreground">{artist.location}</Text>
              </View>
            </GentleIn>
          </View>

          {/* Selected work */}
          <View className="py-7">
            <View className="px-5">
              <Eyebrow>SELECTED WORK</Eyebrow>
              <Text className="mt-1 font-display text-3xl leading-9">Portfolio</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 py-4">
              {GALLERY_FILTERS.map((c) => (
                <Button key={c} variant={filter === c ? "default" : "glass"} onPress={() => setFilter(c)}>
                  {c}
                </Button>
              ))}
            </ScrollView>
            <View className="gap-2 px-3">
              {[0, 3].map((start) => (
                <View key={start} className="flex-row gap-2">
                  <GalleryTile source={gallery[start]} label={`${filter} look ${start + 1}`} width={colW} height={colW * 2 + 8} onPress={() => setLightbox(start)} />
                  <View className="gap-2">
                    {[start + 1, start + 2].map((i) => (
                      <GalleryTile key={i} source={gallery[i]} label={`${filter} look ${i + 1}`} width={colW} height={colW} onPress={() => setLightbox(i)} />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* About */}
          <View className="border-y border-border px-5 py-8">
            <Eyebrow>ABOUT THE ARTIST</Eyebrow>
            <Text className="mt-3 font-display text-2xl leading-[39px]">{artist.bio}</Text>
          </View>

          {/* Services */}
          <View className="px-5 py-8">
            <Eyebrow>CURATED MENU</Eyebrow>
            <Text className="mt-1 font-display text-3xl leading-9">Services</Text>
            <View className="mt-5 gap-3">
              {services.slice(0, 4).map((s) => (
                <PressableScale
                  key={s.id}
                  onPress={() => openService(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.name}, ${inr(s.price)}`}
                  className="flex-row items-center gap-4 rounded-[22px] border border-glass-border bg-glass p-2.5 pr-4"
                  style={shadows.glass}
                >
                  <Image source={s.image} contentFit="cover" style={{ width: 76, height: 76, borderRadius: 29.6 }} />
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="font-display text-lg leading-7">
                      {s.name}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1">
                      <Clock3 size={12} color={colors.mutedForeground} />
                      <Text className="text-[13px] leading-5 text-muted-foreground">{s.duration}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="font-bold text-sm leading-5">{inr(s.price)}</Text>
                    <View className="mt-1">
                      <ChevronRight size={16} color={colors.primary} />
                    </View>
                  </View>
                </PressableScale>
              ))}
            </View>
          </View>

          {/* Review */}
          <View className="mx-5 rounded-2xl bg-nude p-5">
            <Text className="text-base leading-6 tracking-[2px] text-primary">★★★★★</Text>
            <Text className="mt-3 font-display text-xl leading-7">“From the trial to the final touch, I felt completely understood.”</Text>
            <Text className="mt-3 text-xs leading-4 text-muted-foreground">Mira S. · December bride</Text>
          </View>
        </Animated.ScrollView>
      </View>

      {/* Sticky booking bar */}
      <GlassSurface className="absolute inset-x-0 bottom-0 border-t border-border px-3 pt-3" style={{ paddingBottom: Math.max(16, insets.bottom) }}>
        <View className="w-full max-w-[430px] flex-row items-center gap-3 self-center">
          <View className="flex-1">
            <Text className="text-[13px] leading-5 text-muted-foreground">Bridal Makeup</Text>
            <Text className="font-bold text-base leading-6">₹25,000</Text>
          </View>
          <Button size="lg" iconRight={ArrowRight} onPress={() => openService(services[0])}>
            Book now
          </Button>
        </View>
      </GlassSurface>

      <Lightbox images={gallery} index={lightbox} onClose={() => setLightbox(null)} />
    </View>
  );
}

function GalleryTile({ source, label, width, height, onPress }: { source: number; label: string; width: number; height: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="imagebutton" accessibilityLabel={label} className="overflow-hidden rounded-xl active:opacity-90">
      <Image source={source} contentFit="cover" transition={250} style={{ width, height }} />
    </Pressable>
  );
}
