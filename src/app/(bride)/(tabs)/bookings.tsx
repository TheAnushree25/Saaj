import { Image } from "expo-image";
import { router } from "expo-router";
import { CalendarDays, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Header, useHeaderHeight } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { FadeInView, GentleIn } from "@/components/ui/motion";
import { PressableScale } from "@/components/ui/pressable-scale";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Text } from "@/components/ui/text";
import { pictureOf } from "@/data/catalogue";
import { useAuth } from "@/features/auth/auth-provider";
import { statusLabel } from "@/features/booking/status";
import { askToSignIn } from "@/features/saved/use-saved";
import type { BookingCard } from "@/lib/api-types";
import { clockTime, rupees, shortDate } from "@/lib/format";
import { useMyBookings, useRefreshOnFocus, type BookingTab } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { colors, shadows } from "@/theme";
import { sz } from "@/theme/scale";

const TABS: BookingTab[] = ["upcoming", "completed", "cancelled"];

export default function Bookings() {
  const headerHeight = useHeaderHeight();
  const { status } = useAuth();
  const signedIn = status === "signed-in";
  const [tab, setTab] = useState<BookingTab>("upcoming");
  const bookings = useMyBookings(tab, signedIn);
  useRefreshOnFocus(bookings.refetch, signedIn);

  const body = () => {
    if (!signedIn) {
      return (
        <EmptyState
          icon={CalendarDays}
          title="Your bookings live here"
          body="Sign in to book an artist and follow every step of your day."
          action={
            <Button size="lg" className="mt-6 min-w-44" onPress={askToSignIn}>
              Sign in
            </Button>
          }
        />
      );
    }
    if (bookings.isPending) return <LoadingState />;
    if (bookings.isError) return <ErrorState error={bookings.error} onRetry={() => void bookings.refetch()} />;
    if (!bookings.data.length) {
      return (
        <FadeInView key={tab}>
          <EmptyState icon={CalendarDays} title="Nothing here yet" body={`Your ${tab} bookings will appear here.`} />
        </FadeInView>
      );
    }
    return (
      <FadeInView key={tab} style={{ gap: sz(16) }}>
        {bookings.data.map((booking) => (
          <BookingRow key={booking.id} booking={booking} />
        ))}
      </FadeInView>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: sz(112) }}>
        <GentleIn>
          <View className="mx-5 mt-6 flex-row rounded-full bg-muted p-1">
            {TABS.map((x) => (
              <Button
                key={x}
                variant={tab === x ? "default" : "ghost"}
                className="flex-1 rounded-full px-2"
                textClassName="text-[0.625rem] leading-[0.9375rem]"
                onPress={() => setTab(x)}
              >
                {x.toUpperCase()}
              </Button>
            ))}
          </View>
          <View className="px-5 py-7">{body()}</View>
        </GentleIn>
      </ScrollView>
      <Header title="My bookings" />
    </View>
  );
}

function BookingRow({ booking }: { booking: BookingCard }) {
  const live = booking.status === "confirmed" || booking.status === "in_progress" || booking.status === "completed";
  return (
    <View style={[shadows.sm, { borderRadius: sz(29.6) }]}>
      <PressableScale
        onPress={() => router.push({ pathname: "/tracking", params: { id: booking.id } })}
        accessibilityRole="button"
        accessibilityLabel={`${booking.title} with ${booking.artist.studioName}, ${statusLabel(booking.status).toLowerCase()}`}
        className="overflow-hidden rounded-2xl bg-card"
      >
        <Image
          source={pictureOf(booking.artist.profileImageUrl, booking.artist.id)}
          contentFit="cover"
          contentPosition="top"
          style={{ width: "100%", aspectRatio: 2 }}
        />
        <View className="p-5">
          <View className="flex-row items-center justify-between">
            <View className={cn("rounded-full px-3 py-1", live ? "bg-accent" : "bg-muted")}>
              <Text className={cn("font-bold text-[0.5625rem] leading-[0.8438rem]", live ? "text-accent-foreground" : "text-muted-foreground")}>
                {statusLabel(booking.status)}
              </Text>
            </View>
            <ChevronRight size={sz(24)} color={colors.foreground} />
          </View>
          <Text className="mt-4 font-display text-2xl leading-8">{booking.title}</Text>
          <Text className="mt-1 text-sm leading-5 text-muted-foreground">{booking.artist.studioName}</Text>
          <View className="mt-4 flex-row flex-wrap gap-x-4 gap-y-1">
            <Text className="text-xs leading-4">
              {shortDate(booking.startsAt)} · {clockTime(booking.startsAt)}
            </Text>
            <Text className="text-xs leading-4">{booking.artist.city}</Text>
            <Text className="text-xs leading-4">{rupees(booking.totalPaise)}</Text>
          </View>
        </View>
      </PressableScale>
    </View>
  );
}
