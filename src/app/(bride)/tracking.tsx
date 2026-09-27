import { router } from "expo-router";
import { CalendarDays, Check, Clock3, MapPin, UserRound, type LucideIcon } from "lucide-react-native";
import { ScrollView, View } from "react-native";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Header, useHeaderHeight } from "@/components/layout/header";
import { GentleIn } from "@/components/ui/motion";
import { Text } from "@/components/ui/text";
import { colors, shadows } from "@/theme";
import { cn } from "@/lib/utils";
import { sz } from "@/theme/scale";

const STEPS = [
  { n: "Booking confirmed", done: true },
  { n: "Artist assigned", done: true },
  { n: "Upcoming appointment", done: false },
  { n: "Service in progress", done: false },
  { n: "Completed", done: false },
];

const DETAILS: [LucideIcon, string][] = [
  [UserRound, "Rhea Kapoor"],
  [CalendarDays, "12 October 2026"],
  [Clock3, "10:00 AM"],
  [MapPin, "The Oberoi Grand, Kolkata"],
];

/** Booking status timeline. Step 19 of the guide makes this live data. */
export default function Tracking() {
  const headerHeight = useHeaderHeight();

  const back = () => {
    router.dismissAll();
    router.navigate("/bookings");
  };

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: sz(40) }}>
        <View className="px-5 py-7">
          <GentleIn>
            <View className="rounded-2xl bg-card p-4" style={shadows.sm}>
            <Text className="font-bold text-[0.625rem] leading-[0.9375rem] tracking-[0.1125rem] text-primary">12 OCTOBER · 10:00 AM</Text>
            <Text className="mt-2 font-display text-3xl leading-9">Bridal Makeup</Text>
            <Text className="mt-1 text-sm leading-5 text-muted-foreground">Rhea Kapoor Beauty · Kolkata</Text>
            </View>
          </GentleIn>

          <View className="mt-9">
            {STEPS.map((s, i) => (
              <GentleIn key={s.n} delay={120 + i * 90} style={{ flexDirection: "row", gap: sz(16) }}>
                <View className="w-7 items-center">
                  <View
                    className={cn(
                      "h-7 w-7 items-center justify-center rounded-full border",
                      s.done ? "border-primary bg-primary" : "border-border bg-background",
                    )}
                  >
                    {s.done ? <Check size={sz(12)} color={colors.primaryForeground} /> : <View className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />}
                  </View>
                  {i < STEPS.length - 1 ? <View className={cn("h-16 w-px", s.done ? "bg-primary" : "bg-border")} /> : null}
                </View>
                <View className="flex-1 pt-1">
                  <Text className="font-bold text-sm uppercase leading-5 tracking-[0.0875rem]">{s.n}</Text>
                  {i === 1 ? <Text className="mt-1 text-xs leading-4 text-muted-foreground">Rhea Kapoor has been assigned</Text> : null}
                </View>
              </GentleIn>
            ))}
          </View>

          <GentleIn delay={600}>
          <View className="mt-7 rounded-2xl bg-nude p-5">
            <Text className="font-display text-xl leading-7">Appointment details</Text>
            <View className="mt-4 gap-3">
              {DETAILS.map(([Icon, value]) => (
                <View key={value} className="flex-row items-center">
                  <Icon size={sz(16)} color={colors.foreground} />
                  <Text className="ml-2 text-sm leading-5">{value}</Text>
                </View>
              ))}
            </View>
          </View>
          </GentleIn>
        </View>
      </ScrollView>
      <Header title="Booking status" onBack={back} />
    </View>
  );
}
