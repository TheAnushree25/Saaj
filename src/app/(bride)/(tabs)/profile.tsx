import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Header, useHeaderHeight } from "@/components/layout/header";
import { GentleIn } from "@/components/ui/motion";
import { Text } from "@/components/ui/text";
import { images } from "@/data/catalogue";
import { colors } from "@/theme";
import { cn } from "@/lib/utils";
import { sz } from "@/theme/scale";

const ROWS: { label: string; href?: Href }[] = [
  { label: "My Details" },
  { label: "Bridal Preferences" },
  { label: "Event Details" },
  { label: "Saved Artists", href: "/saved" },
  { label: "My Bookings", href: "/bookings" },
  { label: "Notifications" },
  { label: "Help & Support" },
];

export default function Profile() {
  const headerHeight = useHeaderHeight();

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: sz(112) }}>
        <GentleIn>
          <View className="items-center px-5 py-7">
          <Image source={images.ananya} contentFit="cover" accessibilityLabel="Ayesha Khan" style={{ width: sz(96), height: sz(96), borderRadius: sz(48) }} />
          <Text className="mt-4 font-display text-3xl leading-9">Ayesha Khan</Text>
          <Text className="text-xs leading-4 tracking-[0.0975rem] text-primary">BRIDE PROFILE</Text>

          <View className="mt-8 w-full overflow-hidden rounded-2xl border border-border bg-card">
            {ROWS.map((row, i) => (
              <Pressable
                key={row.label}
                onPress={row.href ? () => router.navigate(row.href!) : undefined}
                accessibilityRole="button"
                className={cn("flex-row items-center px-4 py-4 active:bg-muted", i < ROWS.length - 1 && "border-b border-border")}
              >
                <Text className="flex-1 text-center text-sm leading-5">{row.label}</Text>
                <ChevronRight size={sz(16)} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
          </View>
        </GentleIn>
      </ScrollView>
      <Header title="Profile" />
    </View>
  );
}
