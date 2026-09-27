import { router, usePathname, type Href } from "expo-router";
import { CalendarDays, Compass, Heart, House, UserRound, type LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { hapticTap } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { colors, shadows } from "@/theme";
import { GlassSurface } from "./glass-surface";

const TABS: { label: string; href: Href; path: string; icon: LucideIcon }[] = [
  { label: "Home", href: "/home", path: "/home", icon: House },
  { label: "Explore", href: "/explore", path: "/explore", icon: Compass },
  { label: "Bookings", href: "/bookings", path: "/bookings", icon: CalendarDays },
  { label: "Saved", href: "/saved", path: "/saved", icon: Heart },
  { label: "Profile", href: "/profile", path: "/profile", icon: UserRound },
];

/**
 * The floating glass navigation bar, as on the web design: 12px in from each
 * edge, 8px up from the bottom, at most 440px wide. The active tab turns berry;
 * Saved also fills its heart.
 */
export function FloatingTabBar() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const active = Math.max(0, TABS.findIndex((t) => pathname.startsWith(t.path)));

  return (
    <View className="absolute inset-x-3 bottom-2 items-center" style={{ pointerEvents: "box-none" }}>
      <View className="w-full max-w-[440px] rounded-[22px]" style={shadows.glass}>
        <GlassSurface
          className="flex-row items-center justify-around rounded-[22px] border border-glass-border px-1 pt-2"
          style={{ paddingBottom: Math.max(16, insets.bottom) }}
        >
          {TABS.map((tab, i) => {
            const selected = i === active;
            const Icon = tab.icon;
            const tint = selected ? colors.primary : colors.mutedForeground;
            return (
              <Pressable
                key={tab.label}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected }}
                onPress={() => {
                  if (selected) return;
                  hapticTap();
                  router.navigate(tab.href);
                }}
                className="h-12 min-w-14 items-center justify-center gap-0.5 rounded-xl px-2 active:opacity-70"
              >
                <Icon size={20} color={tint} fill={selected && tab.label === "Saved" ? tint : "none"} />
                <Text className={cn("font-medium text-[9px] leading-[13px]", selected ? "text-primary" : "text-muted-foreground")}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </GlassSurface>
      </View>
    </View>
  );
}
