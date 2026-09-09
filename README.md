<div align="center">

# Mausam Weather

**Local weather, translated into a better day.**

A mobile-first weather app with location-specific forecasts, Indian government air quality, and practical guidance for daily plans.

[Open the live app](https://mausam-roan.vercel.app) · [Deployment guide](api/README.md)

</div>

![Mausam dashboard design showcase](docs/mausam-mobile-showcase.svg)

## What Mausam does

Choose a location using device coordinates or place/PIN search, complete onboarding, and see weather for that location. The dashboard combines current conditions and forecasts with comfort metrics, astronomy, and activity guidance. Its visual design is inspired by Kolkata and the monsoon, while weather requests use the selected coordinates.

| Feature | What you get |
| --- | --- |
| Location-first setup | Profile → location selection → Ready confirmation → dashboard |
| Current weather | Temperature, feels-like, conditions, humidity, wind, and visibility |
| Forecast | Hourly outlook and seven-day weather with rain probabilities |
| Indian air quality | Nearest usable CPCB station, National AQI category, pollutant sub-indices, distance, and reporting time |
| Astronomy and comfort | Sun/moon information, UV, and derived comfort and rainfall metrics |
| Daily planning | Weather-based running, commute, packing, swimming, and garden guidance |
| Your Mausam | Profile-aware briefing with important metrics and suggested activity windows |
| Profile sidebar | Frosted-glass menu with onboarding details, a gender-aware avatar, location controls, briefing access, and local logout |
| Interface | Light/dark themes, animated weather companions, responsive layouts, and reduced-motion support |
| Android | Capacitor wrapper around the web application |

## How the data works

The browser requests `/api/weather` with the selected latitude and longitude. On Vercel, the serverless endpoint fetches Open-Meteo weather and optional CPCB station data, then returns the complete dashboard model through `toDashboardWeatherData()`.

```text
Selected location coordinates
          ↓
  /api/weather
          ↓
  Open-Meteo + CPCB
          ↓
  Normalizers · astronomy · derived metrics · activity rules
          ↓
  Location-specific dashboard
```

Local development runs a Fastify backend with the corresponding transformation pipeline. Vercel uses the supporting modules in `lib/`; keep these copies synchronized with the matching `backend/src/` modules when changing shared weather logic.

### Dynamic AQI

AQI is selected by distance from the chosen coordinates, not by a fixed city or PIN mapping. For example, Jadavpur is selected only if it is the nearest qualifying station; another location may select Fort William.

- The default search radius is **50 km**.
- A station needs at least three valid pollutant readings, including PM2.5 or PM10, from a common reporting timestamp within the last 24 hours.
- The overall AQI is the maximum published pollutant sub-index. These values are **AQI sub-indices**, not pollutant concentrations.
- The station feed is cached for **30 minutes** per warm serverless instance. Station matching still runs for each requested location.
- After cache expiry, the next request attempts a refresh. A failed refresh may reuse cached readings while they still meet the freshness checks.
- Missing credentials or a lack of qualifying stations causes AQI to be omitted. The app does not substitute US AQI or fabricated readings.

CPCB coverage is for India. Weather can work elsewhere without a corresponding Indian AQI reading.

### Live, derived, and seasonal content

Forecast weather and CPCB AQI come from providers. Astronomy and comfort metrics are calculated. Activity suggestions are rule-based; pollen and some seasonal/local planning content use curated approximations. Curated advisories are not official IMD alerts, and seasonal estimates are not live measurements.

Demo weather is explicitly enabled with `VITE_USE_DEMO_WEATHER=true`, or used before a location is available. A failed live weather request surfaces an error instead of silently replacing the response with demo weather.

Current weather is treated as time-sensitive. The app bypasses browser caches, rejects provider observations older than 30 minutes, refreshes at least every five minutes, and refreshes again when the tab regains focus or connectivity. The hero card and the first hourly “Now” item use the same current condition so they cannot contradict one another. The provider update time is shown on the weather card.

### Profile sidebar

Press the Mausam logo from any dashboard page to open the frosted-glass profile sidebar. Its modal backdrop blurs the page underneath, and Escape or tapping the backdrop closes it. The sidebar displays the profile captured during onboarding, including age, gender, height, weight, activity level, goals, weather sensitivities, and health considerations. Female and male profiles receive matching illustrated avatars; older profiles and users who do not specify either receive a neutral initials avatar.

Location changes now start from the sidebar rather than the main weather tile. The sidebar also opens the personalised daily briefing. Logging out clears the saved profile and confirmed location from the current device, then returns the user to onboarding. Theme switching remains in the homepage header and is intentionally absent from the sidebar.

The official advisory card remains in its safe unavailable state. Farming and fishing feeds are not connected until verified IMD agrometeorological and fisheries sources are available, so the UI does not claim an all-clear.

## Run locally

The repository pins Node.js 22 and pnpm 10.34.3 in `.mise.toml`. Install the frontend and backend dependencies separately:

```bash
git clone https://github.com/VCXZZSE/mausam-weather-app.git
cd mausam-weather-app
pnpm install --frozen-lockfile
npm ci --prefix backend
```

For a fresh clone, create the local environment files:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

If you already have these files, preserve your existing values. For local AQI, set `DATA_GOV_IN_API_KEY` in `backend/.env`. Leave it empty to run weather without AQI. Environment files containing credentials are Git-ignored.

```bash
npm run dev
```

This starts both services:

- Frontend: `http://localhost:8443`
- Fastify API: `http://localhost:3000`

The root `.env.example` points browser requests to the local backend. Device location requires browser/system permission and a secure context; use localhost locally or HTTPS when accessing from another device. Manual search is available when device positioning fails.

### Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start frontend and backend together |
| `npm run dev:frontend` | Start Vite only |
| `npm run dev:backend` | Start Fastify only |
| `npm run build` | Build the frontend into `dist/` |
| `npm run preview` | Preview the frontend build; start the local API separately when using local API URLs |
| `npm test` | Run frontend tests |
| `npm test --prefix backend` | Run backend tests |
| `pnpm exec tsc --noEmit` | Check frontend TypeScript |
| `npm run typecheck --prefix backend` | Check backend TypeScript |

## Deploy to Vercel

The app is deployed at **[mausam-roan.vercel.app](https://mausam-roan.vercel.app)**.

1. Import the repository into Vercel with the project root set to `.` and the Vite framework preset. The frontend build command is `npm run build`, with `dist` as its output.
2. Add `DATA_GOV_IN_API_KEY` as a **server-side secret** for the environments that need CPCB AQI.
3. Leave `VITE_WEATHER_API_URL`, `VITE_LOCATION_SEARCH_API_URL`, `VITE_LOCATION_REVERSE_API_URL`, and `VITE_USE_DEMO_WEATHER` unset for the standard deployment. The frontend uses relative serverless routes and live weather by default.
4. Redeploy after changing environment variables.

Never put the government key in a `VITE_` variable or commit it to Git. The existing project's Production and Preview secrets are configured in Vercel; cloning the repository does not copy those settings to another project.

The deployed personalized briefing uses local frontend computation because `/api/personalized-briefing` has no Vercel serverless counterpart. The local Fastify backend exposes that endpoint.

See [the API deployment guide](api/README.md) for station selection, caching, and recorded production checks.

## Android

With Android Studio and the Android SDK configured:

```bash
npm run android        # Build, sync, and open Android Studio
npm run android:sync   # Build and sync web assets
npm run android:run    # Run through Capacitor
```

Configure an API endpoint reachable from the device before building; the local development `localhost:3000` URL refers to the device itself when packaged. Physical-device GPS and a signed native release still require verification. Keep signing credentials outside Git.

## Project structure

```text
├── api/                Vercel weather and location endpoints
├── lib/                Supporting transformation modules for Vercel
├── backend/            Fastify server, providers, rules, and backend tests
├── src/                React screens, styles, location and API clients
├── public/             Public assets
├── test/               Frontend tests
├── android/            Capacitor Android project
├── docs/               Historical implementation notes and design reference
├── .env.example        Local frontend and serverless configuration reference
├── capacitor.config.ts Android wrapper configuration
├── vercel.json         Deployment headers and API routing
└── package.json        Frontend dependencies and development commands
```

## Preferences and current limitations

Profile, theme, and confirmed location preferences are stored locally in the browser. Weather and location providers receive the coordinates or search queries needed to serve requests. The project does not include user accounts or a remote profile database.

Device geolocation depends on browser permission, operating-system Location Services, and provider availability. A reported MacBook/Chrome positioning timeout still needs successful real-device verification. API and build checks do not establish physical-device GPS behavior.

Historical development details are available in [the implementation notes](docs/PROJECT_CHANGES.md). Those notes may describe superseded behavior; use this README and the deployment guide for current setup.
