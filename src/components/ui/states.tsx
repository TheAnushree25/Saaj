import { CloudOff, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { colors } from "@/theme";
import { sz } from "@/theme/scale";

/** The sentence to show for any error: the API's own message, or a calm default. */
export function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : "Something went wrong. Please try again.";
}

type LoadingProps = { className?: string; style?: StyleProp<ViewStyle>; dark?: boolean };

/** A quiet spinner while a screen's data loads. */
export function LoadingState({ className, style, dark = false }: LoadingProps) {
  return (
    <View className={cn("items-center justify-center py-24", className)} style={style}>
      <ActivityIndicator color={dark ? colors.primaryForeground : colors.primary} />
    </View>
  );
}

/** "Can't reach Saaj right now" with a way to try again. */
export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <EmptyState
      icon={CloudOff}
      title="That didn’t load"
      body={messageOf(error)}
      className={className}
      action={
        onRetry ? (
          <Button variant="outline" className="mt-5 rounded-full px-6" onPress={onRetry}>
            Try again
          </Button>
        ) : null
      }
    />
  );
}

type EmptyProps = { icon: LucideIcon; title: string; body: string; action?: ReactNode; className?: string };

/** An icon, a line in the display face and a hint: the app's "nothing here" look. */
export function EmptyState({ icon: Icon, title, body, action, className }: EmptyProps) {
  return (
    <View className={cn("items-center px-6 py-24", className)}>
      <Icon size={sz(32)} color={colors.mutedForeground} />
      <Text className="mt-4 text-center font-display text-2xl leading-8">{title}</Text>
      <Text className="mt-2 text-center text-sm leading-5 text-muted-foreground">{body}</Text>
      {action}
    </View>
  );
}
