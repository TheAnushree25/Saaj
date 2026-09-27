import { rem } from "nativewind";
import { Platform } from "react-native";
import { scale } from "@/theme/scale";

// Imported first thing in the root layout, before any screen renders.
//
// Installed app / Expo Go: NativeWind resolves every rem through this value.
// Browser: rem is the <html> font size, so set that instead.
const base = 16 * scale;

if (Platform.OS === "web") {
  if (typeof document !== "undefined") {
    document.documentElement.style.fontSize = `${base}px`;
    lockPhoneViewport();
  }
} else {
  rem.set(base);
}

/**
 * In a phone browser, behave like an app: fill exactly the visible screen,
 * no pinch-zoom or double-tap zoom, no pull-to-refresh bounce, no grey flash
 * on taps.
 */
function lockPhoneViewport() {
  const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (viewport) {
    viewport.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
  }

  const style = document.createElement("style");
  style.textContent = `
    html, body, #root { height: 100dvh; }
    html, body { overscroll-behavior: none; background: #FBF6F1; }
    * { -webkit-tap-highlight-color: transparent; }
    body { touch-action: manipulation; }
  `;
  document.head.appendChild(style);
}
