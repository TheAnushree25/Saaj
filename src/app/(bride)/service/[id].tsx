import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowRight, Check, MapPin, Share2, Star } from "lucide-react-native";
import { Share, StyleSheet, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useScreen } from "@/hooks/use-screen";
import { GlassSurface } from "@/components/layout/glass-surface";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { GentleIn } from "@/components/ui/motion";
import { Button, IconButton } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Text } from "@/components/ui/text";
import { inr } from "@/lib/format";
import { findArtist, findService, metaOf, services } from "@/data/catalogue";
import { berry, colors, ivory, shadows } from "@/theme";

/** A single service: hero, what's included, add-ons and the artist. */
export default function ServiceDetail() {
  const params = useLocalSearchParams<{ id: string; artist?: string }>();
  const service = findService(params.id);
  const artist = findArtist(params.artist);
  const meta = metaOf(service.id);
  const extras = services.filter((s) => s.id !== service.id && metaOf(s.id).type !== meta.type).slice(0, 3);

  const insets = useSafeAreaInsets();
  const { width, height } = useScreen();
  const heroH = Math.max(height * 0.72, 480);

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

  const share = () => Share.share({ message: `${service.name} with ${artist.studio} on SAJ — from ${inr(service.price)}` }).catch(() => {});
  const book = () => router.push({ pathname: "/book", params: { service: String(service.id), artist: String(artist.id) } });
  const tileW = (width - 40 - 12) / 2;
  const pf = colors.primaryForeground;

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 128 + insets.bottom }}
        >
          {/* Hero */}
          <View style={{ height: heroH }} className="overflow-hidden bg-berry-deep">
            <Animated.View style={[StyleSheet.absoluteFill, heroImageStyle]}>
              <Image source={service.image} contentFit="cover" transition={250} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <LinearGradient
              colors={[berry(1), berry(0.2), berry(0.3)]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View className="absolute inset-x-4 flex-row justify-between" style={{ top: insets.top + 16 }}>
              <IconButton label="Go back" icon={ArrowLeft} onPress={() => router.back()} />
              <IconButton label="Share" icon={Share2} onPress={share} />
            </View>
            <GentleIn delay={120} style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 24 }}>
              <View className="self-start rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1">
                <Text className="font-bold text-[10px] leading-[15px] tracking-[2px] text-primary-foreground">{meta.type.toUpperCase()}</Text>
              </View>
              <Text className="mt-4 font-display text-5xl leading-[48px] text-primary-foreground">{service.name}</Text>
              <Text className="mt-3 max-w-sm text-sm leading-[22.75px] text-primary-foreground/85">{service.description}</Text>
              <View className="mt-5 flex-row rounded-[22px] border border-primary-foreground/25 bg-primary-foreground/10 py-3">
                {[
                  ["FROM", inr(service.price)],
                  ["DURATION", service.duration],
                  ["RATING", `★ ${meta.rating}`],
                ].map(([label, value], i) => (
                  <View key={label} className={i > 0 ? "flex-1 items-center border-l border-primary-foreground/20" : "flex-1 items-center"}>
                    <Text className="text-[10px] leading-[15px] text-primary-foreground/70">{label}</Text>
                    <Text className="font-bold text-base leading-6 text-primary-foreground">{value}</Text>
                  </View>
                ))}
              </View>
            </GentleIn>
          </View>

          {/* What's included */}
          <View className="px-5 py-8">
            <Eyebrow>PACKAGE CONTENTS</Eyebrow>
            <Text className="mt-1 font-display text-3xl leading-9">What’s included</Text>
            <View className="mt-5 flex-row flex-wrap gap-3">
              {service.inclusions.map((x, i) => (
                <View key={x} className="rounded-[20px] border border-glass-border bg-glass p-4" style={[shadows.glass, { width: tileW }]}>
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-accent">
                    <Check size={16} color={colors.primary} />
                  </View>
                  <Text className="mt-3 font-bold text-sm leading-5">{x}</Text>
                  <Text className="text-[13px] leading-5 text-muted-foreground">Step {i + 1}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Add-ons */}
          <View className="px-5 pb-8">
            <Eyebrow>COMPLETE THE LOOK</Eyebrow>
            <Text className="mt-1 font-display text-3xl leading-9">Popular add-ons</Text>
            <View className="mt-5 gap-3">
              {extras.map((s) => (
                <PressableScale
                  key={s.id}
                  onPress={() => router.push({ pathname: "/service/[id]", params: { id: String(s.id), artist: String(artist.id) } })}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.name}, add ${inr(s.price)}`}
                  className="flex-row items-center gap-4 rounded-[22px] border border-glass-border bg-glass p-2.5 pr-4"
                  style={shadows.glass}
                >
                  <Image source={s.image} contentFit="cover" style={{ width: 64, height: 64, borderRadius: 29.6 }} />
                  <View className="flex-1">
                    <Text className="font-display text-lg leading-7">{s.name}</Text>
                    <Text className="text-[13px] leading-5 text-muted-foreground">{s.duration}</Text>
                  </View>
                  <Text className="font-bold text-sm leading-5 text-primary">+{inr(s.price)}</Text>
                </PressableScale>
              ))}
            </View>
            <Text className="mt-3 text-xs leading-4 text-muted-foreground">Add these or build a full package in the next step.</Text>
          </View>

          {/* Your artist */}
          <View className="px-5 pb-8">
            <Eyebrow>YOUR ARTIST</Eyebrow>
            <View className="mt-4 rounded-[26px]" style={shadows.luxury}>
              <View className="overflow-hidden rounded-[26px] bg-primary">
                <View className="flex-row gap-4 p-4">
                  <Image source={artist.image} contentFit="cover" accessibilityLabel={artist.name} style={{ width: 96, height: 112, borderRadius: 29.6 }} />
                  <View className="flex-1 py-1">
                    <Text className="font-display text-2xl leading-[30px] text-primary-foreground">{artist.studio}</Text>
                    <View className="mt-1 flex-row items-center gap-1">
                      <MapPin size={12} color={ivory(0.75)} />
                      <Text className="text-xs leading-4 text-primary-foreground/75">
                        {artist.location} · {artist.experience}
                      </Text>
                    </View>
                    <View className="mt-3 flex-row items-center gap-1">
                      <Star size={16} color={pf} fill={pf} />
                      <Text className="text-sm leading-5 text-primary-foreground">
                        {artist.rating} <Text className="text-sm leading-5 text-primary-foreground/70">({artist.reviews} reviews)</Text>
                      </Text>
                    </View>
                  </View>
                </View>
                <Text className="border-t border-primary-foreground/15 px-4 py-4 text-sm leading-[22.75px] text-primary-foreground/85">{artist.bio}</Text>
              </View>
            </View>
          </View>
        </Animated.ScrollView>
      </View>

      {/* Floating price + book bar */}
      <View className="absolute inset-x-0 bottom-0 px-3 pt-3" style={{ paddingBottom: Math.max(16, insets.bottom), pointerEvents: "box-none" }}>
        <View className="w-full max-w-[520px] self-center rounded-[26px]" style={shadows.luxury}>
          <GlassSurface className="flex-row items-center gap-3 rounded-[26px] border border-glass-border p-3 pl-5">
            <View className="flex-1">
              <Text className="text-[13px] leading-5 text-muted-foreground">Starting at</Text>
              <Text className="font-display text-2xl leading-8">{inr(service.price)}</Text>
            </View>
            <Button size="lg" variant="luxury" className="h-14 px-7" iconRight={ArrowRight} onPress={book}>
              Book now
            </Button>
          </GlassSurface>
        </View>
      </View>
    </View>
  );
}
