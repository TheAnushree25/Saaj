import { Image } from "expo-image";
import { ChevronRight, Search, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { inr } from "@/lib/format";
import { artists, categories, services, type Artist, type Service } from "@/data/catalogue";
import { colors, shadows } from "@/theme";
import { GentleIn } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { sz } from "@/theme/scale";

type Props = { openArtist: (a: Artist) => void; openService: (s: Service) => void };

export function HomeSearch({ openArtist, openService }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const q = query.trim().toLowerCase();
  const matchA = artists.filter(
    (a) =>
      (!q || `${a.studio} ${a.name} ${a.category} ${a.location}`.toLowerCase().includes(q)) &&
      (category === "All" || a.category.includes(category.split(" ")[0] ?? category)),
  );
  const matchS = services.filter((s) => q && s.name.toLowerCase().includes(q));
  const active = q.length > 0 || category !== "All";

  return (
    <View className="px-5 pb-2">
      <View className="justify-center">
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder="Search artists, services, cities"
          returnKeyType="search"
          accessibilityLabel="Search artists, services, cities"
          className="h-14 rounded-full border-glass-border bg-glass pl-11 pr-11"
          style={shadows.glass}
        />
        <View className="absolute left-4" style={{ pointerEvents: "none" }}>
          <Search size={sz(16)} color={colors.mutedForeground} />
        </View>
        {query ? (
          <Pressable accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQuery("")} className="absolute right-4">
            <X size={sz(16)} color={colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5" contentContainerClassName="gap-2 px-5 py-4">
        {categories.map((c) => (
          <Button key={c} size="sm" variant={category === c ? "default" : "glass"} className="rounded-full" onPress={() => setCategory(c)}>
            {c}
          </Button>
        ))}
      </ScrollView>

      {active ? (
        <GentleIn>
          <View className="gap-2 rounded-3xl border border-glass-border bg-glass p-2" style={shadows.glass}>
          {matchS.map((s) => (
            <Pressable key={`s${s.id}`} onPress={() => openService(s)} className="flex-row items-center rounded-2xl p-3 active:bg-muted">
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-bold text-sm leading-5">
                  {s.name}
                </Text>
                <Text className="text-[0.8125rem] leading-5 text-muted-foreground">Service · from {inr(s.price)}</Text>
              </View>
              <ChevronRight size={sz(16)} color={colors.foreground} />
            </Pressable>
          ))}
          {matchA.map((a) => (
            <Pressable key={a.id} onPress={() => openArtist(a)} className="flex-row items-center gap-3 rounded-2xl p-2 active:bg-muted">
              <Image source={a.image} contentFit="cover" style={{ width: sz(48), height: sz(48), borderRadius: sz(25.6) }} />
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-bold text-sm leading-5">
                  {a.studio}
                </Text>
                <Text className="text-[0.8125rem] leading-5 text-muted-foreground">
                  {a.category} · {a.location}
                </Text>
              </View>
              <ChevronRight size={sz(16)} color={colors.foreground} />
            </Pressable>
          ))}
          {!matchA.length && !matchS.length ? (
            <Text className="p-4 text-center text-sm leading-5 text-muted-foreground">No matches yet — try another word.</Text>
          ) : null}
          </View>
        </GentleIn>
      ) : null}
    </View>
  );
}
