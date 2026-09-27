const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// inlineRem: false keeps rem sizes live, so src/app/_layout.tsx can set
// 1rem = 16px × (phone width / 390) and every Tailwind size scales with the
// screen. (NativeWind would otherwise bake 1rem into the bundle.)
module.exports = withNativeWind(config, { input: "./global.css", inlineRem: false });
