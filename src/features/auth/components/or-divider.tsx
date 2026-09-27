import { View } from "react-native";
import { Text } from "@/components/ui/text";

export function OrDivider() {
  return (
    <View className="my-5 flex-row items-center gap-3">
      <View className="h-px flex-1 bg-border" />
      <Text className="text-xs leading-4 tracking-[0.0938rem] text-muted-foreground">OR</Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}
