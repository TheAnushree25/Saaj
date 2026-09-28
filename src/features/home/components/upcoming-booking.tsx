import { ArrowRight, CalendarDays, Clock3 } from "lucide-react-native";
import { View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Text } from "@/components/ui/text";
import type { BookingCard } from "@/lib/api-types";
import { clockTime, longDate, rupees } from "@/lib/format";
import { colors, ivory, shadows } from "@/theme";
import { sz } from "@/theme/scale";
import { statusLabel } from "@/features/booking/status";

type Props = { booking: BookingCard | null; onPlan: () => void; onTrack: (id: string) => void };

export function UpcomingBooking({ booking, onPlan, onTrack }: Props) {
  if (!booking) {
    return (
      <View className="px-5 pb-6">
        <PressableScale
          onPress={onPlan}
          accessibilityRole="button"
          className="flex-row items-center justify-between rounded-[1.625rem] border border-glass-border bg-glass p-5"
          style={shadows.glass}
        >
          <View>
            <Eyebrow>NO UPCOMING BOOKING</Eyebrow>
            <Text className="mt-1 font-display text-xl leading-7">Plan your first look</Text>
          </View>
          <ArrowRight size={sz(24)} color={colors.primary} />
        </PressableScale>
      </View>
    );
  }

  return (
    <View className="px-5 pb-6">
      <View className="rounded-[1.75rem]" style={shadows.luxury}>
        <View className="overflow-hidden rounded-[1.75rem] bg-primary p-5">
          {/* The soft rose glow in the top-right corner (a blurred circle on the web). */}
          <View className="absolute -right-24 -top-24" style={{ pointerEvents: "none" }}>
            <Svg width={sz(288)} height={sz(288)}>
              <Defs>
                <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor={colors.rose} stopOpacity={0.4} />
                  <Stop offset="0.45" stopColor={colors.rose} stopOpacity={0.3} />
                  <Stop offset="1" stopColor={colors.rose} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={sz(144)} cy={sz(144)} r={sz(144)} fill="url(#glow)" />
            </Svg>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="font-bold text-[0.625rem] leading-[0.9375rem] tracking-[0.125rem] text-primary-foreground/80">UPCOMING BOOKING</Text>
            <View className="rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1">
              <Text className="font-bold text-[0.625rem] leading-[0.9375rem] text-primary-foreground">{statusLabel(booking.status)}</Text>
            </View>
          </View>
          <Text className="mt-3 font-display text-3xl leading-[2.3438rem] text-primary-foreground">{booking.title}</Text>
          <Text className="mt-1 text-sm leading-5 text-primary-foreground/80">with {booking.artist.studioName}</Text>

          <View className="mt-4 flex-row gap-2">
            {[
              { icon: CalendarDays, value: longDate(booking.startsAt) },
              { icon: Clock3, value: clockTime(booking.startsAt) },
            ].map(({ icon: Icon, value }) => (
              <View key={value} className="flex-1 rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-3">
                <Icon size={sz(16)} color={ivory(0.8)} />
                <Text className="mt-1 font-bold text-sm leading-5 text-primary-foreground">{value}</Text>
              </View>
            ))}
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <Text className="font-display text-xl leading-7 text-primary-foreground">{rupees(booking.totalPaise)}</Text>
            <Button variant="glass" size="sm" iconRight={ArrowRight} onPress={() => onTrack(booking.id)}>
              {booking.status === "pending_payment" ? "Pay now" : "Track"}
            </Button>
          </View>
        </View>
      </View>
    </View>
  );
}
