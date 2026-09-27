import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable } from "react-native";
import { cssInterop } from "nativewind";
import Animated from "react-native-reanimated";

// NativeWind turns className into styles only for components it knows about.
// React Native's own View/Text/Pressable are built in; these are not.

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

cssInterop(AnimatedPressable, { className: "style" });
cssInterop(Animated.View, { className: "style" });
cssInterop(Animated.Text, { className: "style" });
cssInterop(Image, { className: "style" });
cssInterop(LinearGradient, { className: "style" });
