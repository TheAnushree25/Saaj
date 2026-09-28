import { Image } from "expo-image";
import { X } from "lucide-react-native";
import { useState } from "react";
import { FlatList, Modal, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconButton } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import type { Picture } from "@/data/catalogue";
import { sz } from "@/theme/scale";

type Props = { images: Picture[]; index: number | null; onClose: () => void };

/** Full-screen photo viewer. Swipe between photos, tap anywhere to close. */
export function Lightbox({ images, index, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(0);
  const [openedAt, setOpenedAt] = useState<number | null>(null);

  // Reset the counter each time the viewer opens on a new photo.
  if (index !== openedAt) {
    setOpenedAt(index);
    if (index !== null) setCurrent(index);
  }

  return (
    <Modal visible={index !== null} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 bg-berry-deep">
        {index !== null ? (
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(_, i) => String(i)}
            onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item, index: i }) => (
              <Pressable onPress={onClose} accessibilityLabel={`Portfolio detail ${i + 1}`} style={{ width, height }}>
                <Image source={item} contentFit="contain" style={{ width, height }} />
              </Pressable>
            )}
          />
        ) : null}
        <View className="absolute right-4" style={{ top: insets.top + sz(16) }}>
          <IconButton label="Close gallery" icon={X} onPress={onClose} />
        </View>
        <View className="absolute inset-x-0 items-center" style={{ bottom: insets.bottom + sz(32), pointerEvents: "none" }}>
          <Text className="text-xs leading-4 text-primary-foreground">
            {current + 1} / {images.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
}
