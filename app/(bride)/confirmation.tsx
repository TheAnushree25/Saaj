import { Redirect, router } from "expo-router";
import { Check } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FocusStatusBar } from "@/components/focus-status-bar";
import { GentleIn, PopIn } from "@/components/motion";
import { Petals } from "@/components/petals";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { inr } from "@/lib/format";
import { useSaj } from "@/lib/store";
import { colors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** "Your moment is booked." */
export default function Confirmation() {
  const { booking } = useSaj();
  const insets = useSafeAreaInsets();
  if (!booking) return <Redirect href="/home" />;

  const rows: [string, string][] = [
    ["Service", booking.selection.label],
    ["Includes", booking.selection.items.join(", ")],
    ["Total", inr(booking.selection.total)],
    ["Date & time", `${booking.date} · ${booking.time}`],
    ["Status", "CONFIRMED"],
    ["Artist", booking.artist],
    ["Location", booking.location],
  ];

  const home = () => {
    router.dismissAll();
    router.navigate("/home");
  };

  return (
    <View className="flex-1 overflow-hidden bg-primary">
      <FocusStatusBar style="light" />
      <Petals />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="grow items-center justify-center px-6"
        contentContainerStyle={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }}
      >
        <View className="w-full max-w-sm items-center">
          <PopIn className="h-20 w-20 items-center justify-center rounded-full border border-primary-foreground/30 bg-primary-foreground/10">
            <Check size={36} color={colors.primaryForeground} />
          </PopIn>

          <GentleIn delay={150} className="w-full items-center">
            <Text className="mt-7 text-center font-display text-4xl leading-10 text-primary-foreground">Your moment is booked.</Text>
            <Text className="mt-3 text-xs leading-4 tracking-[1.92px] text-primary-foreground/70">BOOKING ID · SS-120426</Text>

            <View className="mt-8 w-full rounded-3xl border border-primary-foreground/15 bg-primary-foreground/10 p-5">
              {rows.map(([label, value], i) => (
                <View key={label} className={cn("flex-row py-3", i < rows.length - 1 && "border-b border-primary-foreground/10")}>
                  <Text className="w-[95px] text-xs leading-4 text-primary-foreground/60">{label}</Text>
                  <Text className="flex-1 text-right font-bold text-sm leading-5 text-primary-foreground">{value}</Text>
                </View>
              ))}
            </View>

            <Button variant="glass" size="lg" className="mt-6 w-full" onPress={() => router.replace({ pathname: "/tracking", params: { from: "confirmation" } })}>
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
