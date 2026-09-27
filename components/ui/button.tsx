import { createContext, useContext, type ReactNode } from "react";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { AnimatedPressable } from "@/lib/interop";
import { colors, shadows } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Text } from "./text";

// A React Native port of the web design's button (shadcn's variants plus the
// SAJ "luxury" and "glass" styles). Same variant and size names as the web code.

export type ButtonVariant = "default" | "luxury" | "glass" | "outline" | "ghost" | "link" | "ivory";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

const variants: Record<ButtonVariant, { box: string; text: string; fg: string; shadow?: ViewStyle }> = {
  default: { box: "bg-primary", text: "text-primary-foreground", fg: colors.primaryForeground, shadow: shadows.sm },
  luxury: { box: "rounded-full bg-primary", text: "text-primary-foreground", fg: colors.primaryForeground, shadow: shadows.luxury },
  glass: { box: "rounded-full border border-glass bg-glass", text: "text-foreground", fg: colors.foreground, shadow: shadows.glass },
  outline: { box: "border border-input bg-background", text: "text-foreground", fg: colors.foreground, shadow: shadows.sm },
  ghost: { box: "", text: "text-foreground", fg: colors.foreground },
  link: { box: "", text: "text-primary", fg: colors.primary },
  ivory: { box: "bg-primary-foreground", text: "text-primary", fg: colors.primary },
};

const sizes: Record<ButtonSize, { box: string; text: string }> = {
  default: { box: "h-9 px-4", text: "text-sm leading-5" },
  sm: { box: "h-8 rounded-md px-3", text: "text-xs leading-4" },
  lg: { box: "h-12 rounded-full px-7", text: "text-sm leading-5" },
  icon: { box: "h-9 w-9", text: "text-sm leading-5" },
};

/** Lets custom button content pick up the button's text colour. */
const ButtonContext = createContext<{ fg: string }>({ fg: colors.foreground });
export const useButtonColor = () => useContext(ButtonContext).fg;

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  textClassName?: string;
  /** Icon/text colour override, for buttons restyled with textClassName. */
  fg?: string;
  iconLeft?: LucideIcon;
  iconRight?: LucideIcon;
  iconSize?: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressScale?: number;
};

export function Button({
  variant = "default",
  size = "default",
  className,
  textClassName,
  fg,
  iconLeft: IconLeft,
  iconRight: IconRight,
  iconSize = 16,
  children,
  disabled,
  style,
  pressScale = 0.97,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const v = variants[variant];
  const s = sizes[size];
  const color = fg ?? v.fg;

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <ButtonContext.Provider value={{ fg: color }}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPressIn={(e) => {
          scale.set(withTiming(pressScale, { duration: 110 }));
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          scale.set(withSpring(1, { damping: 14, stiffness: 260, mass: 0.6 }));
          onPressOut?.(e);
        }}
        className={cn("flex-row items-center justify-center gap-2 rounded-md", v.box, s.box, disabled && "opacity-50", className)}
        style={[v.shadow, style, pressStyle]}
        {...rest}
      >
        {IconLeft ? <IconLeft size={iconSize} color={color} /> : null}
        {typeof children === "string" || typeof children === "number" ? (
          <Text className={cn("font-medium", s.text, v.text, textClassName)}>{children}</Text>
        ) : (
          children
        )}
        {IconRight ? <IconRight size={iconSize} color={color} /> : null}
      </AnimatedPressable>
    </ButtonContext.Provider>
  );
}

type IconButtonProps = {
  label: string;
  icon: LucideIcon;
  onPress?: () => void;
  active?: boolean;
  /** Fill the icon shape (a solid heart). */
  filled?: boolean;
  className?: string;
};

/** The round 44px glass button used for back, share, save and notifications. */
export function IconButton({ label, icon: Icon, onPress, active = false, filled = false, className }: IconButtonProps) {
  const color = active ? colors.primaryForeground : colors.foreground;
  return (
    <Button
      variant="glass"
      size="icon"
      accessibilityLabel={label}
      onPress={onPress}
      fg={color}
      className={cn("h-11 w-11 shrink-0", active && "bg-primary", className)}
    >
      <Icon size={16} color={color} fill={filled ? color : "none"} />
    </Button>
  );
}
