import { Eye, EyeOff } from "lucide-react-native";
import { useState, type ReactNode, type Ref } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { colors, shadows } from "@/theme";
import { sz } from "@/theme/scale";

type Props = TextInputProps & {
  /** React 19 passes refs as a normal prop; used to jump between fields. */
  ref?: Ref<TextInput>;
  label: string;
  error?: string;
  /** Shown inside the field before the text, e.g. the +91 country code. */
  prefix?: ReactNode;
  /** Shown inside the field after the text, e.g. the show-password eye. */
  suffix?: ReactNode;
};

// A soft berry halo around the focused field.
const focusRing = { boxShadow: "0px 0px 0px 4px rgba(117, 0, 46, 0.10), 0px 8px 24px rgba(64, 3, 20, 0.08)" };

/** A labelled input with focus, error and accessory states. */
export function AuthField({ ref, label, error, prefix, suffix, onFocus, onBlur, ...input }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="mb-4">
      <Text className="mb-2 font-bold text-[0.625rem] leading-[0.9375rem] tracking-[0.1rem] text-muted-foreground">{label}</Text>
      <View
        className={cn(
          "h-14 flex-row items-center rounded-2xl border bg-card px-4",
          error ? "border-[#D9534F]" : focused ? "border-primary" : "border-border",
        )}
        style={focused && !error ? focusRing : shadows.sm}
      >
        {prefix}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.mutedForeground}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          className="h-full flex-1 py-0 font-sans text-base text-foreground"
          style={{ textAlignVertical: "center" }}
          accessibilityLabel={label}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...input}
        />
        {suffix}
      </View>
      {error ? <Text className="mt-1.5 text-xs leading-4 text-[#C0392B]">{error}</Text> : null}
    </View>
  );
}

/** The fixed +91 before the mobile number. */
export function PhonePrefix() {
  return (
    <View className="mr-3 h-7 flex-row items-center border-r border-border pr-3">
      <Text className="font-semibold text-base leading-6">+91</Text>
    </View>
  );
}

/** Show / hide toggle for password fields. */
export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  const Icon = visible ? EyeOff : Eye;
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={visible ? "Hide password" : "Show password"}
      className="ml-2 h-9 w-9 items-center justify-center rounded-full active:bg-muted"
    >
      <Icon size={sz(18)} color={colors.mutedForeground} />
    </Pressable>
  );
}
