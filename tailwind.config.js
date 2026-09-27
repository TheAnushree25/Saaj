/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  // The design is light-only. "class" stops the phone's dark mode switching
  // any dark: styles on by itself.
  darkMode: "class",
  corePlugins: {
    // Manrope ships one font file per weight, so font-medium / font-semibold /
    // font-bold below switch the font family instead of setting fontWeight.
    // (A fontWeight on top of a custom font makes Android fake-bold it.)
    fontWeight: false,
  },
  theme: {
    extend: {
      // The SAJ palette, converted from the design's oklch tokens to hex.
      colors: {
        background: "#FBF6F1",
        foreground: "#22171C",
        card: { DEFAULT: "#FEFBF8", foreground: "#22171C" },
        primary: { DEFAULT: "#75002E", foreground: "#FDF7F3" },
        secondary: { DEFAULT: "#E5B6BC", foreground: "#33181F" },
        muted: { DEFAULT: "#F2E5DD", foreground: "#725D61" },
        accent: { DEFAULT: "#FEBEC1", foreground: "#481422" },
        border: "#E1CBC7",
        input: "#E1CBC7",
        ring: "#8E2E47",
        glass: {
          DEFAULT: "rgba(255, 251, 246, 0.82)",
          border: "rgba(255, 255, 255, 0.6)",
        },
        ivory: "#FFFBF6",
        "berry-deep": "#400314",
        rose: "#B36F82",
        blush: "#F5B9BB",
        nude: "#F0DDD3",
      },
      fontFamily: {
        sans: ["Manrope_400Regular"],
        medium: ["Manrope_500Medium"],
        semibold: ["Manrope_600SemiBold"],
        bold: ["Manrope_700Bold"],
        display: ["DMSerifDisplay_400Regular"],
        "display-italic": ["DMSerifDisplay_400Regular_Italic"],
      },
      // The design's radius scale is built on a 1.35rem base.
      borderRadius: {
        sm: "17.6px",
        md: "19.6px",
        lg: "21.6px",
        xl: "25.6px",
        "2xl": "29.6px",
        "3xl": "33.6px",
        "4xl": "37.6px",
      },
    },
  },
  plugins: [],
};
