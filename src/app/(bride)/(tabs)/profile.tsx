import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Header, useHeaderHeight } from "@/components/layout/header";
import { GentleIn } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/features/auth/auth-provider";
import { images, pictureOf } from "@/data/catalogue";
import { askToSignIn } from "@/features/saved/use-saved";
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
  const { user, signOut } = useAuth();
  const name = user?.fullName ?? "Guest";

  return (
    <View className="flex-1 bg-background">
      <FocusStatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: sz(112) }}>
        <GentleIn>
          <View className="items-center px-5 py-7">
          <Image source={user?.avatarUrl ? pictureOf(user.avatarUrl, user.id) : images.ananya} contentFit="cover" accessibilityLabel={name} style={{ width: sz(96), height: sz(96), borderRadius: sz(48) }} />
          <Text className="mt-4 font-display text-3xl leading-9">{name}</Text>
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

          <Button
            variant="outline"
            size="lg"
            className="mt-6 w-full"
            onPress={() => (user ? void signOut() : askToSignIn())}
          >
            {user ? "Sign out" : "Sign in"}
          </Button>
          </View>
        </GentleIn>
      </ScrollView>
      <Header title="Profile" />
    </View>
  );
}
