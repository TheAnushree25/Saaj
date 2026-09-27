import { ArrowRight, CalendarDays, Clock3 } from "lucide-react-native";
import { View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { inr } from "@/lib/format";
import type { Booking } from "@/lib/store";
import { colors, ivory, shadows } from "@/lib/theme";
import { Button } from "./ui/button";
import { Eyebrow } from "./ui/eyebrow";
import { PressableScale } from "./ui/pressable-scale";
import { Text } from "./ui/text";

type Props = { booking: Booking | null; onPlan: () => void; onTrack: () => void };

export function UpcomingBooking({ booking, onPlan, onTrack }: Props) {
  if (!booking) {
    return (
      <View className="px-5 pb-6">
        <PressableScale
          onPress={onPlan}
          accessibilityRole="button"
          className="flex-row items-center justify-between rounded-[26px] border border-glass-border bg-glass p-5"
          style={shadows.glass}
        >
          <View>
            <Eyebrow>NO UPCOMING BOOKING</Eyebrow>
            <Text className="mt-1 font-display text-xl leading-7">Plan your first look</Text>
          </View>
          <ArrowRight size={24} color={colors.primary} />
        </PressableScale>
      </View>
    );
  }

  return (
    <View className="px-5 pb-6">
      <View className="rounded-[28px]" style={shadows.luxury}>
        <View className="overflow-hidden rounded-[28px] bg-primary p-5">
          {/* The soft rose glow in the top-right corner (a blurred circle on the web). */}
          <View className="absolute -right-24 -top-24" style={{ pointerEvents: "none" }}>
            <Svg width={288} height={288}>
              <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={colors.rose} stopOpacity={0.4} />
                  <Stop offset="0.45" stopColor={colors.rose} stopOpacity={0.3} />
                  <Stop offset="1" stopColor={colors.rose} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={144} cy={144} r={144} fill="url(#glow)" />
            </Svg>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-[10px] leading-[15px] tracking-[2px] text-primary-foreground/80">UPCOMING BOOKING</Text>
            <View className="rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1">
              <Text className="font-bold text-[10px] leading-[15px] text-primary-foreground">CONFIRMED</Text>
            </View>
          </View>
          <Text className="mt-3 font-display text-3xl leading-[37.5px] text-primary-foreground">{booking.selection.label}</Text>
          <Text className="mt-1 text-sm leading-5 text-primary-foreground/80">with {booking.artist}</Text>

          <View className="mt-4 flex-row gap-2">
            {[
              { icon: CalendarDays, value: booking.date },
              { icon: Clock3, value: booking.time },
            ].map(({ icon: Icon, value }) => (
              <View key={value} className="flex-1 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-3">
                <Icon size={16} color={ivory(0.8)} />
                <Text className="mt-1 font-bold text-sm leading-5 text-primary-foreground">{value}</Text>
              </View>
            ))}
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="font-display text-xl leading-7 text-primary-foreground">{inr(booking.selection.total)}</Text>
            <Button variant="glass" size="sm" iconRight={ArrowRight} onPress={onTrack}>
              Track
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}
