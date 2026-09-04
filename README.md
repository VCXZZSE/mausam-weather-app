<div align="center">

# Mausam Weather

### Local weather, translated into a better day.

A mobile-first Kolkata weather experience that combines conditions, health context, movement guidance, rainfall, and local planning in one calm daily view.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=0B2533)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com/)

</div>

![Mausam mobile weather dashboard showcase](./docs/mausam-mobile-showcase.svg)

## What is Mausam?

Most weather apps stop at temperature and rain probability. Mausam is designed around the decisions people make after checking the weather: whether to run, carry protection, change a commute, limit outdoor exposure, water crops, or avoid swimming.

The current build is a responsive product prototype focused on Kolkata during monsoon season. It uses a curated local dataset to demonstrate the complete interface and interaction model. A live weather service is not connected yet.

## The experience

| Area | What it provides |
| --- | --- |
| Personal setup | Name, location, body context, health sensitivities, priorities, and activity level |
| Home | Personal greeting, current conditions, animated weather companion, tailored briefing, hourly rain outlook, daily metrics, and seven-day forecast |
| Health | AQI, particulate levels, pollen, UV, humidity, heat stress, and practical health guidance |
| Forecast | Extended daily outlook, sunrise and sunset, golden-hour details, and nearby-location weather |
| Alerts | Rain warnings, waterlogging, travel disruption, and local transport context |
| Android | A Capacitor wrapper that ships the same responsive web experience as a native Android application |

## Product highlights

- Kolkata-first weather context rather than generic global summaries
- Light and dark themes with a custom animated day/night switch
- Animated rain-cloud companion with cloud, lightning, raindrop, and puddle motion
- Clear current-weather hierarchy with location, temperature, condition, and three essential readings
- Balanced metric cards for air quality, UV exposure, best run time, and rainfall
- Practical cards for commuting, swimming conditions, gardening, and seasonal context
- Personalised guidance based on the onboarding profile
- A dedicated “Your Mausam” page with profile-prioritized insights, relevant tiles, and practical next steps
- A restrained, system-native visual hierarchy for the personalised briefing in both themes
- Touch-friendly navigation, horizontal forecast snapping, and momentum scrolling
- Responsive layout designed for phone screens first and larger screens second
- Reduced-motion support and visible keyboard focus states

## Work completed

The interface has gone through a focused visual and usability refinement:

- Consolidated the upper dashboard into a cleaner personalised header and weather hero
- Removed unnecessary time, date, and seasonal-status clutter from the main weather card
- Reworked the weather card for stronger spacing, contrast, and information hierarchy
- Added and tuned the animated rain/storm companion without using background rain lines
- Improved weather-stat typography so values and units remain easy to scan
- Standardised the dimensions and internal alignment of the primary metric tiles
- Centred the key AQI and best-run information while preserving supporting context
- Matched the swimming and garden cards to a consistent tile system
- Corrected light-theme text and icon contrast, including the weather location marker
- Added a smoother, more expressive light/dark theme toggle
- Added a clickable personalised banner and a profile-aware “Your Mausam” briefing with deterministic health and weather priorities
- Persisted onboarding selections locally so the personalised experience survives refreshes
- Simplified the briefing header and overview with a system-native type hierarchy, fewer boxed elements, and quieter glass surfaces
- Removed full-page transform animations so long screens appear immediately without promoting the entire page to a GPU layer
- Switched to native vertical scrolling, reset new views before paint, and prevented scroll anchoring from causing position jumps
- Removed live backdrop-filter passes from mobile content cards while preserving their translucent appearance
- Isolated the animated weather companion, removed its expensive mobile SVG filter, and retained its cloud, rain, and puddle motion
- Reduced permanent compositor layers and limited mobile card transitions to lightweight transforms
- Removed external web-font requests to prevent font-loading layout shifts and use the device’s native interface font
- Added touch momentum, overscroll containment, gentle hourly-card snapping, and complete reduced-motion behaviour
- Simplified the build configuration and retained search-engine blocking in standard project files
- Verified the production build after the UI and performance changes

## Run locally

### Requirements

- Node.js 22 or a compatible modern Node.js release
- npm

### Development

```bash
npm install
npm run dev
```

Open the local address printed by Vite. The project currently defaults to port `8443`; you can choose another port when needed:

```bash
npm run dev -- --port 5173
```

### Production build

```bash
npm run build
npm run preview
```

The optimized website is generated in `dist/`.

## Android app

Mausam uses Capacitor so the responsive website remains the single source of truth for web and Android.

```bash
# Build, sync, and open Android Studio
npm run android

# Build and sync without opening Android Studio
npm run android:sync

# Run through the Capacitor CLI
npm run android:run
```

For a release build, update the Android version code and name, run the sync command, test on a physical device or emulator, and generate a signed Android App Bundle from Android Studio. Keep signing keys and credentials outside the repository.

## Project structure

```text
.
├── android/                 Native Android project generated for Capacitor
├── docs/                    README and promotional visuals
├── public/                  Static web assets
├── src/
│   ├── App.tsx              Screens, components, onboarding, and demo weather data
│   ├── index.css            Themes, responsive layouts, cards, and animations
│   ├── main.tsx             React entry point
│   └── imports/             Local image assets
├── capacitor.config.ts      Android wrapper configuration
├── index.html               Web document shell and metadata
├── vite.config.ts           Development and production build configuration
└── package.json             Scripts and dependencies
```

## Data and persistence

- Weather, AQI, forecast, and alert values currently come from constants in `src/App.tsx`.
- Theme preference is stored locally in the browser.
- The onboarding profile and its selected weather and health concerns are stored locally on the device.
- No account, remote database, analytics service, or live weather endpoint is currently connected.

These boundaries make the next engineering steps clear: connect a trusted weather source, optionally sync profiles across devices, model loading and failure states, and validate guidance against live data.

## Design principles

1. **Decision-first:** surface what the conditions mean, not only the raw numbers.
2. **Local by default:** make the experience feel written for Kolkata and its seasons.
3. **Calm density:** keep rich information readable through hierarchy and spacing.
4. **Motion with purpose:** use animation to add atmosphere and feedback without blocking interaction.
5. **One responsive product:** share the same interface and logic across web and Android.

## Current status

The responsive interface, persistent onboarding flow, personalized weather briefing, core dashboard tabs, theme system, animations, and Android wrapper are in place. The repository builds successfully with:

```bash
npm run build
```

The next major milestone is replacing the demonstration dataset with live, location-aware weather and environmental data.
