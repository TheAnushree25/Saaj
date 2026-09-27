const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// inlineRem: 16 makes 1rem = 16px on the phone, the same as in a browser, so
// sizes like text-sm (0.875rem) match the web design exactly. NativeWind's
// native default is 14.
module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
