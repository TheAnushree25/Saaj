import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowLeft, Bell } from "lucide-react-native";
import { IconButton } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Logo } from "@/components/brand/logo";

/** Height of the bar below the status bar: 12 + 44 + 12 padding/button, 1 border. */
export const HEADER_BAR = 69;

export function useHeaderHeight() {
  return useSafeAreaInsets().top + HEADER_BAR;
}

/**
 * The translucent top bar. It floats over the screen (position absolute) so the
 * content scrolls underneath it, like the web version's sticky header; give the
 * scroll content `paddingTop: useHeaderHeight()`.
 */
export function Header({ title, onBack, action }: { title?: string; onBack?: () => void; action?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top }} className="absolute inset-x-0 top-0 z-40 border-b border-border/60 bg-background/85">
      <View className="h-[68px] flex-row items-center justify-between px-4">
        <View className="h-11 min-w-[44px] justify-center">
          {onBack ? <IconButton label="Go back" icon={ArrowLeft} onPress={onBack} /> : <Logo />}
        </View>
        {title ? (
          <View className="absolute inset-y-0 left-[68px] right-[68px] justify-center" style={{ pointerEvents: "none" }}>
            <Text numberOfLines={1} className="text-center font-display text-xl leading-7">
              {title}
            </Text>
          </View>
        ) : null}
        <View className="h-11 min-w-[44px] items-end justify-center">
          {action ?? <IconButton label="Notifications" icon={Bell} />}
        </View>
      </View>
    </View>
  );
}
