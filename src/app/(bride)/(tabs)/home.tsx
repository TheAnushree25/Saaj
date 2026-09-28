import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";
import { ScrollView, View } from "react-native";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Header, useHeaderHeight } from "@/components/layout/header";
import { GentleIn } from "@/components/ui/motion";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/features/auth/auth-provider";
import { HomeSearch } from "@/features/home/components/home-search";
import { ServicesGrid } from "@/features/home/components/services-grid";
import { TrendingLooks } from "@/features/home/components/trending-looks";
import { UpcomingBooking } from "@/features/home/components/upcoming-booking";
import { greeting } from "@/lib/format";
import { useMyBookings, useRefreshOnFocus } from "@/lib/queries";
import { sz } from "@/theme/scale";

const openArtist = (a: { id: string }) => router.push({ pathname: "/artist/[id]", params: { id: a.id } });
const openService = (s: { slug: string }) => router.push({ pathname: "/service/[id]", params: { id: s.slug } });

export default function Home() {
  const headerHeight = useHeaderHeight();
  const { status, user } = useAuth();
  const signedIn = status === "signed-in";
  const upcoming = useMyBookings("upcoming", signedIn);
  const scroller = useRef<ScrollView>(null);
  const firstName = user?.fullName.split(" ")[0]?.toUpperCase();

  // Like the web version, Home always opens at the top, so a new upcoming
  // booking is the first thing the bride sees when she comes back.
  useFocusEffect(
    useCallback(() => {
      scroller.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );
  useRefreshOnFocus(upcoming.refetch, signedIn);

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="dark" />
      <ScrollView
        ref={scroller}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: sz(112) }}
      >
        <GentleIn>
          <View className="px-5 pb-6 pt-6">
            <Text className="font-bold text-[0.6875rem] leading-[1.0312rem] tracking-[0.1375rem] text-primary">
              {greeting()}, {firstName ?? "BRIDE-TO-BE"}
            </Text>
            <Text className="mt-3 max-w-sm font-display text-[2.5rem] leading-[2.6rem]">Everything she needs for her big day.</Text>
          </View>

          {/* Wait for the bookings before choosing between "upcoming" and "plan your first look". */}
          {signedIn && upcoming.isPending ? null : (
            <UpcomingBooking
              booking={upcoming.data?.[0] ?? null}
              onPlan={() => router.navigate("/explore")}
              onTrack={(id) => router.push({ pathname: "/tracking", params: { id } })}
            />
          )}
          <HomeSearch openArtist={openArtist} openService={openService} />
          <TrendingLooks onOpen={openArtist} />
          <ServicesGrid openService={openService} onSeeAll={() => router.navigate("/explore")} />
        </GentleIn>
      </ScrollView>
      <Header />
    </View>
  );
}
