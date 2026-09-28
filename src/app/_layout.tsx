// Must run first: sets 1rem for this phone's width before anything is styled.
import "@/lib/setup-scale";
import "../../global.css";
// Per-weight imports, so only the six font files the design uses get bundled.
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display/400Regular";
import { DMSerifDisplay_400Regular_Italic } from "@expo-google-fonts/dm-serif-display/400Regular_Italic";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_500Medium } from "@expo-google-fonts/manrope/500Medium";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_700Bold } from "@expo-google-fonts/manrope/700Bold";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PhoneFrame } from "@/components/layout/phone-frame";
import { AuthProvider, useAuth } from "@/features/auth/auth-provider";
import { SajProvider, useSaj } from "@/store/saj-store";
import { colors } from "@/theme";

// Keep the berry splash screen up until fonts and saved state are ready,
// so the first frame the bride sees is already the finished design.
SplashScreen.preventAutoHideAsync().catch(() => {});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SajProvider>
            <PhoneFrame>
              <AppStack ready={fontsLoaded || fontError != null} />
            </PhoneFrame>
          </SajProvider>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function AppStack({ ready }: { ready: boolean }) {
  const { hydrated } = useSaj();
  const { status } = useAuth();
  // Keep the splash up until we know whether someone is signed in: no flash of the wrong screen.
  const show = ready && hydrated && status !== "loading";

  useEffect(() => {
    if (show) SplashScreen.hideAsync().catch(() => {});
  }, [show]);

  if (!show) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
