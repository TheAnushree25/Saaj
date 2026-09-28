import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { Frosted, type Gradient } from "@/components/media/frosted";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { listEnter, listExit, listLayout } from "@/components/ui/motion";
import { PressableScale } from "@/components/ui/pressable-scale";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { Text } from "@/components/ui/text";
import { pictureOf } from "@/data/catalogue";
import { useScreen } from "@/hooks/use-screen";
import type { ServiceSummary } from "@/lib/api-types";
import { duration, rupees } from "@/lib/format";
import { useCategories, useServices, type ServiceSort } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { berry, colors, ivory, shadows } from "@/theme";
import { sz } from "@/theme/scale";

const SORTS: [ServiceSort, string][] = [
  ["popular", "Popular"],
  ["price_low", "Price ↑"],
  ["price_high", "Price ↓"],
];

const CARD_GRADIENT: Gradient = {
  colors: [berry(0.9), berry(0.1), berry(0)],
  locations: [0, 0.5, 1],
  start: { x: 0, y: 1 },
  end: { x: 0, y: 0 },
};

type Props = { openService: (s: ServiceSummary) => void; onSeeAll: () => void };

/** "Finish the look": services by category, sorted by the server (most booked, or by price). */
export function ServicesGrid({ openService, onSeeAll }: Props) {
  const { width } = useScreen();
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<ServiceSort>("popular");
  const categories = useCategories();
  const services = useServices(category, sort);
  const list = services.data ?? [];

  // w-[62%] of the padded row, capped at 280, in a 3:4 frame.
  const cardW = Math.min((width - sz(40)) * 0.62, sz(280));
  const cardH = cardW * (4 / 3);
  const chips = [{ slug: null, name: "All" }, ...(categories.data ?? [])];

  return (
    <View className="py-6">
      <View className="mb-4 flex-row items-end justify-between px-5">
        <View>
          <Eyebrow>SIGNATURE SERVICES</Eyebrow>
          <Text className="mt-1 font-display text-2xl leading-8">Finish the look</Text>
        </View>
        <Button variant="link" onPress={onSeeAll}>
          See all
        </Button>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 pb-3">
        {chips.map((c) => {
          const on = category === c.slug;
          return (
            <Pressable
              key={c.slug ?? "all"}
              onPress={() => setCategory(c.slug)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              className={cn("rounded-full border px-4 py-2", on ? "border-primary bg-primary" : "border-glass-border bg-glass")}
              style={on ? shadows.luxury : undefined}
            >
              <Text className={cn("font-semibold text-xs leading-4", on ? "text-primary-foreground" : "text-foreground")}>{c.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SortControl value={sort} onChange={setSort} />

      {services.isPending ? (
        <LoadingState className="py-0" style={{ height: cardH }} />
      ) : services.isError ? (
        <ErrorState error={services.error} onRetry={() => void services.refetch()} className="py-8" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={cardW + 16}
          decelerationRate="fast"
          contentContainerClassName="gap-4 px-5 pb-2"
          contentContainerStyle={{ paddingTop: 2 }}
        >
          {list.map((s, i) => {
            const picture = pictureOf(s.imageUrl, s.id);
            const from = s.fromPricePaise === null ? "" : rupees(s.fromPricePaise);
            return (
              <Animated.View
                key={s.id}
                layout={listLayout}
                entering={listEnter}
                exiting={listExit}
                style={[shadows.luxury, { width: cardW, height: cardH, borderRadius: sz(26) }]}
              >
                <PressableScale
                  onPress={() => openService(s)}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.name}, from ${from}`}
                  className="flex-1 overflow-hidden rounded-[1.625rem]"
                >
                  <Image source={picture} contentFit="cover" transition={250} style={StyleSheet.absoluteFill} />
                  <LinearGradient {...CARD_GRADIENT} style={StyleSheet.absoluteFill} />
                  <View className="absolute left-3 top-3 rounded-full border border-glass-border bg-glass px-3 py-1">
                    <Text className="font-bold text-[0.625rem] leading-[0.9375rem] tracking-[0.0938rem]">
                      {sort === "popular" && i === 0 ? "MOST LOVED" : s.category.name.toUpperCase()}
                    </Text>
                  </View>
                  <Frosted
                    source={picture}
                    frame={{ width: cardW, height: cardH }}
                    gradient={CARD_GRADIENT}
                    tint={ivory(0.1)}
                    radius={sz(20)}
                    className="absolute inset-x-2 bottom-2 border border-primary-foreground/25 p-3"
                  >
                    <Text className="font-display text-lg leading-[1.4062rem] text-primary-foreground">{s.name}</Text>
                    <Text className="mt-1 text-[0.6875rem] leading-[1.0312rem] text-primary-foreground/75">
                      {duration(s.durationMinutes)} · {s.artistCount} {s.artistCount === 1 ? "artist" : "artists"}
                    </Text>
                    <View className="mt-2 flex-row items-center justify-between">
                      <Text className="text-xs leading-5 text-primary-foreground/80">
                        From <Text className="font-bold text-sm leading-5 text-primary-foreground/80">{from}</Text>
                      </Text>
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-foreground">
                        <ArrowRight size={sz(16)} color={colors.primary} />
                      </View>
                    </View>
                  </Frosted>
                </PressableScale>
              </Animated.View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/** Popular / Price ↑ / Price ↓ — the chosen one sits on a blush pill. */
function SortControl({ value, onChange }: { value: ServiceSort; onChange: (k: ServiceSort) => void }) {
  return (
    <View className="mx-5 mb-4 rounded-full" style={shadows.glass}>
      <View className="flex-row rounded-full border border-glass-border bg-glass p-1">
        {SORTS.map(([k, label]) => (
          <Pressable
            key={k}
            onPress={() => onChange(k)}
            accessibilityRole="button"
            accessibilityState={{ selected: value === k }}
            className={cn("flex-1 items-center rounded-full py-2", value === k && "bg-accent")}
          >
            <Text className={cn("font-semibold text-xs leading-4", value === k ? "text-primary" : "text-muted-foreground")}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
