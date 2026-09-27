import { View } from "react-native";
import { cn } from "@/lib/utils";
import { Text } from "@/components/ui/text";

export function Logo({ light = false }: { light?: boolean }) {
  const color = light ? "text-primary-foreground" : "text-primary";
  return (
    <View className="flex-row items-start" accessibilityRole="header" accessibilityLabel="SAJ Bridal">
      <Text className={cn("font-display text-[1.875rem] leading-[1.875rem]", color)}>SAJ</Text>
      <Text className={cn("ml-1 font-sans text-[0.5rem] leading-[0.625rem] tracking-[0.12rem]", color)}>BRIDAL</Text>
    </View>
  );
}
