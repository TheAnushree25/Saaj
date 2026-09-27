import { View } from "react-native";
import { cn } from "@/lib/utils";
import { Text } from "./ui/text";

export function Logo({ light = false }: { light?: boolean }) {
  const color = light ? "text-primary-foreground" : "text-primary";
  return (
    <View className="flex-row items-start" accessibilityRole="header" accessibilityLabel="SAJ Bridal">
      <Text className={cn("font-display text-[30px] leading-[30px]", color)}>SAJ</Text>
      <Text className={cn("ml-1 font-sans text-[8px] leading-[10px] tracking-[1.92px]", color)}>BRIDAL</Text>
    </View>
  );
}
