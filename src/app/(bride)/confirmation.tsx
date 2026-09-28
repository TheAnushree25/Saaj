import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Check } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Petals } from "@/components/media/petals";
import { Button } from "@/components/ui/button";
import { GentleIn, PopIn } from "@/components/ui/motion";
import { LoadingState, messageOf } from "@/components/ui/states";
import { Text } from "@/components/ui/text";
import { statusLabel } from "@/features/booking/status";
import { clockTime, longDate, rupees } from "@/lib/format";
import { useBooking } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { colors } from "@/theme";
import { sz } from "@/theme/scale";

/** "Your moment is booked." */
export default function Confirmation() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { data: booking, isPending, error } = useBooking(id);
  if (!id) return <Redirect href="/home" />;

  const home = () => {
    router.dismissAll();
    router.navigate("/home");
  };

  const rows: [string, string][] = booking
    ? [
        ["Service", booking.title],
        ["Includes", booking.items.map((item) => item.name).join(", ")],
        ["Total", rupees(booking.totalPaise)],
        ["Paid now", rupees(booking.paidPaise)],
        ["Date & time", `${longDate(booking.startsAt)} · ${clockTime(booking.startsAt)}`],
        ["Status", statusLabel(booking.status)],
        ["Artist", booking.artist?.studioName ?? ""],
        ["Venue", booking.venue],
      ]
    : [];

  return (
    <View className="flex-1 overflow-hidden bg-primary">
      <FocusStatusBar style="light" />
      <Petals />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="grow items-center justify-center px-6"
        contentContainerStyle={{ paddingTop: insets.top + sz(32), paddingBottom: insets.bottom + sz(32) }}
      >
        <View className="w-full max-w-sm items-center">
          <PopIn>
            <View className="h-20 w-20 items-center justify-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10">
              <Check size={sz(36)} color={colors.primaryForeground} />
            </View>
          </PopIn>

          <GentleIn delay={150} style={{ width: "100%", alignItems: "center" }}>
            <Text className="mt-7 text-center font-display text-4xl leading-10 text-primary-foreground">Your moment is booked.</Text>
            {booking ? (
              <Text className="mt-3 text-xs leading-4 tracking-[0.12rem] text-primary-foreground/70">BOOKING ID · {booking.ref}</Text>
            ) : null}

            {isPending ? (
              <LoadingState dark className="py-16" />
            ) : !booking ? (
              <Text className="mt-8 text-center text-sm leading-5 text-primary-foreground/80">{messageOf(error)}</Text>
            ) : (
              <View className="mt-8 w-full rounded-3xl border border-primary-foreground/15 bg-primary-foreground/10 p-5">
                {rows.map(([label, value], i) => (
                  <View key={label} className={cn("flex-row py-3", i < rows.length - 1 && "border-b border-primary-foreground/10")}>
                    <Text className="w-[5.9375rem] text-xs leading-4 text-primary-foreground/60">{label}</Text>
                    <Text className="flex-1 text-right font-bold text-sm leading-5 text-primary-foreground">{value}</Text>
                  </View>
                ))}
              </View>
            )}

            <Button
              variant="glass"
              size="lg"
              className="mt-6 w-full"
              onPress={() => router.replace({ pathname: "/tracking", params: { id, from: "confirmation" } })}
            >
              View booking
            </Button>
            <Button variant="ghost" className="mt-2" textClassName="text-primary-foreground" onPress={home}>
              Back to home
            </Button>
            <Text className="mt-10 text-center font-display text-xl leading-7 text-primary-foreground/80">
              {"Take a breath.\nOne more thing checked off."}
            </Text>
          </GentleIn>
        </View>
      </ScrollView>
    </View>
  );
}
