const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// backend/ is a separate Node.js project (the API). The app never imports it,
// so Metro should neither crawl nor watch it, nor its thousands of node_modules files.
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Either separator between folders: Windows paths use "\", but Metro's file
// watcher can report the same path with "/".
const backendDir = path.join(__dirname, "backend").split(path.sep).map(escapeRegExp).join("[\\\\/]");
config.resolver.blockList = [
  ...[config.resolver.blockList ?? []].flat(),
  new RegExp(`^${backendDir}[\\\\/]`),
];

// inlineRem: false keeps rem sizes live, so src/app/_layout.tsx can set
// 1rem = 16px × (phone width / 390) and every Tailwind size scales with the
// screen. (NativeWind would otherwise bake 1rem into the bundle.)
module.exports = withNativeWind(config, { input: "./global.css", inlineRem: false });
