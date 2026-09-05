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

**Why this matters as a demo:** Mausam runs entirely on free, keyless data sources and deterministic logic — nothing here can incur a bill, expire a trial, or fail because a quota ran out mid-demo. Every value the UI shows is honestly labeled as live, derived, or curated (see [Data sources](#data-sources--whats-live-derived-or-curated) below), and the app degrades gracefully at every layer — from a failed API call down to no backend at all — so a judge can always see a working, populated interface.

Mausam ships as two parts: a React frontend (this repository's root) and a small Node.js backend (`backend/`) that fetches live weather/air-quality data, normalizes it into one shared contract, and layers deterministic local intelligence — rule-based advisories, seasonal estimates, and a personalized daily briefing — on top. **No paid API, API key, or LLM is required to run it.**

## System architecture

```text
Open-Meteo Forecast API  ─┐
Open-Meteo Air Quality API┴─▶ backend (Fastify)  ─▶  GET /api/weather
                                                  ─▶  POST /api/personalized-briefing
                                                        │
                                                        ▼
                                          frontend (React + Vite)
                                          DEMO_WEATHER_DATA fallback
                                          if the backend is unreachable
```

The backend is optional at runtime: if `VITE_WEATHER_API_URL` is unset, or a request fails, the frontend falls back to a complete, realistic local dataset (`DEMO_WEATHER_DATA`) so the app is always demoable even with no network access or backend running.

## Data sources — what's live, derived, or curated

This matters for an honest presentation of the app: not every number is a live sensor reading.

| Category | Fields | Source |
| --- | --- | --- |
| **Live** | Temperature, feels-like, humidity, wind, pressure, dew point, hourly/daily forecast, US AQI, PM2.5/PM10/O₃/NO₂, UV index | Open-Meteo Forecast API + Open-Meteo Air Quality API (both free, no API key) |
| **Derived (computed from live data)** | Sunrise/sunset/moon phase/golden hour (via the `suncalc` library), comfort index, today's rainfall total, the homepage overview cards | Calculated locally in the backend from the live values above — not separately fetched |
| **Curated / rule-based (not live)** | Pollen levels, weather advisories/alerts, commute status, swimming conditions, garden/seasonal notes, nearby-location cards, packing suggestions, event-weather suitability, the personalized briefing | Deterministic logic and small curated datasets written for Kolkata/West Bengal — documented in each backend module, never presented as government or sensor data |

A few specific disclosures worth knowing before a demo:
- The AQI shown is the **US EPA AQI** (`us_aqi` from Open-Meteo), not India's National AQI — labeled "US AQI" in the UI. India's National AQI would require a paid/keyed provider (e.g. WAQI), which this project deliberately avoids.
- "Heat Index" is an approximation (Open-Meteo's apparent temperature used as a proxy), not the NWS Heat Index formula — labeled "(Approx.)" in the UI.
- "Comfort Index" is a custom heuristic score (0–100), not a standardized meteorological index — labeled "(Estimate)".
- Pollen levels are a seasonal climatology estimate for Kolkata/West Bengal, not a measured pollen count.
- Weather alerts are locally generated advisories (`source: "Mausam Weather Advisory"`), never scraped or attributed to IMD or any government agency.
- Swimming water temperature is an approximation from air temperature, not a sensor reading — labeled "(est.)".
- Locations distant from Kolkata (e.g. Darjeeling, a Himalayan hill station) use a curated condition override rather than mirroring Kolkata's live condition, since sharing an exact live condition across 600km would be implausible; nearer coastal/deltaic locations do share Kolkata's live condition as a reasonable regional approximation.

## Personalized briefing architecture

`POST /api/personalized-briefing` on the backend produces a persona-aware daily briefing using a **fully deterministic, rule-based engine — no LLM, no external AI API is called**. Given the already-normalized live weather and a persona (`commuter`, `student`, `outdoor`, `health`, or `general`), it:

1. Detects applicable risks in a fixed priority order (thunderstorm > extreme heat > heavy rain > high UV > high AQI > strong wind > favorable), so advice can never contradict itself (e.g. it will never recommend outdoor activity while a thunderstorm is active).
2. Selects a best outdoor time window from the real hourly forecast (never a fabricated time).
3. Composes persona-specific summary/recommendation/action text gated on the same top risk.
4. Validates its own output against a strict schema (`zod`) before it ever reaches the client.

The architecture exposes a `BriefingGenerator` interface with one implementation, `DeterministicBriefingGenerator` — a seam that would let a future model-backed generator be added later without changing the route, but **no such generator exists in this codebase**.

If the backend briefing is unavailable, the frontend transparently falls back to its own local, deterministic personalization logic (`getPersonalizedWeather` in `src/App.tsx`) — the "Your Mausam" page never breaks or shows a blank state.

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
- No API keys, no paid accounts, no database — everything needed runs locally or calls free, keyless APIs

### Running the backend (optional, but required for live data)

```bash
cd backend
npm install
cp .env.example .env   # defaults work out of the box for local development
npm run dev
```

This starts the Fastify backend on `http://localhost:3000`. It fetches live data from Open-Meteo — no key required — and serves `GET /api/health`, `GET /api/weather`, and `POST /api/personalized-briefing`. See [Environment variables](#environment-variables) and [API endpoints](#api-endpoints) below.

### Running the frontend

```bash
npm install
cp .env.example .env   # points the frontend at the local backend by default
npm run dev
```

Open the local address printed by Vite. The project defaults to port `8443`; another port can be selected when needed:

```bash
npm run dev -- --port 5173
```

If the backend isn't running, or `VITE_WEATHER_API_URL` is left unset, the app runs entirely on its built-in `DEMO_WEATHER_DATA` fallback — no crash, no blank screen.

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
├── android/                    Native Android project generated for Capacitor
├── backend/                    Fastify backend — live weather + deterministic briefing engine
│   ├── src/
│   │   ├── providers/          Open-Meteo forecast + air-quality clients (with runtime validation)
│   │   ├── normalizers/        Provider responses → the shared DashboardWeatherData contract
│   │   ├── astronomy/          Local sunrise/sunset/moon-phase calculation (suncalc, no API)
│   │   ├── data/                Curated datasets (pollen table, seasonal alerts, static locations)
│   │   ├── rules/               Deterministic commute/swimming/garden/locations/packing/event logic
│   │   ├── briefing/            Personalized-briefing engine (risk detection, best window, personas)
│   │   ├── cache/                In-memory TTL cache with last-known-good fallback
│   │   ├── routes/               GET /api/health, GET /api/weather, POST /api/personalized-briefing
│   │   ├── config/                Environment validation (zod)
│   │   └── utils/                 Kolkata timezone-safe date handling
│   └── test/                    160+ Vitest unit/integration tests
├── docs/                       README and promotional visuals
├── public/                     Static web assets and weather companions
├── src/
│   ├── App.tsx                 Screens, components, onboarding and shared rendering
│   ├── index.css               Themes, responsive layouts, cards and animations
│   ├── main.tsx                React entry point
│   ├── weatherData.ts          Shared weather types, presets, fallback content and live-fetch client
│   ├── personalizedBriefing.ts Backend briefing client, validation, and local-fallback adapter
│   └── imports/                Local image assets
├── capacitor.config.ts         Android wrapper configuration
├── index.html                  Web document shell and metadata
├── vite.config.ts              Development and production configuration
└── package.json                Scripts and dependencies
```

## Environment variables

### Frontend (`.env`, copy from `.env.example`)

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_WEATHER_API_URL` | Backend weather endpoint. Unset → the app runs entirely on `DEMO_WEATHER_DATA` | `http://localhost:3000/api/weather` |
| `VITE_WEATHER_REFRESH_MS` | Live-weather polling interval (min 10,000ms; invalid/unset → 300,000ms) | `60000` |
| `VITE_PERSONALIZED_BRIEFING_API_URL` | Backend personalized-briefing endpoint. Unset → the local deterministic fallback is used | `http://localhost:3000/api/personalized-briefing` |

### Backend (`backend/.env`, copy from `backend/.env.example`)

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Backend HTTP port | `3000` |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowlist | `http://localhost:8443,http://localhost:5173` (matches Vite's actual and generic default ports) |
| `WEATHER_CACHE_TTL_MS` | How long a successful forecast response is cached (min 10,000ms) | `300000` |
| `AIR_QUALITY_CACHE_TTL_MS` | How long a successful air-quality response is cached (min 10,000ms) | `600000` |
| `OPEN_METEO_BASE_URL` | Forecast API endpoint (free, no key) | `https://api.open-meteo.com/v1/forecast` |
| `OPEN_METEO_AIR_QUALITY_URL` | Air-quality API endpoint (free, no key) | `https://air-quality-api.open-meteo.com/v1/air-quality` |
| `DEFAULT_LATITUDE` / `DEFAULT_LONGITUDE` | Coordinates the backend serves weather for (Kolkata-only in this version — see Limitations) | `22.5726` / `88.3639` |
| `DEFAULT_CITY` / `DEFAULT_REGION` | Display labels for the served location | `Kolkata` / `West Bengal` |

No variable here is a secret — every one is safe to commit in `.env.example`, and none require signing up for anything.

## API endpoints

### `GET /api/health`
Liveness check. Returns `{ "status": "ok", "timestamp": "<ISO 8601>" }`.

### `GET /api/weather`
Returns the full `DashboardWeatherData` payload (see `src/weatherData.ts` for the exact contract) built from live Open-Meteo data plus the derived/curated sections described above. On upstream provider failure, serves the last successfully cached response if one exists; if none exists yet, returns `502`. Air-quality failure alone never fails the request — the `airQuality` section is simply omitted and the frontend's fallback merge fills it from demo data.

### `POST /api/personalized-briefing`
Generates a persona-aware briefing from the deterministic `BriefingGenerator` described above.

**Request body** (all fields optional except none are required — `persona` defaults to `"general"`):
```json
{
  "persona": "commuter",
  "activity": "walking",
  "sensitivity": "normal",
  "location": "Kolkata"
}
```
- `persona`: one of `commuter`, `student`, `outdoor`, `health`, `general`
- `sensitivity`: one of `low`, `normal`, `high`
- `activity`, `location`: free-text strings (length-limited), currently informational only — see Limitations
- Invalid values return `400` with `{ "error": "Invalid request body" }`

**Response** (validated against a strict schema before being returned):
```json
{
  "title": "Outdoor Outlook",
  "summary": "Conditions look favorable for outdoor activity today.",
  "recommendation": "This is a good day to be outside.",
  "bestWindow": { "start": "Now", "end": "3 pm", "reason": "Now–3 pm offers the most favorable stretch of conditions today." },
  "risks": [{ "type": "uv", "severity": "moderate", "message": "UV index is 6 (High)." }],
  "actions": ["Wear sunscreen and sunglasses if outside"],
  "dataContext": { "temperature": 29, "rainChance": 20, "uvIndex": 6, "aqi": 62 },
  "generatedAt": "2026-09-05T07:27:15.013Z"
}
```
- `aqi` is `null` when the air-quality provider is unavailable.
- On any backend failure, the frontend silently falls back to its own local `getPersonalizedWeather()` logic — the page never shows an error state.
- **Current limitation:** `location` is accepted but not yet used to fetch a different city's weather — the backend serves only the configured `DEFAULT_LATITUDE`/`DEFAULT_LONGITUDE` (Kolkata) in this version.

## Testing

```bash
cd backend
npm test          # runs the full Vitest suite (160+ tests)
npm run typecheck # TypeScript strict-mode check, no build output
```

Tests mock all external HTTP calls (`vi.stubGlobal('fetch', ...)`) — none depend on live internet access or the real Open-Meteo API, so the suite is fully deterministic and safe to run offline or in CI.

The frontend currently has no automated test runner configured; it's validated via `npm run build` (production build) and manual testing.

## Zero-cost architecture

Mausam is built to run a full live demo with **no billing risk**:
- The only two external network calls anywhere in the codebase go to Open-Meteo's Forecast and Air Quality APIs — both free and keyless.
- No LLM, no Anthropic/OpenAI/Gemini API, no Google Maps/Places, no WAQI, no Redis, and no paid weather provider are used anywhere.
- The personalized briefing is fully deterministic/rule-based — it is not an LLM integration, and none is planned for this version.
- No database, authentication provider, or third-party analytics service is required.

## Data and preferences

- Every weather screen reads from one shared dashboard model, sourced live from the backend when available and from `DEMO_WEATHER_DATA` otherwise.
- Demonstration content keeps the complete interface usable during development, offline, or if the backend is unavailable.
- Theme preference is stored locally in the browser.
- Onboarding choices and health concerns are stored locally on the device.
- No account, remote database or analytics service is included in the current build.

## Current limitations

- **Single city:** the backend serves live data for one configured location (Kolkata) only — there is no geocoding or multi-city support yet.
- **US AQI, not India's National AQI:** an India-specific AQI would require a keyed provider (e.g. WAQI); this version deliberately stays keyless and labels the value "US AQI" accordingly.
- **No live per-location weather:** the "Saved Locations" cards use a curated static list with temperature offsets, not independently fetched forecasts for each place.
- **No historical rainfall data:** monthly rainfall totals/averages and the rainfall history chart remain demo values, since fetching them would require Open-Meteo's separate historical archive API (not integrated in this version).
- **Personalized briefing personas are heuristically inferred:** the frontend maps the existing onboarding profile to one of five personas as a best-effort guess; there is no dedicated persona-selection UI yet.
- **No automated frontend tests:** frontend correctness is currently verified via production build + manual testing only.

## Design principles

1. **Decision-first:** show what the conditions mean, not only raw numbers.
2. **Local by default:** make the experience feel written for Kolkata and its seasons.
3. **Calm density:** keep rich information readable through hierarchy and spacing.
4. **Motion with purpose:** add atmosphere and feedback without blocking interaction.
5. **One responsive product:** share the same interface and logic across web and Android.

## Current status

The responsive interface, persistent onboarding, live backend integration, personalised weather briefing (with deterministic backend generation and local fallback), dashboard tabs, theme system, animations and Android wrapper are all in place and working together. The frontend builds successfully with:

```bash
npm run build
```

and the backend's full test suite (160+ tests) and TypeScript strict-mode typecheck both pass:

```bash
cd backend && npm test && npm run typecheck
```
