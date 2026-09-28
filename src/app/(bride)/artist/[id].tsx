import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowRight, ChevronRight, Clock3, Heart, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { GlassSurface } from "@/components/layout/glass-surface";
import { Header } from "@/components/layout/header";
import { Lightbox } from "@/components/media/lightbox";
import { Button, IconButton } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GentleIn } from "@/components/ui/motion";
import { PressableScale } from "@/components/ui/pressable-scale";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { Text } from "@/components/ui/text";
import { pictureOf, type Picture } from "@/data/catalogue";
import { useSaved } from "@/features/saved/use-saved";
import { useScreen } from "@/hooks/use-screen";
import type { ArtistDetail, MenuItem, PortfolioItem } from "@/lib/api-types";
import { duration, rupees } from "@/lib/format";
import { useArtist } from "@/lib/queries";
import { berry, colors, shadows } from "@/theme";
import { sz } from "@/theme/scale";

const title = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** An artist's portfolio: hero, gallery, about, services and a review. */
export default function Portfolio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artist = useArtist(id);

  if (artist.isPending || artist.isError) {
    return (
      <View className="flex-1 justify-center bg-background">
        <FocusStatusBar style="dark" />
        {artist.isPending ? <LoadingState /> : <ErrorState error={artist.error} onRetry={() => void artist.refetch()} />}
        <Header onBack={() => router.back()} />
      </View>
    );
  }
  return <ArtistPage artist={artist.data} />;
}

function ArtistPage({ artist }: { artist: ArtistDetail }) {
  const saved = useSaved();
  const isSaved = saved.isSaved(artist.id);

  const insets = useSafeAreaInsets();
  const { width, height } = useScreen();
  const heroH = Math.max(height * 0.67, 520);

  const [filter, setFilter] = useState<PortfolioItem["occasion"] | "all">("all");
  const [lightbox, setLightbox] = useState<number | null>(null);
  const occasions = [...new Set(artist.portfolio.map((p) => p.occasion).filter((o) => o !== null))];
  const shown = artist.portfolio.filter((p) => filter === "all" || p.occasion === filter);
  const gallery: Picture[] = shown.map((p) => pictureOf(p.imageUrl, p.id));

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

  const openService = (s: MenuItem) => router.push({ pathname: "/service/[id]", params: { id: s.slug, artist: artist.id } });
  const share = () =>
    Share.share({ message: artist.tagline ? `${artist.studioName} on SAJ — “${artist.tagline}”` : `${artist.studioName} on SAJ` }).catch(() => {});
  const colW = (width - sz(32)) / 2;
  // The sticky bar offers her signature service: bridal makeup if she does it, else her first.
  const signature = artist.services.find((s) => s.slug === "bridal-makeup") ?? artist.services[0];
  const review = artist.reviews[0];

  // Photos go in threes: one tall on the left, two stacked on the right.
  const groups = Array.from({ length: Math.ceil(shown.length / 3) }, (_, g) => g * 3);

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: sz(112) + insets.bottom }}
        >
          {/* Hero */}
          <View style={{ height: heroH }} className="overflow-hidden bg-berry-deep">
            <Animated.View style={[StyleSheet.absoluteFill, heroImageStyle]}>
              <Image
                source={pictureOf(artist.coverImageUrl ?? artist.profileImageUrl, artist.id)}
                contentFit="cover"
                transition={250}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <LinearGradient
              colors={[berry(1), berry(0), berry(0.2)]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View className="absolute inset-x-0 top-0 flex-row justify-between p-4" style={{ paddingTop: insets.top + sz(16) }}>
              <IconButton label="Go back" icon={ArrowLeft} onPress={() => router.back()} />
              <View className="flex-row gap-2">
                <IconButton label="Share" icon={Share2} onPress={share} />
                <IconButton
                  label={isSaved ? "Unsave artist" : "Save artist"}
                  icon={Heart}
                  active={isSaved}
                  filled={isSaved}
                  onPress={() => saved.toggle(artist)}
                />
              </View>
            </View>
            <GentleIn delay={120} style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: sz(24) }}>
              <View className="self-start rounded-full bg-ivory/15 px-3 py-1">
                <Text className="text-[0.625rem] leading-[0.9375rem] tracking-[0.0938rem] text-primary-foreground">VERIFIED ARTIST</Text>
              </View>
              <Text className="mt-3 font-display text-4xl leading-10 text-primary-foreground">{artist.studioName}</Text>
              {artist.tagline ? (
                <Text className="mt-2 font-display-italic text-xl leading-7 text-primary-foreground/85">“{artist.tagline}”</Text>
              ) : null}
              <View className="mt-4 flex-row flex-wrap gap-4">
                <Text className="text-xs leading-4 text-primary-foreground">
                  {artist.rating === null ? "New on SAJ" : `★ ${artist.rating} · ${artist.reviewCount} reviews`}
                </Text>
                <Text className="text-xs leading-4 text-primary-foreground">
                  {artist.experienceYears} {artist.experienceYears === 1 ? "year" : "years"}
                </Text>
                <Text className="text-xs leading-4 text-primary-foreground">{artist.city}</Text>
              </View>
            </GentleIn>
          </View>

          {/* Selected work */}
          {artist.portfolio.length ? (
            <View className="py-7">
              <View className="px-5">
                <Eyebrow>SELECTED WORK</Eyebrow>
                <Text className="mt-1 font-display text-3xl leading-9">Portfolio</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 py-4">
                {(["all", ...occasions] as const).map((c) => (
                  <Button key={c} variant={filter === c ? "default" : "glass"} onPress={() => setFilter(c)}>
                    {title(c)}
                  </Button>
                ))}
              </ScrollView>
              <View className="gap-2 px-3">
                {groups.map((start) => (
                  <View key={start} className="flex-row gap-2">
                    <GalleryTile
                      source={gallery[start]}
                      label={`${title(filter ?? "all")} look ${start + 1}`}
                      width={colW}
                      height={colW * 2 + sz(8)}
                      onPress={() => setLightbox(start)}
                    />
                    <View className="gap-2">
                      {[start + 1, start + 2]
                        .filter((i) => i < gallery.length)
                        .map((i) => (
                          <GalleryTile
                            key={i}
                            source={gallery[i]}
                            label={`${title(filter ?? "all")} look ${i + 1}`}
                            width={colW}
                            height={colW}
                            onPress={() => setLightbox(i)}
                          />
                        ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* About */}
          {artist.bio ? (
            <View className="border-y border-border px-5 py-8">
              <Eyebrow>ABOUT THE ARTIST</Eyebrow>
              <Text className="mt-3 font-display text-2xl leading-[2.4375rem]">{artist.bio}</Text>
            </View>
          ) : null}

          {/* Services */}
          <View className="px-5 py-8">
            <Eyebrow>CURATED MENU</Eyebrow>
            <Text className="mt-1 font-display text-3xl leading-9">Services</Text>
            <View className="mt-5 gap-3">
              {artist.services.map((s) => (
                <PressableScale
                  key={s.artistServiceId}
                  onPress={() => openService(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.name}, ${rupees(s.pricePaise)}`}
                  className="flex-row items-center gap-4 rounded-[1.375rem] border border-glass-border bg-glass p-2.5 pr-4"
                  style={shadows.glass}
                >
                  <Image source={pictureOf(s.imageUrl, s.serviceId)} contentFit="cover" style={{ width: sz(76), height: sz(76), borderRadius: sz(29.6) }} />
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="font-display text-lg leading-7">
                      {s.name}
                    </Text>
                    <View className="mt-1 flex-row items-center gap-1">
                      <Clock3 size={sz(12)} color={colors.mutedForeground} />
                      <Text className="text-[0.8125rem] leading-5 text-muted-foreground">{duration(s.durationMinutes)}</Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="font-bold text-sm leading-5">{rupees(s.pricePaise)}</Text>
                    <View className="mt-1">
                      <ChevronRight size={sz(16)} color={colors.primary} />
                    </View>
                  </View>
                </PressableScale>
              ))}
            </View>
          </View>

          {/* Review */}
          {review ? (
            <View className="mx-5 rounded-2xl bg-nude p-5">
              <Text className="text-base leading-6 tracking-[0.125rem] text-primary">{"★".repeat(review.rating)}</Text>
              {review.comment ? <Text className="mt-3 font-display text-xl leading-7">“{review.comment}”</Text> : null}
              <Text className="mt-3 text-xs leading-4 text-muted-foreground">
                {review.author} · {review.occasion}
              </Text>
            </View>
          ) : null}
        </Animated.ScrollView>
      </View>

      {/* Sticky booking bar */}
      {signature ? (
        <GlassSurface className="absolute inset-x-0 bottom-0 border-t border-border px-3 pt-3" style={{ paddingBottom: Math.max(sz(16), insets.bottom) }}>
          <View className="w-full max-w-[26.875rem] flex-row items-center gap-3 self-center">
            <View className="flex-1">
              <Text className="text-[0.8125rem] leading-5 text-muted-foreground">{signature.name}</Text>
              <Text className="font-bold text-base leading-6">{rupees(signature.pricePaise)}</Text>
            </View>
            <Button size="lg" iconRight={ArrowRight} onPress={() => openService(signature)}>
              Book now
            </Button>
          </View>
        </GlassSurface>
      ) : null}

      <Lightbox images={gallery} index={lightbox} onClose={() => setLightbox(null)} />
    </View>
  );
}

function GalleryTile({ source, label, width, height, onPress }: { source: Picture | undefined; label: string; width: number; height: number; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="imagebutton" accessibilityLabel={label} className="overflow-hidden rounded-xl active:opacity-90">
      <Image source={source} contentFit="cover" transition={250} style={{ width, height }} />
    </Pressable>
  );
}
