import { useState } from "react";
import { FlatList, View } from "react-native";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { Text } from "@/components/ui/text";
import { useSaved } from "@/features/saved/use-saved";
import { useScreen } from "@/hooks/use-screen";
import type { ArtistCard } from "@/lib/api-types";
import { useArtists } from "@/lib/queries";
import { sz } from "@/theme/scale";
import { PortfolioCard } from "./portfolio-card";

/** "Trending bridal looks": a centre-snapping carousel of the top artists. */
export function TrendingLooks({ onOpen }: { onOpen: (artist: ArtistCard) => void }) {
  const { width } = useScreen();
  const saved = useSaved();
  const { data, isPending, isError, error, refetch } = useArtists({ sort: "recommended", pageSize: 8 });
  const artists = data?.items ?? [];
  const [current, setCurrent] = useState(1);

  const cardW = Math.min(width * 0.82, sz(340));
  const gap = sz(16);
  const pad = sz(20);
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
        {artists.length ? (
          <Text className="text-xs leading-4 text-muted-foreground">
            {current} / {artists.length}
          </Text>
        ) : null}
      </View>
      {isPending ? (
        <LoadingState className="py-0" />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} className="py-8" />
      ) : (
        <FlatList
          horizontal
          data={artists}
          keyExtractor={(a) => a.id}
          showsHorizontalScrollIndicator={false}
          snapToOffsets={snaps}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: pad, paddingBottom: sz(28), gap }}
          scrollEventThrottle={32}
          onScroll={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / (cardW + gap)) + 1;
            const next = Math.min(artists.length, Math.max(1, index));
            if (next !== current) setCurrent(next);
          }}
          renderItem={({ item }) => (
            <PortfolioCard
              artist={item}
              width={cardW}
              saved={saved.isSaved(item.id)}
              onOpen={() => onOpen(item)}
              onSave={() => saved.toggle(item)}
            />
          )}
        />
      )}
    </View>
  );
}
