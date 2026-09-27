# Saaj — bridal booking app

An Android app for booking bridal beauty artists, built with the stack from the
*Bridal Booking App Build Guide*: **Expo SDK 57 (React Native) · Expo Router ·
NativeWind · Supabase · Razorpay · EAS Build**.

**Current phase: UI only.** Every screen of the SAJ design is built, running on
mock data from `src/data/catalogue.ts`. Nothing talks to a server yet.

## See it on your laptop (phone preview)

```bash
npx expo start --web
```

Open the address it prints (usually http://localhost:8081). On a laptop the app
is drawn inside a 390 × 844 phone frame with the same fonts, colours and
layout as the phone. Save any file and the preview updates.

## See it on your phone

1. Install **Expo Go** from the Play Store.
2. Phone and laptop on the **same Wi-Fi**.
3. Run `npx expo start` and scan the QR code with Expo Go.

After changing config files (`tailwind.config.js`, `babel.config.js`,
`metro.config.js`, `.env`) always restart with a clean cache:

```bash
npx expo start -c
```

## Where things live

```
src/
  app/                  Routes only (Expo Router): every file is a screen
    index.tsx           Opening screen (SAJ + Begin)
    (auth)/             Sign in, create account
    (bride)/(tabs)/     Home, Explore (reels), Bookings, Saved, Profile
    (bride)/…           Artist portfolio, service, booking flow, confirmation, tracking
  features/             Screen-specific UI, grouped by feature
    auth/               Form fields, cinematic auth shell, schemas (Zod)
    home/               Trending carousel, services grid, search, upcoming booking
    explore/            Full-screen reel
  components/           Shared UI
    ui/                 Text, Button, Input, motion, pressables
    layout/             Header, floating tab bar, glass surface, phone frame
    brand/ media/       Logo; lightbox, petals, frosted glass
  data/                 Mock catalogue (replaced by Supabase queries later)
  store/                App state saved on the device (AsyncStorage)
  theme/                Colours and shadows for code that can't use classes
  lib/ hooks/           Helpers (format, haptics, cn) and hooks
assets/images/          Bridal photos, app icon, splash
scripts/                Dev tools (check-native-styles)
tailwind.config.js      The SAJ colour palette, fonts and corner radii
```

## Handy commands

| Command | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript check across the project |
| `npm run check:styles` | Compiles the styles for Android and flags missing classes |
| `npx expo start -c` | Start with a clean cache (after config changes) |

## Next

Continue the build guide from **Step 6 (Supabase)**. Fill in `.env` then, and
replace the mock data in `src/data/catalogue.ts` with real queries in Step 15.
