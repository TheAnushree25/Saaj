import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowRight, Check, MapPin, Share2, Star } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Share, StyleSheet, View } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { GlassSurface } from "@/components/layout/glass-surface";
import { Header } from "@/components/layout/header";
import { Button, IconButton } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GentleIn } from "@/components/ui/motion";
import { PressableScale } from "@/components/ui/pressable-scale";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { Text } from "@/components/ui/text";
import { pictureOf } from "@/data/catalogue";
import { useAuth } from "@/features/auth/auth-provider";
import { askToSignIn } from "@/features/saved/use-saved";
import { useScreen } from "@/hooks/use-screen";
import type { ServiceDetail as Service } from "@/lib/api-types";
import { duration, rupees } from "@/lib/format";
import { useArtist, useService } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { berry, colors, ivory, shadows } from "@/theme";
import { sz } from "@/theme/scale";

/** A single service: hero, what's included, add-ons and the artist. */
export default function ServiceScreen() {
  const params = useLocalSearchParams<{ id: string; artist?: string }>();
  const service = useService(params.id);

  if (service.isPending || service.isError) {
    return (
      <View className="flex-1 justify-center bg-background">
        <FocusStatusBar style="dark" />
        {service.isPending ? <LoadingState /> : <ErrorState error={service.error} onRetry={() => void service.refetch()} />}
        <Header onBack={() => router.back()} />
      </View>
    );
  }
  return <ServicePage service={service.data} preferredArtist={params.artist} />;
}

function ServicePage({ service, preferredArtist }: { service: Service; preferredArtist?: string }) {
  const { status } = useAuth();
  const [chosenId, setChosenId] = useState(preferredArtist);
  // The artist she came from, or else the top one (featured first, then best rated).
  const offering = service.artists.find((a) => a.id === chosenId) ?? service.artists[0];
  const artist = useArtist(offering?.id);
  const extras = (artist.data?.services ?? []).filter((s) => s.serviceId !== service.id).slice(0, 3);

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

  if (!offering) return null;

  const price = rupees(offering.pricePaise);
  const share = () => Share.share({ message: `${service.name} with ${offering.studioName} on SAJ — from ${price}` }).catch(() => {});
  const book = () => {
    if (status !== "signed-in") return askToSignIn();
    router.push({ pathname: "/book", params: { artist: offering.id, offering: offering.artistServiceId } });
  };
  const tileW = (width - sz(52)) / 2;
  const pf = colors.primaryForeground;

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="light" />
      <View style={{ flex: 1 }}>
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: sz(128) + insets.bottom }}
        >
          {/* Hero */}
          <View style={{ height: heroH }} className="overflow-hidden bg-berry-deep">
            <Animated.View style={[StyleSheet.absoluteFill, heroImageStyle]}>
              <Image source={pictureOf(service.imageUrl, service.id)} contentFit="cover" transition={250} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <LinearGradient
              colors={[berry(1), berry(0.2), berry(0.3)]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 1 }}
              end={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <View className="absolute inset-x-4 flex-row justify-between" style={{ top: insets.top + sz(16) }}>
              <IconButton label="Go back" icon={ArrowLeft} onPress={() => router.back()} />
              <IconButton label="Share" icon={Share2} onPress={share} />
            </View>
            <GentleIn delay={120} style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: sz(24) }}>
              <View className="self-start rounded-full border border-primary-foreground/30 bg-primary-foreground/10 px-3 py-1">
                <Text className="font-bold text-[0.625rem] leading-[0.9375rem] tracking-[0.125rem] text-primary-foreground">
                  {service.category.name.toUpperCase()}
                </Text>
              </View>
              <Text className="mt-4 font-display text-5xl leading-[3rem] text-primary-foreground">{service.name}</Text>
              {service.description ? (
                <Text className="mt-3 max-w-sm text-sm leading-[1.4219rem] text-primary-foreground/85">{service.description}</Text>
              ) : null}
              <View className="mt-5 flex-row rounded-[1.375rem] border border-primary-foreground/25 bg-primary-foreground/10 py-3">
                {[
                  ["FROM", price],
                  ["DURATION", duration(offering.durationMinutes)],
                  ["RATING", offering.rating === null ? "New" : `★ ${offering.rating}`],
                ].map(([label, value], i) => (
                  <View key={label} className={i > 0 ? "flex-1 items-center border-l border-primary-foreground/20" : "flex-1 items-center"}>
                    <Text className="text-[0.625rem] leading-[0.9375rem] text-primary-foreground/70">{label}</Text>
                    <Text className="font-bold text-base leading-6 text-primary-foreground">{value}</Text>
                  </View>
                ))}
              </View>
            </GentleIn>
          </View>

          {/* What's included */}
          {service.inclusions.length ? (
            <View className="px-5 py-8">
              <Eyebrow>PACKAGE CONTENTS</Eyebrow>
              <Text className="mt-1 font-display text-3xl leading-9">What’s included</Text>
              <View className="mt-5 flex-row flex-wrap gap-3">
                {service.inclusions.map((x, i) => (
                  <View key={x} className="rounded-[1.25rem] border border-glass-border bg-glass p-4" style={[shadows.glass, { width: tileW }]}>
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-accent">
                      <Check size={sz(16)} color={colors.primary} />
                    </View>
                    <Text className="mt-3 font-bold text-sm leading-5">{x}</Text>
                    <Text className="text-[0.8125rem] leading-5 text-muted-foreground">Step {i + 1}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Add-ons from the same artist */}
          {extras.length ? (
            <View className="px-5 pb-8">
              <Eyebrow>COMPLETE THE LOOK</Eyebrow>
              <Text className="mt-1 font-display text-3xl leading-9">Popular add-ons</Text>
              <View className="mt-5 gap-3">
                {extras.map((s) => (
                  <PressableScale
                    key={s.artistServiceId}
                    onPress={() => router.push({ pathname: "/service/[id]", params: { id: s.slug, artist: offering.id } })}
                    accessibilityRole="button"
                    accessibilityLabel={`${s.name}, add ${rupees(s.pricePaise)}`}
                    className="flex-row items-center gap-4 rounded-[1.375rem] border border-glass-border bg-glass p-2.5 pr-4"
                    style={shadows.glass}
                  >
                    <Image source={pictureOf(s.imageUrl, s.serviceId)} contentFit="cover" style={{ width: sz(64), height: sz(64), borderRadius: sz(29.6) }} />
                    <View className="flex-1">
                      <Text className="font-display text-lg leading-7">{s.name}</Text>
                      <Text className="text-[0.8125rem] leading-5 text-muted-foreground">{duration(s.durationMinutes)}</Text>
                    </View>
                    <Text className="font-bold text-sm leading-5 text-primary">+{rupees(s.pricePaise)}</Text>
                  </PressableScale>
                ))}
              </View>
              <Text className="mt-3 text-xs leading-4 text-muted-foreground">Add these or build a full package in the next step.</Text>
            </View>
          ) : null}

          {/* Your artist */}
          <View className="px-5 pb-8">
            <Eyebrow>YOUR ARTIST</Eyebrow>
            <PressableScale
              onPress={() => router.push({ pathname: "/artist/[id]", params: { id: offering.id } })}
              accessibilityRole="button"
              accessibilityLabel={`${offering.studioName} portfolio`}
              className="mt-4 rounded-[1.625rem]"
              style={shadows.luxury}
            >
              <View className="overflow-hidden rounded-[1.625rem] bg-primary">
                <View className="flex-row gap-4 p-4">
                  <Image
                    source={pictureOf(offering.profileImageUrl, offering.id)}
                    contentFit="cover"
                    accessibilityLabel={offering.artistName}
                    style={{ width: sz(96), height: sz(112), borderRadius: sz(29.6) }}
                  />
                  <View className="flex-1 py-1">
                    <Text className="font-display text-2xl leading-[1.875rem] text-primary-foreground">{offering.studioName}</Text>
                    <View className="mt-1 flex-row items-center gap-1">
                      <MapPin size={sz(12)} color={ivory(0.75)} />
                      <Text className="text-xs leading-4 text-primary-foreground/75">
                        {offering.city} · {offering.experienceYears} {offering.experienceYears === 1 ? "year" : "years"}
                      </Text>
                    </View>
                    <View className="mt-3 flex-row items-center gap-1">
                      <Star size={sz(16)} color={pf} fill={pf} />
                      <Text className="text-sm leading-5 text-primary-foreground">
                        {offering.rating ?? "New"}{" "}
                        <Text className="text-sm leading-5 text-primary-foreground/70">({offering.reviewCount} reviews)</Text>
                      </Text>
                    </View>
                  </View>
                </View>
                {artist.data?.bio ? (
                  <Text className="border-t border-primary-foreground/15 px-4 py-4 text-sm leading-[1.4219rem] text-primary-foreground/85">
                    {artist.data.bio}
                  </Text>
                ) : null}
              </View>
            </PressableScale>

            {service.artists.length > 1 ? (
              <>
                <Text className="mt-6 text-xs leading-4 text-muted-foreground">Also offered by</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 mt-3" contentContainerClassName="gap-2 px-5 pb-1">
                  {service.artists.map((a) => {
                    const on = a.id === offering.id;
                    return (
                      <PressableScale
                        key={a.id}
                        onPress={() => setChosenId(a.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        accessibilityLabel={`${a.studioName}, ${rupees(a.pricePaise)}`}
                        className={cn("flex-row items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-4", on ? "border-primary bg-accent" : "border-glass-border bg-glass")}
                      >
                        <Image source={pictureOf(a.profileImageUrl, a.id)} contentFit="cover" style={{ width: sz(32), height: sz(32), borderRadius: sz(16) }} />
                        <View>
                          <Text className="font-bold text-xs leading-4">{a.studioName}</Text>
                          <Text className="text-[0.6875rem] leading-4 text-muted-foreground">{rupees(a.pricePaise)}</Text>
                        </View>
                      </PressableScale>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
          </View>
        </Animated.ScrollView>
      </View>

      {/* Floating price + book bar */}
      <View className="absolute inset-x-0 bottom-0 px-3 pt-3" style={{ paddingBottom: Math.max(sz(16), insets.bottom), pointerEvents: "box-none" }}>
        <View className="w-full max-w-[32.5rem] self-center rounded-[1.625rem]" style={shadows.luxury}>
          <GlassSurface className="flex-row items-center gap-3 rounded-[1.625rem] border border-glass-border p-3 pl-5">
            <View className="flex-1">
              <Text className="text-[0.8125rem] leading-5 text-muted-foreground">With {offering.studioName}</Text>
              <Text className="font-display text-2xl leading-8">{price}</Text>
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
