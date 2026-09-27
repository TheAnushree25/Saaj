import { Text as RNText, type TextProps } from "react-native";
import { cn } from "@/lib/utils";

/**
 * React Native text does not inherit a font or colour from its parent View the
 * way HTML does, so every string in the app goes through this component to get
 * the body font (Manrope) and the ink colour by default.
 */
export function Text({ className, ...props }: TextProps) {
  return <RNText className={cn("font-sans text-base text-foreground", className)} {...props} />;
}
