import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { ScrollView, View } from "react-native";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Header, useHeaderHeight } from "@/components/layout/header";
import { GentleIn } from "@/components/ui/motion";
import { Text } from "@/components/ui/text";
import type { Artist, Service } from "@/data/catalogue";
import { HomeSearch } from "@/features/home/components/home-search";
import { ServicesGrid } from "@/features/home/components/services-grid";
import { TrendingLooks } from "@/features/home/components/trending-looks";
import { UpcomingBooking } from "@/features/home/components/upcoming-booking";
import { greeting } from "@/lib/format";
import { useSaj } from "@/store/saj-store";

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
          <TrendingLooks onOpen={openArtist} />
          <ServicesGrid openService={(s) => openService(s)} onSeeAll={() => router.navigate("/explore")} />
        </GentleIn>
      </ScrollView>
      <Header />
    </View>
  );
}
