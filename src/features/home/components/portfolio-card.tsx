import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Heart, Star } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { pictureOf } from "@/data/catalogue";
import type { ArtistCard } from "@/lib/api-types";
import { berry, colors, shadows } from "@/theme";
import { sz } from "@/theme/scale";

type Props = { artist: ArtistCard; width: number; saved: boolean; onOpen: () => void; onSave: () => void };

/** A 4:5 portrait card in the "Trending bridal looks" carousel. Tapping it opens the portfolio. */
export function PortfolioCard({ artist, width, saved, onOpen, onSave }: Props) {
  const pf = colors.primaryForeground;

  // The save button sits beside the card's pressable area, not inside it:
  // a button inside a button is invalid on the web and confuses screen readers.
  return (
    <View style={[shadows.luxury, { width, height: width * 1.25, borderRadius: sz(24) }]}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${artist.studioName} bridal portfolio`}
        className="flex-1 overflow-hidden rounded-[1.5rem] bg-card active:opacity-90"
      >
        <Image
          source={pictureOf(artist.coverImageUrl ?? artist.profileImageUrl, artist.id)}
          contentFit="cover"
          transition={250}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={[berry(0.95), berry(0), berry(0.1)]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View className="absolute inset-x-0 bottom-0 p-5">
          <View className="mb-2 flex-row items-center gap-1">
            <Star size={sz(12)} color={pf} fill={pf} />
            <Text className="text-xs leading-4 text-primary-foreground">
              {artist.rating === null ? "New on SAJ" : `${artist.rating} · ${artist.reviewCount} brides`}
            </Text>
          </View>
          <Text className="font-display text-3xl leading-[2.3438rem] text-primary-foreground">{artist.studioName}</Text>
          <Text className="mt-1 text-xs leading-4 text-primary-foreground/75">
            {artist.specialty} · {artist.city}
          </Text>
          <View className="mt-4 flex-row items-center gap-2">
            <Text className="font-bold text-xs leading-4 tracking-[0.0975rem] text-primary-foreground">VIEW PORTFOLIO</Text>
            <ArrowRight size={sz(12)} color={pf} />
          </View>
        </View>
      </Pressable>
      <View className="absolute right-4 top-4">
        <IconButton label={saved ? "Unsave artist" : "Save artist"} icon={Heart} active={saved} filled={saved} onPress={onSave} />
      </View>
    </View>
  );
}
