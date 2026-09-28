import { Image } from "expo-image";
import { ChevronRight, Search, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GentleIn } from "@/components/ui/motion";
import { messageOf } from "@/components/ui/states";
import { Text } from "@/components/ui/text";
import { pictureOf } from "@/data/catalogue";
import { useDebounced } from "@/hooks/use-debounced";
import type { ArtistCard, ServiceSummary } from "@/lib/api-types";
import { rupees } from "@/lib/format";
import { useArtists, useSearch, useServices } from "@/lib/queries";
import { colors, shadows } from "@/theme";
import { sz } from "@/theme/scale";

type Props = { openArtist: (a: ArtistCard) => void; openService: (s: ServiceSummary) => void };

/**
 * Search box plus service chips. Typing searches artists and services on the
 * server; a chip lists the artists who offer that service.
 */
export function HomeSearch({ openArtist, openService }: Props) {
  const [query, setQuery] = useState("");
  const [service, setService] = useState<string | null>(null);
  const q = useDebounced(query.trim());

  // The five most-booked services make the chips.
  const popular = useServices(null, "popular");
  const chips = (popular.data ?? []).slice(0, 5);

  const typed = q.length >= 2;
  const search = useSearch(service ? "" : q);
  const byService = useArtists({ service: service ?? undefined, q: typed ? q : undefined, pageSize: 10 }, !!service);
  const results = service
    ? { artists: byService.data?.items ?? [], services: [] as ServiceSummary[] }
    : (search.data ?? { artists: [], services: [] });
  const active = typed || !!service;
  const loading = service ? byService.isFetching : search.isFetching;
  const error = service ? byService.error : search.error;

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
        <Button size="sm" variant={service === null ? "default" : "glass"} className="rounded-full" onPress={() => setService(null)}>
          All
        </Button>
        {chips.map((c) => (
          <Button
            key={c.slug}
            size="sm"
            variant={service === c.slug ? "default" : "glass"}
            className="rounded-full"
            onPress={() => setService((current) => (current === c.slug ? null : c.slug))}
          >
            {c.name}
          </Button>
        ))}
      </ScrollView>

      {active ? (
        <GentleIn>
          <View className="gap-2 rounded-3xl border border-glass-border bg-glass p-2" style={shadows.glass}>
            {results.services.map((s) => (
              <Pressable key={`s${s.id}`} onPress={() => openService(s)} className="flex-row items-center rounded-2xl p-3 active:bg-muted">
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="font-bold text-sm leading-5">
                    {s.name}
                  </Text>
                  <Text className="text-[0.8125rem] leading-5 text-muted-foreground">
                    Service{s.fromPricePaise === null ? "" : ` · from ${rupees(s.fromPricePaise)}`}
                  </Text>
                </View>
                <ChevronRight size={sz(16)} color={colors.foreground} />
              </Pressable>
            ))}
            {results.artists.map((a) => (
              <Pressable key={a.id} onPress={() => openArtist(a)} className="flex-row items-center gap-3 rounded-2xl p-2 active:bg-muted">
                <Image
                  source={pictureOf(a.profileImageUrl, a.id)}
                  contentFit="cover"
                  style={{ width: sz(48), height: sz(48), borderRadius: sz(25.6) }}
                />
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="font-bold text-sm leading-5">
                    {a.studioName}
                  </Text>
                  <Text className="text-[0.8125rem] leading-5 text-muted-foreground">
                    {a.specialty} · {a.city}
                  </Text>
                </View>
                <ChevronRight size={sz(16)} color={colors.foreground} />
              </Pressable>
            ))}
            {!results.artists.length && !results.services.length ? (
              loading ? (
                <View className="p-4">
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <Text className="p-4 text-center text-sm leading-5 text-muted-foreground">
                  {error ? messageOf(error) : "No matches yet — try another word."}
                </Text>
              )
            ) : null}
          </View>
        </GentleIn>
      ) : null}
    </View>
  );
}
