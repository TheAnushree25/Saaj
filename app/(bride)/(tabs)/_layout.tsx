import { BlurTargetView } from "expo-blur";
import Tabs from "expo-router/js-tabs";
import { useRef } from "react";
import { View } from "react-native";
import { FloatingTabBar } from "@/components/floating-tab-bar";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  // Everything inside the BlurTargetView can be blurred by the glass tab bar.
  const blurTarget = useRef<View>(null);

  return (
    <View className="flex-1 bg-background">
      <BlurTargetView ref={blurTarget} style={{ flex: 1 }}>
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
      </BlurTargetView>
      <FloatingTabBar target={blurTarget} />
    </View>
  );
}
