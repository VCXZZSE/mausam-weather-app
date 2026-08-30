# Mausam Weather

Mausam is a premium, mobile-first weather dashboard designed to make everyday weather decisions feel simple and calm. It combines current conditions with the context people actually need: health, outdoor activity, commuting, travel, family planning, gardening, and events.

## Highlights

- Frosted-glass, Apple-inspired interface
- Responsive phone and desktop layouts
- Health insights for AQI, pollen, UV, and humidity
- Outdoor planning with running hours, wind, heat, sunrise, and sunset
- Beach and surf conditions including tides, waves, and water temperature
- Commute, travel, family, gardening, and event-planning summaries
- Weather-aware companion illustration for sunny and rainy conditions
- Compact Sun & Moon and Golden Hour details

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite. To create a production build:

```bash
npm run build
```

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS

## Android app

The Android app is a Capacitor wrapper around the same production web build. The website remains the source of truth.

```bash
npm install
npm run android
```

`npm run android` builds the website, syncs it into the native Android project, and opens Android Studio. To only rebuild and sync:

```bash
npm run android:sync
```

In Android Studio, connect a physical device or start an emulator and press **Run**. To create a debug APK, use **Build > Build Bundle(s) / APK(s) > Build APK(s)**. For Google Play, use **Build > Generate Signed Bundle / APK**, choose **Android App Bundle**, and create or select a private keystore. Never commit the keystore or signing credentials.

For future releases, make and test web changes, run `npm run android:sync`, verify the Android build, then commit and push the source and Android project to GitHub. Increase the Android version code/name in Android Studio before generating each release AAB.

## Project structure

- `src/App.tsx` — application screens and weather dashboard components
- `src/index.css` — global styles, glass surfaces, responsive layout, and animations
- `src/main.tsx` — application entry point
- `capacitor.config.ts` — Capacitor app ID, name, and `dist` web directory
- `android/` — generated native Android project
