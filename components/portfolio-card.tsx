import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowRight, Heart, Star } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import type { Artist } from "@/lib/saj-data";
import { berry, colors, shadows } from "@/lib/theme";
import { IconButton } from "./ui/button";
import { usePressScale } from "./ui/pressable-scale";
import { Text } from "./ui/text";

type Props = { artist: Artist; width: number; saved: boolean; onOpen: () => void; onSave: () => void };

/** A 4:5 portrait card in the "Trending bridal looks" carousel. */
export function PortfolioCard({ artist, width, saved, onOpen, onSave }: Props) {
  const pf = colors.primaryForeground;
  const press = usePressScale(0.985);

  // The save button sits beside the card's pressable area, not inside it:
  // a button inside a button is invalid on the web and confuses screen readers.
  return (
    <Animated.View style={[shadows.luxury, { width, height: width * 1.25, borderRadius: 24 }, press.style]}>
      <Pressable
        onPress={onOpen}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${artist.studio} bridal portfolio`}
        className="flex-1 overflow-hidden rounded-[24px] bg-card"
      >
        <Image source={artist.image} contentFit="cover" transition={250} style={StyleSheet.absoluteFill} />
        <LinearGradient
          colors={[berry(0.95), berry(0), berry(0.1)]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View className="absolute inset-x-0 bottom-0 p-5">
          <View className="mb-2 flex-row items-center gap-1">
            <Star size={12} color={pf} fill={pf} />
            <Text className="text-xs leading-4 text-primary-foreground">
              {artist.rating} · {artist.reviews} brides
            </Text>
          </View>
          <Text className="font-display text-3xl leading-[37.5px] text-primary-foreground">{artist.studio}</Text>
          <Text className="mt-1 text-xs leading-4 text-primary-foreground/75">
            {artist.category} · {artist.location}
          </Text>
          <View className="mt-4 flex-row items-center gap-2">
            <Text className="font-bold text-xs leading-4 tracking-[1.56px] text-primary-foreground">VIEW PORTFOLIO</Text>
            <ArrowRight size={12} color={pf} />
          </View>
        </View>
      </Pressable>
      <View className="absolute right-4 top-4">
        <IconButton label={saved ? "Unsave artist" : "Save artist"} icon={Heart} active={saved} filled={saved} onPress={onSave} />
      </View>
    </Animated.View>
  );
}
