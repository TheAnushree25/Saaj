import { router, usePathname, type Href } from "expo-router";
import { CalendarDays, Compass, Heart, House, UserRound, type LucideIcon } from "lucide-react-native";
import { useEffect, useState, type RefObject } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { hapticTap } from "@/lib/haptics";
import { colors, shadows } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { BlurSurface } from "./blur-surface";
import { Text } from "./ui/text";

const TABS: { label: string; href: Href; path: string; icon: LucideIcon }[] = [
  { label: "Home", href: "/home", path: "/home", icon: House },
  { label: "Explore", href: "/explore", path: "/explore", icon: Compass },
  { label: "Bookings", href: "/bookings", path: "/bookings", icon: CalendarDays },
  { label: "Saved", href: "/saved", path: "/saved", icon: Heart },
  { label: "Profile", href: "/profile", path: "/profile", icon: UserRound },
];

const spring = { damping: 18, stiffness: 220, mass: 0.7 };

/** The floating glass navigation bar, with a blush pill that glides to the active tab. */
export function FloatingTabBar({ target }: { target: RefObject<View | null> }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const active = Math.max(0, TABS.findIndex((t) => pathname.startsWith(t.path)));

  const [slots, setSlots] = useState<({ x: number; width: number } | undefined)[]>([]);
  const pillX = useSharedValue(0);
  const pillW = useSharedValue(0);
  const pillOpacity = useSharedValue(0);

  useEffect(() => {
    const slot = slots[active];
    if (!slot) return;
    if (pillOpacity.get() === 0) {
      // First placement: appear in place instead of sliding in from the left.
      pillX.set(slot.x);
      pillW.set(slot.width);
      pillOpacity.set(withSpring(1, spring));
    } else {
      pillX.set(withSpring(slot.x, spring));
      pillW.set(withSpring(slot.width, spring));
    }
  }, [active, slots, pillX, pillW, pillOpacity]);

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.get(),
    width: pillW.get(),
    transform: [{ translateX: pillX.get() }],
  }));

  return (
    <View className="absolute inset-x-3 bottom-2 items-center" style={{ pointerEvents: "box-none" }}>
      <View className="w-full max-w-[440px] rounded-[22px]" style={shadows.glass}>
        <BlurSurface
          target={target}
          className="rounded-[22px] border border-glass-border px-1 pt-2"
          style={{ paddingBottom: Math.max(16, insets.bottom) }}
        >
          <View className="flex-row items-center justify-around">
            <Animated.View className="absolute left-0 top-0 h-12 rounded-xl bg-accent" style={[{ pointerEvents: "none" }, pillStyle]} />
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
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    setSlots((old) => {
                      const next = [...old];
                      next[i] = { x, width };
                      return next;
                    });
                  }}
                  onPress={() => {
                    if (selected) return;
                    hapticTap();
                    router.navigate(tab.href);
                  }}
                  className="h-12 min-w-14 items-center justify-center gap-0.5 rounded-xl px-2"
                >
                  <Icon size={20} color={tint} fill={selected && tab.label === "Saved" ? tint : "none"} />
                  <Text className={cn("font-medium text-[9px] leading-[13px]", selected ? "text-primary" : "text-muted-foreground")}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BlurSurface>
      </View>
    </View>
  );
}
