# Saaj — bridal booking app

An Android app for booking bridal beauty artists, built with the stack from the
*Bridal Booking App Build Guide*: **Expo SDK 57 (React Native) · Expo Router ·
NativeWind · Supabase · Razorpay · EAS Build**.

**Current phase: UI only.** Every screen of the SAJ design is built, running on
mock data from `lib/saj-data.ts`. Nothing talks to a server yet.

## Run it on your phone

1. Install **Expo Go** from the Play Store on your Android phone.
2. Connect the phone and this laptop to the **same Wi-Fi**.
3. In a terminal in this folder:

   ```bash
   npx expo start
   ```

4. Open Expo Go and scan the QR code shown in the terminal. The app opens.
   Edit any file and save — the phone updates in about a second.

If the QR scan hangs (different networks or Windows Firewall), use
`npx expo start --tunnel` instead.

## Look at it in a browser

```bash
npx expo start --web
```

Then open the page it prints. Use your browser's phone view (F12 → device
toolbar) for the right proportions. The phone is the real target; the browser is
just a quick preview.

## When something looks wrong

| Symptom | Fix |
| --- | --- |
| Screens unstyled, classes do nothing | `npx expo start -c` (clears Metro's cache) |
| Changed a config file, nothing changed | `npx expo start -c` |
| Want to see the opening screen again | Expo Go → long-press the app → clear data, or reinstall |

## Where things live

```
app/                      Screens. Every file here is a route (Expo Router).
  index.tsx               Opening screen (SAJ + Begin)
  (auth)/sign-in.tsx      "Let's begin beautifully."
  (bride)/(tabs)/         Home, Explore (reels), Bookings, Saved, Profile
  (bride)/artist/[id]     Artist portfolio
  (bride)/service/[id]    Service detail
  (bride)/book.tsx        3-step booking flow
  (bride)/confirmation    "Your moment is booked."
  (bride)/tracking.tsx    Booking status
components/               Shared UI (buttons, header, glass tab bar, cards)
lib/                      Data, colours, saved state, helpers
assets/images/            Bridal photos, app icon, splash
tailwind.config.js        The SAJ colour palette, fonts and corner radii
```

## Next

Continue the build guide from **Step 6 (Supabase)**. Fill in `.env` then, and
replace the mock data in `lib/saj-data.ts` with real queries in Step 15.
