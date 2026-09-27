import { Image } from "expo-image";
import { router } from "expo-router";
import { CalendarDays, ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Header, useHeaderHeight } from "@/components/layout/header";
import { FadeInView, GentleIn } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Text } from "@/components/ui/text";
import { images } from "@/data/catalogue";
import { colors, shadows } from "@/theme";
import { sz } from "@/theme/scale";

const TABS = ["UPCOMING", "COMPLETED", "CANCELLED"] as const;
type Tab = (typeof TABS)[number];

export default function Bookings() {
  const headerHeight = useHeaderHeight();
  const [tab, setTab] = useState<Tab>("UPCOMING");

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
                {x}
              </Button>
            ))}
          </View>

          <View className="px-5 py-7">
            {tab === "UPCOMING" ? (
              <FadeInView key="upcoming" style={[shadows.sm, { borderRadius: sz(29.6) }]}>
                <PressableScale
                  onPress={() => router.push("/tracking")}
                  accessibilityRole="button"
                  accessibilityLabel="Bridal Makeup with Rhea Kapoor Beauty, confirmed"
                  className="overflow-hidden rounded-2xl bg-card"
                >
                  <Image source={images.rhea} contentFit="cover" contentPosition="top" style={{ width: "100%", aspectRatio: 2 }} />
                  <View className="p-5">
                    <View className="flex-row items-center justify-between">
                      <View className="rounded-full bg-accent px-3 py-1">
                        <Text className="font-bold text-[0.5625rem] leading-[0.8438rem] text-accent-foreground">CONFIRMED</Text>
                      </View>
                      <ChevronRight size={sz(24)} color={colors.foreground} />
                    </View>
                    <Text className="mt-4 font-display text-2xl leading-8">Bridal Makeup</Text>
                    <Text className="mt-1 text-sm leading-5 text-muted-foreground">Rhea Kapoor Beauty</Text>
                    <View className="mt-4 flex-row gap-4">
                      <Text className="text-xs leading-4">12 Oct · 10:00 AM</Text>
                      <Text className="text-xs leading-4">Kolkata</Text>
                    </View>
                  </View>
                </PressableScale>
              </FadeInView>
            ) : (
              <FadeInView key={tab}>
                <View className="items-center py-24">
                  <CalendarDays size={sz(32)} color={colors.mutedForeground} />
                  <Text className="mt-4 font-display text-2xl leading-8">Nothing here yet</Text>
                  <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">
                    Your {tab.toLowerCase()} bookings will appear here.
                  </Text>
                </View>
              </FadeInView>
            )}
          </View>
        </GentleIn>
      </ScrollView>
      <Header title="My bookings" />
    </View>
  );
}
