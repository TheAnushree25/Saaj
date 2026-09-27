This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep route files thin; put UI in `src/features/<feature>/components` (screen-specific) or `src/components` (shared: `ui/`, `layout/`, `brand/`, `media/`). Data in `src/data`, state in `src/store`, colours/shadows in `src/theme`, helpers in `src/lib`, hooks in `src/hooks`.
- Styling is NativeWind v4 + Tailwind 3.4 (`tailwind.config.js`, `global.css`). Fonts are one family per weight: use `font-sans` / `font-medium` / `font-semibold` / `font-bold` / `font-display`, never a fontWeight. Use `Text` from `src/components/ui/text.tsx`, not React Native's, so every string gets the body font and colour.
- **Never put `className` on a Reanimated `Animated.*` component** (and never register one with `cssInterop`): on Android the className shim swallows animated styles and collapses layouts. Animated components take `style` only; put classes on a plain View inside or around them. Press feedback uses NativeWind `active:` classes on plain `Pressable`s.
- Use `useScreen()` (src/hooks/use-screen.tsx), not `useWindowDimensions`, for layout maths, so the laptop phone-frame preview sizes correctly.
- No live blur on Android (`BlurTargetView` is experimental); `GlassSurface` handles platform differences.
- `npm run check:styles` compiles the Tailwind classes for Android the way Metro does and reports missing ones.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
