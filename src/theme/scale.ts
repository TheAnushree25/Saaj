import { Dimensions, Platform } from "react-native";

/**
 * The design is drawn for a 390-wide phone. Every size in the app is scaled by
 * `scale`, so any phone shows exactly the same composition as the design,
 * edge to edge: never shrunk into the middle, never reflowed like a website.
 *
 * - Tailwind classes scale automatically: `rem` is set to 16 × scale at startup
 *   (src/lib/setup-scale.ts) and every class size is in rem.
 * - Numbers in style props and icon sizes go through `sz()`.
 */
export const DESIGN_WIDTH = 390;

const isWeb = Platform.OS === "web";

/**
 * A phone or small tablet held in the hand: touch input, no hover. Decided by
 * the device, not the page width, because phone browsers in "Desktop site"
 * mode (and some large phones) report a desktop-sized page.
 */
function isHandheldBrowser() {
  if (!isWeb || typeof window === "undefined") return false;
  const touchOnly = window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ?? false;
  const physicalWidth = Math.min(window.screen?.width ?? Infinity, window.screen?.height ?? Infinity);
  return touchOnly && physicalWidth < 600;
}

/** Laptop / desktop browsers draw the app inside a 390 × 844 phone frame. */
export const showPhoneFrame = isWeb && typeof window !== "undefined" && !isHandheldBrowser() && window.innerWidth >= 520;

function computeScale() {
  if (showPhoneFrame) return 1;
  if (isWeb) {
    // A phone browser: fill the page width exactly, whatever width it reports.
    return (typeof window !== "undefined" ? window.innerWidth : DESIGN_WIDTH) / DESIGN_WIDTH;
  }
  // The installed app: every Android phone is 320–480 dp wide; the clamp only
  // stops a tablet from blowing the phone design up to poster size.
  const { width } = Dimensions.get("window");
  return Math.min(1.35, Math.max(0.75, width / DESIGN_WIDTH));
}

export const scale = computeScale();

/** Scale a design-pixel value to this phone. */
export const sz = (px: number) => Math.round(px * scale * 100) / 100;
