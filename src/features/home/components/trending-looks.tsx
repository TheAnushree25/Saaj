import { useState } from "react";
import { FlatList, View } from "react-native";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Text } from "@/components/ui/text";
import { artists, type Artist } from "@/data/catalogue";
import { useScreen } from "@/hooks/use-screen";
import { hapticImpact } from "@/lib/haptics";
import { useSaj } from "@/store/saj-store";
import { PortfolioCard } from "./portfolio-card";

/** "Trending bridal looks": a centre-snapping carousel of portfolio cards. */
export function TrendingLooks({ onOpen }: { onOpen: (artist: Artist) => void }) {
  const { width } = useScreen();
  const { saved, toggleSave } = useSaj();
  const [current, setCurrent] = useState(1);

  const cardW = Math.min(width * 0.82, 340);
  const gap = 16;
  const pad = 20;
  // Snap each card to the centre of the screen (snap-center on the web).
  const maxScroll = pad * 2 + artists.length * cardW + (artists.length - 1) * gap - width;
  const snaps = artists.map((_, i) => Math.min(maxScroll, Math.max(0, pad + i * (cardW + gap) + cardW / 2 - width / 2)));

  return (
    <View className="pt-4">
      <View className="mb-4 flex-row items-end justify-between px-5">
        <View>
          <Eyebrow>CURATED FOR YOU</Eyebrow>
          <Text className="mt-1 font-display text-2xl leading-8">Trending bridal looks</Text>
        </View>
        <Text className="text-xs leading-4 text-muted-foreground">{current} / 8</Text>
      </View>
      <FlatList
        horizontal
        data={artists}
        keyExtractor={(a) => String(a.id)}
        showsHorizontalScrollIndicator={false}
        snapToOffsets={snaps}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: 28, gap }}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const next = Math.min(8, Math.max(1, Math.round(e.nativeEvent.contentOffset.x / (width * 0.82)) + 1));
          if (next !== current) setCurrent(next);
        }}
        renderItem={({ item }) => (
          <PortfolioCard
            artist={item}
            width={cardW}
            saved={saved.includes(item.id)}
            onOpen={() => onOpen(item)}
            onSave={() => {
              hapticImpact();
              toggleSave(item.id);
            }}
          />
        )}
      />
    </View>
  );
}
