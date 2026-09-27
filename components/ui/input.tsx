import { TextInput, type TextInputProps } from "react-native";
import { colors, shadows } from "@/lib/theme";
import { cn } from "@/lib/utils";

export function Input({ className, style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.mutedForeground}
      selectionColor={colors.primary}
      cursorColor={colors.primary}
      className={cn("h-9 w-full rounded-md border border-input bg-transparent px-3 py-0 font-sans text-base text-foreground", className)}
      style={[shadows.sm, { textAlignVertical: "center" }, style]}
      {...props}
    />
  );
}

export function Textarea({ className, style, ...props }: TextInputProps) {
  return (
    <TextInput
      multiline
      placeholderTextColor={colors.mutedForeground}
      selectionColor={colors.primary}
      cursorColor={colors.primary}
      className={cn("min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 font-sans text-base text-foreground", className)}
      style={[shadows.sm, { textAlignVertical: "top" }, style]}
      {...props}
    />
  );
}
