// Colours and shadows for the places a className can't reach: icon colours,
// gradients, shadows and animated styles. Keep in sync with tailwind.config.js.

export const colors = {
  background: "#FBF6F1",
  foreground: "#22171C",
  card: "#FEFBF8",
  primary: "#75002E",
  primaryForeground: "#FDF7F3",
  muted: "#F2E5DD",
  mutedForeground: "#725D61",
  accent: "#FEBEC1",
  accentForeground: "#481422",
  border: "#E1CBC7",
  glass: "rgba(255, 251, 246, 0.82)",
  glassBorder: "rgba(255, 255, 255, 0.6)",
  berryDeep: "#400314",
  rose: "#B36F82",
  nude: "#F0DDD3",
} as const;

/** berry-deep (#400314) at the given alpha */
export const berry = (alpha: number) => `rgba(64, 3, 20, ${alpha})`;
/** primary-foreground (#FDF7F3) at the given alpha */
export const ivory = (alpha: number) => `rgba(253, 247, 243, ${alpha})`;

// React Native 0.76+ draws real CSS-style box shadows (colour, blur, spread) on
// Android too. A view that clips its children (overflow: hidden) would clip its
// own shadow, so shadowed cards put the shadow on an outer wrapper.
export const shadows = {
  luxury: { boxShadow: "0px 16px 40px rgba(64, 3, 20, 0.18)" },
  glass: { boxShadow: "0px 8px 30px rgba(64, 3, 20, 0.10)" },
  sm: { boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.10), 0px 1px 2px -1px rgba(0, 0, 0, 0.10)" },
} as const;
