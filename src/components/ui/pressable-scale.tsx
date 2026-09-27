import { Pressable, type PressableProps } from "react-native";
import { cn } from "@/lib/utils";

/**
 * A tappable area that dims slightly under the finger. It is a plain
 * Pressable, so NativeWind's `active:` styles handle the feedback natively.
 */
export function PressableScale({ className, ...rest }: PressableProps) {
  return <Pressable className={cn("active:opacity-90", className)} {...rest} />;
}
