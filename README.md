# backend-v0.3 — Change log

This branch README records implementation changes and verification only. The project overview remains in the main branch README.

## Vercel live weather and AQI deployment

- The frontend now uses relative `/api/weather` requests when no explicit backend URL is configured; the localhost-only restriction is removed.
- `api/weather.ts` returns the complete dashboard contract through `lib/normalizers/toDashboardWeatherData.ts`, including condition, time, UV, derived metrics, astronomy, and activity rules copied from the backend implementation.
- Supporting modules live under root `lib/`, outside the serverless entrypoint directory.
- Configured `DATA_GOV_IN_API_KEY` as a Vercel secret for Production and Preview and redeployed. The secret remains outside Git; cloning this repository does not configure another Vercel project.
- AQI selects the nearest qualifying CPCB station to the selected coordinates within 50 km by default. PIN search uses the coordinates of the selected search result, not a fixed PIN-to-station mapping.
- Stations need at least three valid pollutant readings, including PM2.5 or PM10, at a common reporting time within the last 24 hours. A closer station with unusable data is skipped.
- CPCB feed caching defaults to 30 minutes per warm serverless instance. After expiry, the next request attempts a refresh; failed refreshes can reuse cached data, still subject to the 24-hour reading validity check. Station selection runs for each requested location.
- Public production verification at https://mausam-roan.vercel.app returned HTTP 200 for Kolkata (Fort William, AQI 70) and New Delhi (Talkatora Garden, AQI 62), both Satisfactory and reported at 13:00 IST on 6 September 2026. These are historical verification snapshots, not fixed values.
- See [the API deployment guide](api/README.md) for configuration and limitations.

## Capacitor configuration

- Added `capacitor.config.ts` to the root TypeScript project so the editor uses the configured module resolution and installed Capacitor types.
- The configuration is now included in `tsc --noEmit`, rather than being left outside the checked project.
- Preserved the Android application ID, application name, and `dist` web directory.

## Location and onboarding

- Preserved the location-first onboarding order: profile setup → location selection → Ready slider → dashboard.
- Save the selected location only after completing the Ready slider, so refreshing before confirmation does not skip that step.
- Limit address/weather prefetch during selection to four seconds so slow backend requests do not trap onboarding.
- Preserve an address that resolves successfully even if the parallel weather request times out.
- Retry address enrichment after entering the dashboard when device coordinates are available but the location still has its placeholder label.
- Removed the browser Permissions API preflight that could reject a location attempt before requesting coordinates. Device location is requested directly from the button interaction.
- Keep area-level positioning first, followed by a precise-position retry for eligible failures.
- Bound permission-status queries and add an application deadline for geolocation providers that fail to invoke their callbacks. Late callbacks are ignored.
- Distinguish site denial, device/system denial, embedded permissions-policy restrictions, insecure HTTP origins, unavailable coordinates, and timeout errors.
- Clarified recovery messages for HTTPS requirements and device-level browser permissions.
- Allow relative URLs in the location API client and report missing search configuration as an error rather than an empty result.
- Added regression coverage for permission handling, retries, stalled providers, and progression to the Ready slider when backend requests hang.

## Location screen layout

- Put manual search and demo selection on separate full-width rows.
- Added touch-friendly minimum heights, a divider, and extra spacing above the demo action.
- Added expanded-state accessibility attributes to the manual-search toggle.
- Disable competing selection controls while resolving a location.

## Backend startup and development

- Repaired missing property separators in backend TypeScript declarations that prevented the backend from starting.
- `npm run dev` now starts both frontend and backend through `dev:all`.
- Added `npm run dev:frontend` for intentionally running Vite alone; retained `dev:backend`.
- Load the backend's own `.env` file during server startup, independent of the shell's working directory.

## Indian government AQI

- Use CPCB station data from the Government of India's data.gov.in resource for India National AQI.
- Fixed the live response mapping: current records use `avg_value`; older exports use `pollutant_avg`. Both formats and numeric/string values are accepted.
- Read all result pages so nearby stations are not omitted by a truncated first page.
- Select the nearest usable station within the configured distance, defaulting to 50 km.
- Treat government pollutant values as published AQI sub-indices, not concentrations. Removed the second application of concentration breakpoints and incorrect concentration units.
- Calculate overall AQI from the maximum published sub-index, requiring at least three distinct pollutants including PM2.5 or PM10.
- Keep stations and reporting timestamps separate; reject invalid, incomplete, future-dated, and more-than-24-hour-old readings.
- Show the Indian category, station name, distance, reporting time in IST, and pollutant sub-indices.
- Removed the unused Open-Meteo US-AQI provider, normalizer, and obsolete tests.
- Removed fabricated demo CPCB readings and require CPCB/IN_NAQI source metadata in frontend live-data validation.
- Omit AQI when no usable government reading exists; do not substitute US AQI or demo values.
- Trim the government API key, load it only on the backend, and avoid logging provider errors that could contain credential-bearing URLs.
- Updated route fixtures and tests to cover the government feed, pagination, station selection, categories, unavailable data, and caching.

## Verification

- Frontend: 41 tests passed.
- Backend: 213 tests passed.
- Frontend and backend TypeScript checks passed.
- Production frontend build passed.
- Live PIN search and reverse geocoding returned valid Kolkata results.
- Live CPCB verification and the running weather endpoint returned Fort William, Kolkata - WBPCB, AQI 66 (Satisfactory), reported at 09:00 IST on 6 September 2026. This is a verification snapshot, not a fixed application value.
- The supplied API key is kept in Git-ignored `backend/.env`; no real key is included in this branch.

## Remaining device verification

- Automatic location acquisition on the reported MacBook/Chrome setup still requires device verification: permission was granted, but the browser timed out without coordinates. The timeout and error handling are tested; a successful real-device fix has not been confirmed.
- macOS Location Services and browser access must be enabled. Local HTTP works at `localhost`; a phone opening an HTTP LAN address requires an HTTPS deployment for browser geolocation.
- Android runtime GPS and a signed native build have not been verified on a physical device in this session.
