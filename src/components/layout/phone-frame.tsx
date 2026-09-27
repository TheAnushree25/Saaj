import type { ReactNode } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import { SafeAreaFrameContext, SafeAreaInsetsContext, SafeAreaProvider } from "react-native-safe-area-context";
import { ScreenProvider } from "@/hooks/use-screen";
import { Text } from "@/components/ui/text";

const PHONE = { width: 390, height: 844 };

// A fake status bar and home-indicator area, so screens lay out exactly as they
// do on a real phone with a notch and gesture bar.
const INSETS = { top: 24, bottom: 16, left: 0, right: 0 };

/**
 * On a phone this renders its children untouched. In a laptop browser it draws
 * the app inside a 390 × 844 phone, so `npx expo start --web` gives a true
 * phone-sized preview without any browser dev tools.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const window = useWindowDimensions();

  if (Platform.OS !== "web" || window.width < 520) {
    return <SafeAreaProvider>{children}</SafeAreaProvider>;
  }

  const height = Math.min(PHONE.height, window.height - 72);
  return (
    <View className="flex-1 items-center justify-center bg-[#EAE0D9]">
      <View
        className="overflow-hidden rounded-[48px] border-[10px] border-[#1B1215] bg-background"
        style={{ width: PHONE.width + 20, height: height + 20, boxShadow: "0px 40px 90px rgba(64, 3, 20, 0.28)" }}
      >
        <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, width: PHONE.width, height }}>
          <SafeAreaInsetsContext.Provider value={INSETS}>
            <ScreenProvider value={{ width: PHONE.width, height }}>{children}</ScreenProvider>
          </SafeAreaInsetsContext.Provider>
        </SafeAreaFrameContext.Provider>
      </View>
      <Text className="mt-4 text-xs leading-4 tracking-[1.5px] text-muted-foreground">SAJ · PHONE PREVIEW · 390 × 844</Text>
    </View>
  );
}
