import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { FlatList, ScrollView, useWindowDimensions, View } from "react-native";
import { FocusStatusBar } from "@/components/focus-status-bar";
import { Header, useHeaderHeight } from "@/components/header";
import { HomeSearch } from "@/components/home-search";
import { GentleIn } from "@/components/motion";
import { PortfolioCard } from "@/components/portfolio-card";
import { ServicesGrid } from "@/components/services-grid";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Text } from "@/components/ui/text";
import { UpcomingBooking } from "@/components/upcoming-booking";
import { greeting } from "@/lib/format";
import { hapticImpact } from "@/lib/haptics";
import { artists, type Artist, type Service } from "@/lib/saj-data";
import { useSaj } from "@/lib/store";

const openArtist = (a: Artist) => router.push({ pathname: "/artist/[id]", params: { id: String(a.id) } });
const openService = (s: Service, artistId = 1) =>
  router.push({ pathname: "/service/[id]", params: { id: String(s.id), artist: String(artistId) } });

export default function Home() {
  const headerHeight = useHeaderHeight();
  const { booking } = useSaj();
  const scroller = useRef<ScrollView>(null);

  // Like the web version, Home always opens at the top, so a new upcoming
  // booking is the first thing the bride sees when she comes back.
  useFocusEffect(
    useCallback(() => {
      scroller.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="dark" />
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: 112 }}
      >
        <GentleIn>
          <View className="px-5 pb-6 pt-6">
            <Text className="font-bold text-[11px] leading-[16.5px] tracking-[2.2px] text-primary">{greeting()}, BRIDE-TO-BE</Text>
            <Text className="mt-3 max-w-sm font-display text-[40px] leading-[41.6px]">Everything she needs for her big day.</Text>
          </View>

          <UpcomingBooking booking={booking} onPlan={() => router.navigate("/explore")} onTrack={() => router.push("/tracking")} />
          <HomeSearch openArtist={openArtist} openService={(s) => openService(s)} />
          <TrendingLooks />
          <ServicesGrid openService={(s) => openService(s)} onSeeAll={() => router.navigate("/explore")} />
        </GentleIn>
      </ScrollView>
      <Header />
    </View>
  );
}

function TrendingLooks() {
  const { width } = useWindowDimensions();
  const { saved, toggleSave } = useSaj();
  const [current, setCurrent] = useState(1);

  const cardW = Math.min(width * 0.82, 340);
  const gap = 16;
  const pad = 20;
  // Snap each card to the centre of the screen (snap-center on the web).
  const maxScroll = pad * 2 + artists.length * cardW + (artists.length - 1) * gap - width;
  const snaps = artists.map((_, i) => Math.min(maxScroll, Math.max(0, pad + i * (cardW + gap) + cardW / 2 - width / 2)));

  return (
    <View className="pt-4">
      <View className="mb-4 flex-row items-end justify-between px-5">
        <View>
          <Eyebrow>CURATED FOR YOU</Eyebrow>
          <Text className="mt-1 font-display text-2xl leading-8">Trending bridal looks</Text>
        </View>
        <Text className="text-xs leading-4 text-muted-foreground">{current} / 8</Text>
      </View>
      <FlatList
        horizontal
        data={artists}
        keyExtractor={(a) => String(a.id)}
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snaps}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 28, gap }}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const next = Math.min(8, Math.max(1, Math.round(e.nativeEvent.contentOffset.x / (width * 0.82)) + 1));
          if (next !== current) setCurrent(next);
        }}
        renderItem={({ item }) => (
          <PortfolioCard
            artist={item}
            width={cardW}
            saved={saved.includes(item.id)}
            onOpen={() => openArtist(item)}
            onSave={() => {
              hapticImpact();
              toggleSave(item.id);
            }}
          />
        )}
      />
    </View>
  );
}
