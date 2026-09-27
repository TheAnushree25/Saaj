import Tabs from "expo-router/js-tabs";
import { View } from "react-native";
import { FloatingTabBar } from "@/components/layout/floating-tab-bar";
import { colors } from "@/theme";

export default function TabsLayout() {
  return (
    <View className="flex-1 bg-background">
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
          animation: "fade",
          sceneStyle: { backgroundColor: colors.background },
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="bookings" />
        <Tabs.Screen name="saved" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <FloatingTabBar />
    </View>
  );
}
