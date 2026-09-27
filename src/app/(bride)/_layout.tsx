import { Stack } from "expo-router";
import { colors } from "@/theme";

// Step 14 of the build guide adds the "bride only" guard here. For now it is
// the stack that the portfolio, service and booking screens slide onto.
export default function BrideLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade_from_bottom",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="confirmation" options={{ animation: "fade", gestureEnabled: false }} />
    </Stack>
  );
}
