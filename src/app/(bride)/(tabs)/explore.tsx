import { useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { Text } from "@/components/ui/text";
import { Reel } from "@/features/explore/components/reel";
import { useSaved } from "@/features/saved/use-saved";
import { useLooks } from "@/lib/queries";
import { sz } from "@/theme/scale";

/** Full-screen vertical "Reels" of each artist's work. */
export default function Explore() {
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [liked, setLiked] = useState<string[]>([]);
  const saved = useSaved();
  const looks = useLooks();
  const items = looks.data ?? [];

  return (
    <View
      className="flex-1 bg-berry-deep"
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      <FocusStatusBar style="light" />
      {looks.isPending ? (
        <LoadingState dark className="flex-1" />
      ) : looks.isError ? (
        <View className="flex-1 justify-center bg-background">
          <ErrorState error={looks.error} onRetry={() => void looks.refetch()} />
        </View>
      ) : size.height > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(look) => look.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          getItemLayout={(_, i) => ({ length: size.height, offset: size.height * i, index: i })}
          initialNumToRender={2}
          windowSize={3}
          renderItem={({ item, index }) => (
            <Reel
              look={item}
              index={index}
              total={items.length}
              width={size.width}
              height={size.height}
              topInset={insets.top}
              liked={liked.includes(item.id)}
              saved={saved.isSaved(item.artist.id)}
              onLike={() => setLiked((o) => (o.includes(item.id) ? o.filter((x) => x !== item.id) : [...o, item.id]))}
              onSave={() => saved.toggle(item.artist)}
            />
          )}
        />
      ) : null}

      <View className="absolute inset-x-0 top-0 flex-row items-center justify-between px-5" style={{ paddingTop: insets.top + sz(24), pointerEvents: "none" }}>
        <Text className="font-display text-2xl leading-8 text-primary-foreground">Reels</Text>
        <View className="rounded-full border border-primary-foreground/25 bg-primary-foreground/15 px-3 py-1.5">
          <Text className="font-bold text-[0.625rem] leading-[0.9375rem] tracking-[0.1125rem] text-primary-foreground">BRIDAL EDIT</Text>
        </View>
      </View>
    </View>
  );
}
