import { useState } from "react";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FocusStatusBar } from "@/components/layout/focus-status-bar";
import { Text } from "@/components/ui/text";
import { artists } from "@/data/catalogue";
import { Reel } from "@/features/explore/components/reel";
import { useSaj } from "@/store/saj-store";

/** Full-screen vertical "Reels" of each artist's work. */
export default function Explore() {
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [liked, setLiked] = useState<number[]>([]);
  const { saved, toggleSave } = useSaj();

  return (
    <View
      className="flex-1 bg-berry-deep"
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
    >
      <FocusStatusBar style="light" />
      {size.height > 0 ? (
        <FlatList
          data={artists}
          keyExtractor={(a) => String(a.id)}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          getItemLayout={(_, i) => ({ length: size.height, offset: size.height * i, index: i })}
          initialNumToRender={2}
          windowSize={3}
          renderItem={({ item, index }) => (
            <Reel
              artist={item}
              index={index}
              width={size.width}
              height={size.height}
              topInset={insets.top}
              liked={liked.includes(item.id)}
              saved={saved.includes(item.id)}
              onLike={() => setLiked((o) => (o.includes(item.id) ? o.filter((x) => x !== item.id) : [...o, item.id]))}
              onSave={() => toggleSave(item.id)}
            />
          )}
        />
      ) : null}

      <View className="absolute inset-x-0 top-0 flex-row items-center justify-between px-5" style={{ paddingTop: insets.top + 24, pointerEvents: "none" }}>
        <Text className="font-display text-2xl leading-8 text-primary-foreground">Reels</Text>
        <View className="rounded-full border border-primary-foreground/25 bg-primary-foreground/15 px-3 py-1.5">
          <Text className="font-bold text-[10px] leading-[15px] tracking-[1.8px] text-primary-foreground">BRIDAL EDIT</Text>
        </View>
      </View>
    </View>
  );
}
