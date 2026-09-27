import { Image, type ImageContentPosition } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ArrowRight, Heart, Share2, Sparkles, Star, type LucideIcon } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Share, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Frosted, type Gradient } from "@/components/media/frosted";
import { Button } from "@/components/ui/button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Text } from "@/components/ui/text";
import { artists, type Artist } from "@/data/catalogue";
import { hapticImpact } from "@/lib/haptics";
import { berry, colors, ivory, shadows } from "@/theme";

const POSITIONS: ImageContentPosition[] = [
  { left: "50%", top: "20%" },
  { left: "30%", top: "40%" },
  { left: "70%", top: "30%" },
];

const REEL_GRADIENT: Gradient = {
  colors: [berry(0.4), berry(0), berry(0.9)],
  locations: [0, 0.5, 1],
};

type ReelProps = {
  artist: Artist;
  index: number;
  width: number;
  height: number;
  topInset: number;
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
};

/** One full-screen reel: the photo, the side actions and the frosted artist card. */
export function Reel({ artist, index, width, height, topInset, liked, saved, onLike, onSave }: ReelProps) {
  const position = POSITIONS[index % 3];

  const share = () => {
    Share.share({ message: `${artist.studio} on SAJ — “${artist.tagline}”` }).catch(() => {});
  };

  return (
    <View style={{ width, height }} className="overflow-hidden">
      <Image
        source={artist.image}
        contentFit="cover"
        contentPosition={position}
        transition={200}
        style={{ position: "absolute", width, height, transform: [{ scale: 1.05 }] }}
      />
      <LinearGradient {...REEL_GRADIENT} style={StyleSheet.absoluteFill} />

      <View className="absolute right-4 z-10 items-center gap-4" style={{ bottom: 300 }}>
        <ReelAction
          label={liked ? "Unlike" : "Like"}
          icon={Heart}
          active={liked}
          caption={String(artist.reviews * 7 + (liked ? 1 : 0))}
          onPress={() => {
            hapticImpact();
            onLike();
          }}
        />
        <ReelAction
          label={saved ? "Unsave" : "Save"}
          icon={Sparkles}
          active={saved}
          caption={saved ? "Saved" : "Save"}
          onPress={() => {
            hapticImpact();
            onSave();
          }}
        />
        <ReelAction label="Share" icon={Share2} caption="Share" onPress={share} />
      </View>

      <Frosted
        source={artist.image}
        frame={{ width, height }}
        contentPosition={position}
        imageScale={1.05}
        gradient={REEL_GRADIENT}
        tint={ivory(0.15)}
        radius={26}
        className="absolute inset-x-3 bottom-24 z-10 border border-primary-foreground/25 p-4"
        style={shadows.luxury}
      >
        <View className="flex-row items-center gap-3">
          <Image source={artist.image} contentFit="cover" style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: ivory(0.5) }} />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="font-display text-xl leading-[25px] text-primary-foreground">
              {artist.studio}
            </Text>
            <View className="flex-row items-center gap-1">
              <Star size={12} color={ivory(0.75)} fill={ivory(0.75)} />
              <Text className="text-[11px] leading-[16.5px] text-primary-foreground/75">
                {artist.rating} · {artist.category} · {artist.location}
              </Text>
            </View>
          </View>
        </View>
        <Text className="mt-3 text-sm leading-[19.25px] text-primary-foreground/90">{artist.tagline}</Text>
        <Button
          variant="ivory"
          className="mt-3 h-11 w-full rounded-full"
          iconRight={ArrowRight}
          onPress={() => router.push({ pathname: "/artist/[id]", params: { id: String(artist.id) } })}
        >
          View portfolio
        </Button>
      </Frosted>

      <Text
        className="absolute right-5 z-10 font-semibold text-[10px] leading-[15px] tracking-[2px] text-primary-foreground/70"
        style={{ top: topInset + 64 }}
      >
        {String(index + 1).padStart(2, "0")} / {String(artists.length).padStart(2, "0")}
      </Text>
    </View>
  );
}

type ReelActionProps = { label: string; icon: LucideIcon; caption: string; active?: boolean; onPress: () => void };

/** A round glass action on the right edge. The icon pops when switched on. */
function ReelAction({ label, icon: Icon, caption, active = false, onPress }: ReelActionProps) {
  const pop = useSharedValue(1);
  const wasActive = useRef(active);

  useEffect(() => {
    if (active && !wasActive.current) {
      pop.set(withSequence(withTiming(1.3, { duration: 120 }), withSpring(1, { damping: 8, stiffness: 260 })));
    }
    wasActive.current = active;
  }, [active, pop]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const pf = colors.primaryForeground;

  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="items-center gap-1">
      <View className="h-12 w-12 items-center justify-center rounded-full border border-primary-foreground/25 bg-primary-foreground/15" style={shadows.glass}>
        <Animated.View style={iconStyle}>
          <Icon size={20} color={pf} fill={active ? pf : "none"} />
        </Animated.View>
      </View>
      <Text className="font-semibold text-[10px] leading-[15px] text-primary-foreground">{caption}</Text>
    </PressableScale>
  );
}
