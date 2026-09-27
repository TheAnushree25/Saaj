# Contributing to Saaj

## Setup

```bash
git clone https://github.com/TheAnushree25/Saaj.git
cd Saaj
npm ci
cp .env.example .env     # fill in the Supabase values (build guide step 6)
npx expo start
```

Use Node 22 (see `.nvmrc`). Keep the project **outside** OneDrive/Dropbox if you
can: `node_modules` has tens of thousands of files and sync tools fight Metro.

## Workflow

1. Branch from `main`: `feature/<short-name>`, `fix/<short-name>` or `chore/<short-name>`.
2. Commit in small steps with a message that says *what* and *why*
   (e.g. `Booking: block past dates in the slot picker`).
3. Before opening a pull request:

   ```bash
   npm run typecheck
   npm run lint
   npm run check:styles
   ```

4. Open a PR into `main`, fill in the template (screenshots for any UI change).
   CI must be green before merging.

## Conventions

- **Routes** live in `src/app` and stay thin; screen UI goes in
  `src/features/<feature>/components`, shared UI in `src/components`.
- **Styling** is NativeWind (Tailwind classes). Use `Text` from
  `src/components/ui/text.tsx` so fonts and colours apply.
- **Never put `className` on a Reanimated `Animated.*` component** — on Android
  it silently breaks the layout. Animated components take `style` only.
- **Dependencies**: add native packages with `npx expo install <pkg>` so the
  version matches the Expo SDK. Pure JavaScript packages can use `npm install`.
- **Secrets** never go in the repo or in `EXPO_PUBLIC_` variables. See
  [SECURITY.md](SECURITY.md).
