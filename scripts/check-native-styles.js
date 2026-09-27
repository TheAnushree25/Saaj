// Compiles global.css for Android exactly the way NativeWind does inside Metro,
// and reports whether the classes the app relies on made it into the output.
// Usage: node scripts/check-native-styles.js
const path = require("path");
const { tailwindCliV3 } = require("nativewind/dist/metro/tailwind/v3");
const { cssToReactNativeRuntime } = require("react-native-css-interop/dist/css-to-rn");
const { cssToReactNativeRuntimeOptions } = require("nativewind/dist/metro/common");

const SAMPLE = ["flex-1", "bg-primary", "rounded-[24px]", "mt-14", "text-primary-foreground", "font-display", "leading-[96px]", "bg-glass", "border-glass-border"];

(async () => {
  const input = path.resolve("global.css");
  const cli = tailwindCliV3(() => {});
  const css = await cli.getCSSForPlatform({ platform: "android", input, browserslist: "last 1 version", browserslistEnv: "native" });
  const text = css.toString();
  console.log(`tailwind css: ${text.length} chars`);
  const data = cssToReactNativeRuntime(css, { ...cssToReactNativeRuntimeOptions, inlineRem: 16 });
  const raw = data.rules ?? {};
  const rules = raw instanceof Map ? raw : new Map(Array.isArray(raw) ? raw : Object.entries(raw));
  console.log(`native rules: ${rules.size}`);
  for (const c of SAMPLE) console.log(`${rules.has(c) ? "ok     " : "MISSING"} ${c}`);
  process.exit(0);
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
