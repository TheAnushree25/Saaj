import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useScreen } from "@/hooks/use-screen";
import { inr } from "@/lib/format";
import { metaOf, services, serviceTypes, type Service, type ServiceType } from "@/data/catalogue";
import { berry, colors, ivory, shadows } from "@/theme";
import { cn } from "@/lib/utils";
import { Frosted, type Gradient } from "@/components/media/frosted";
import { listEnter, listExit, listLayout } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Text } from "@/components/ui/text";

type SortKey = "popular" | "low" | "high";
const SORTS: [SortKey, string][] = [
  ["popular", "Popular"],
  ["low", "Price ↑"],
  ["high", "Price ↓"],
];

const CARD_GRADIENT: Gradient = {
  colors: [berry(0.9), berry(0.1), berry(0)],
  locations: [0, 0.5, 1],
  start: { x: 0, y: 1 },
  end: { x: 0, y: 0 },
};

type Props = { openService: (s: Service) => void; onSeeAll: () => void };

export function ServicesGrid({ openService, onSeeAll }: Props) {
  const { width } = useScreen();
  const [type, setType] = useState<ServiceType>("All");
  const [sort, setSort] = useState<SortKey>("popular");

  const list = services
    .filter((s) => type === "All" || metaOf(s.id).type === type)
    .sort((a, b) =>
      sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : metaOf(b.id).popularity - metaOf(a.id).popularity,
    );

  // w-[62%] of the padded row, capped at 280, in a 3:4 frame.
  const cardW = Math.min((width - 40) * 0.62, 280);
  const cardH = cardW * (4 / 3);

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
        {serviceTypes.map((t) => {
          const on = type === t;
          return (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              className={cn("rounded-full border px-4 py-2", on ? "border-primary bg-primary" : "border-glass-border bg-glass")}
              style={on ? shadows.luxury : undefined}
            >
              <Text className={cn("font-semibold text-xs leading-4", on ? "text-primary-foreground" : "text-foreground")}>{t}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SortControl value={sort} onChange={setSort} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardW + 16}
        decelerationRate="fast"
        contentContainerClassName="gap-4 px-5 pb-2"
        contentContainerStyle={{ paddingTop: 2 }}
      >
        {list.map((s, i) => {
          const meta = metaOf(s.id);
          return (
            <Animated.View
              key={s.id}
              layout={listLayout}
              entering={listEnter}
              exiting={listExit}
              style={[shadows.luxury, { width: cardW, height: cardH, borderRadius: 26 }]}
            >
              <PressableScale
                onPress={() => openService(s)}
                accessibilityRole="button"
                accessibilityLabel={`${s.name}, from ${inr(s.price)}`}
                className="flex-1 overflow-hidden rounded-[26px]"
              >
                <Image source={s.image} contentFit="cover" transition={250} style={StyleSheet.absoluteFill} />
                <LinearGradient {...CARD_GRADIENT} style={StyleSheet.absoluteFill} />
                <View className="absolute left-3 top-3 rounded-full border border-glass-border bg-glass px-3 py-1">
                  <Text className="font-bold text-[10px] leading-[15px] tracking-[1.5px]">
                    {sort === "popular" && i === 0 ? "MOST LOVED" : meta.type.toUpperCase()}
                  </Text>
                </View>
                <Frosted
                  source={s.image}
                  frame={{ width: cardW, height: cardH }}
                  gradient={CARD_GRADIENT}
                  tint={ivory(0.1)}
                  radius={20}
                  className="absolute inset-x-2 bottom-2 border border-primary-foreground/25 p-3"
                >
                  <Text className="font-display text-lg leading-[22.5px] text-primary-foreground">{s.name}</Text>
                  <Text className="mt-1 text-[11px] leading-[16.5px] text-primary-foreground/75">
                    {s.duration} · ★ {meta.rating}
                  </Text>
                  <View className="mt-2 flex-row items-center justify-between">
                    <Text className="text-xs leading-5 text-primary-foreground/80">
                      From <Text className="font-bold text-sm leading-5 text-primary-foreground/80">{inr(s.price)}</Text>
                    </Text>
                    <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-foreground">
                      <ArrowRight size={16} color={colors.primary} />
                    </View>
                  </View>
                </Frosted>
              </PressableScale>
            </Animated.View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Popular / Price ↑ / Price ↓ — the chosen one sits on a blush pill. */
function SortControl({ value, onChange }: { value: SortKey; onChange: (k: SortKey) => void }) {
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
