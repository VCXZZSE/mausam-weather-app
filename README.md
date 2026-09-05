<div align="center">

# Mausam Weather

### Local weather, translated into a better day.

A mobile-first Kolkata weather experience combining live conditions, health context, movement guidance, rainfall and local planning in one calm daily view.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=0B2533)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vite.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android-119EFF?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com/)

</div>

![Mausam mobile weather dashboard showcase](./docs/mausam-mobile-showcase.svg)

## What is Mausam?

Most weather apps stop at temperature and rain probability. Mausam focuses on the decisions people make after checking the weather: whether to run, carry protection, change a commute, limit outdoor exposure, water crops or avoid swimming.

The experience is designed for Kolkata and its seasons, with an emphasis on clear hierarchy, useful local context and personal guidance.

## App experience

| Area | What it provides |
| --- | --- |
| Personal setup | Name, location, body context, weather sensitivities, health concerns, daily priorities and activity level |
| Home | Personal greeting, current conditions, weather companion, hourly outlook, essential metrics and seven-day forecast |
| Health Metrics | AQI, particulate levels, pollen, UV exposure, humidity, heat index and practical guidance |
| Extended Forecast | Seven-day conditions, temperature ranges, rain probability, astronomy, rainfall history and comfort factors |
| Alerts & Travel | Active warnings, nearby locations, travel context, packing suggestions and seasonal planning |
| Your Mausam | A profile-aware daily briefing with important metrics, a recommended window and practical next steps |
| Android | The same responsive experience packaged as a native Android application with Capacitor |

## Features

### Personal setup and preferences

- Guided onboarding with a smooth step-by-step flow
- Name and Kolkata location setup
- Age, height, weight and activity context
- Selectable weather and air sensitivities
- Selectable health concerns and daily goals
- Locally saved profile selections that survive refreshes
- Light theme shown by default for new users

### Weather home

- Clean personalised greeting banner
- Current location, temperature, condition and feels-like range
- Wind, humidity and visibility readings
- Horizontal hourly forecast with rain probability
- Seven-day forecast with condition icons and temperature ranges
- At-a-glance cards for health, movement, commuting and outdoor plans
- Dedicated air-quality, UV, best-run and rainfall tiles
- Supporting commute, swimming and garden cards

### Weather companions

- Two complete weather-card appearances: sunny and rainy
- Warm yellow gradient for sunny conditions in light mode
- Deeper amber gradient for sunny conditions in dark mode
- Cheerful orange sun companion
- Animated rain and storm cloud companion
- Cloud, lightning, raindrop, reflection and puddle motion
- Automatic visual switching while preserving the same card structure

### Health and comfort

- Air Quality Index status and pollutant breakdown
- PM2.5, PM10, ozone and nitrogen-dioxide readings
- Responsive AQI and pollutant progress bars
- UV level, peak hours, burn time and protection guidance
- Pollen level breakdown for trees, grass and weeds
- Heat-index, humidity and hydration guidance
- Personalised priorities based on selected sensitivities and concerns

### Forecast and planning

- Full extended seven-day forecast
- Replaceable condition icons for every hourly and daily entry
- Sunrise, sunset, solar noon, moon phase, golden hour and moonrise
- Monthly rainfall progress and recent rainfall chart
- Comfort index with temperature, humidity and wind factors
- Active weather warnings with severity styling
- Saved-location conditions
- Daily packing suggestions
- Seasonal event-planning card

### Personalised weather page

- Clickable “Good morning” banner from the homepage
- Dedicated “Your Mausam” experience
- Short daily headline and concise weather summary
- User-specific important metrics
- Recommended outdoor or activity window
- Profile-aware tiles and practical recommendations
- Expandable explanation showing the signals behind the briefing
- Safe local fallback briefing for uninterrupted use
- Session caching to keep repeat visits smooth

### Themes, motion and accessibility

- Complete light and dark themes
- Animated sun-and-moon theme switch
- Improved light-theme contrast for text, icons and cards
- Consistent card dimensions, spacing and alignment
- Phone-first responsive layout
- Smooth native scrolling and touch momentum
- Horizontal forecast snapping
- Reduced-motion support
- Visible keyboard focus states
- System-native typography without external font-loading shifts

### Performance improvements

- Faster initial rendering on long pages
- Removed expensive full-page transform animations
- Reduced permanent compositor layers
- Removed live blur passes from mobile content cards
- Isolated weather-companion animation work
- Prevented scroll-position jumps between screens
- Limited card transitions to lightweight properties

## Work completed

- Redesigned the upper dashboard around a cleaner personal greeting and weather hero
- Removed time, date and seasonal-status clutter from the main weather card
- Improved weather-stat spacing, unit separation, weight and contrast
- Standardised the size and internal alignment of primary and supporting tiles
- Matched swimming and garden cards to one consistent footprint
- Added sunny and rainy weather-card presets without removing either design
- Added the orange sunny companion while retaining the animated monsoon companion
- Added the complete Health Metrics, Extended Forecast and Alerts & Travel views
- Added persistent onboarding preferences and profile-aware prioritisation
- Added the dedicated personalised weather page and expandable recommendation context
- Removed the homepage festival countdown while retaining seasonal planning where relevant
- Improved mobile scrolling, motion, theme transitions and reduced-motion behaviour
- Centralised weather values so every screen follows the same current dataset
- Verified the TypeScript project and optimized production build

## Run locally

### Requirements

- Node.js 22 or a compatible modern Node.js release
- npm

### Development

```bash
npm install
npm run dev
```

Open the local address printed by Vite. The project currently defaults to port `8443`; another port can be selected when needed:

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
# Build, sync and open Android Studio
npm run android

# Build and sync without opening Android Studio
npm run android:sync

# Run through the Capacitor CLI
npm run android:run
```

For a release build, update the Android version code and name, run the sync command, test on a physical device or emulator and generate a signed Android App Bundle from Android Studio. Keep signing keys and credentials outside the repository.

## Project structure

```text
.
├── android/                 Native Android project generated for Capacitor
├── docs/                    README and promotional visuals
├── public/                  Static web assets and weather companions
├── src/
│   ├── App.tsx              Screens, components, onboarding and shared rendering
│   ├── index.css            Themes, responsive layouts, cards and animations
│   ├── main.tsx             React entry point
│   ├── weatherData.ts       Shared weather types, presets and fallback content
│   └── imports/             Local image assets
├── capacitor.config.ts      Android wrapper configuration
├── index.html               Web document shell and metadata
├── vite.config.ts           Development and production configuration
└── package.json             Scripts and dependencies
```

## Data and preferences

- Every weather screen reads from one shared dashboard model.
- Demonstration content keeps the complete interface usable during development.
- Theme preference is stored locally in the browser.
- Onboarding choices and health concerns are stored locally on the device.
- No account, remote database or analytics service is included in the current build.

## Design principles

1. **Decision-first:** show what the conditions mean, not only raw numbers.
2. **Local by default:** make the experience feel written for Kolkata and its seasons.
3. **Calm density:** keep rich information readable through hierarchy and spacing.
4. **Motion with purpose:** add atmosphere and feedback without blocking interaction.
5. **One responsive product:** share the same interface and logic across web and Android.

## Current status

The responsive interface, persistent onboarding, personalised weather briefing, dashboard tabs, theme system, animations and Android wrapper are in place. The repository builds successfully with:

```bash
npm run build
```
