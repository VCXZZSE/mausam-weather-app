# Vercel weather and location APIs

## Live weather pipeline

`GET /api/weather` accepts the selected latitude/longitude and returns the complete `DashboardWeatherData` payload. It fetches Open-Meteo weather and CPCB AQI, then executes `lib/normalizers/toDashboardWeatherData.ts` with condition mapping, time calculations, UV normalization, derived metrics, astronomy, and activity rules.

The root `lib/` modules are copies of the backend implementation. Keep corresponding changes synchronized. Supporting modules stay outside `api/` so they are not treated as separate serverless entrypoints.

`/api/location/search` and `/api/location/reverse` resolve selected locations. The frontend defaults to relative API routes. Demo weather is used only when explicitly enabled or before a location is available; live request failures are surfaced as errors.

## Vercel configuration

Set `DATA_GOV_IN_API_KEY` as a server-side secret in the Vercel environments you deploy to, then redeploy. The current project's Production and Preview environments were configured on 6 September 2026. No credential is stored in this repository. Local Fastify development reads the key from Git-ignored `backend/.env`.

For the standard Vercel deployment, leave these unset:

- `VITE_WEATHER_API_URL`
- `VITE_LOCATION_SEARCH_API_URL`
- `VITE_LOCATION_REVERSE_API_URL`
- `VITE_USE_DEMO_WEATHER`

Setting `VITE_USE_DEMO_WEATHER=true` explicitly enables demo weather. Never prefix the government key with `VITE_`, which would expose it to the browser.

## Dynamic AQI station selection

AQI uses the coordinates of the selected location, including the selected PIN search result. It chooses the nearest CPCB station with usable data within `CPCB_MAX_STATION_DISTANCE_KM` (default 50 km). There is no fixed mapping from Kolkata or a PIN to Fort William or Jadavpur.

A station qualifies only with at least three valid pollutant readings, including PM2.5 or PM10, from a common reporting timestamp within the last 24 hours. Invalid and excessively future-dated readings are rejected. If the closest station does not qualify, another qualifying station can be selected. If none qualifies, AQI is omitted.

The bulk station feed is cached for `CPCB_CACHE_TTL_MS` (default 30 minutes) per warm serverless instance. Location matching runs on each request, even when the feed is cached. After expiry, the next request attempts a provider refresh; if it fails, previously cached readings may be reused only while they still pass the freshness checks. Values therefore depend on government reporting and caching, not on each page refresh.

The response identifies the station, distance, reporting time, and CPCB/IN_NAQI source. Missing credentials or unavailable usable data do not produce fabricated or US-AQI fallback values.

## Production verification

Public endpoint: https://mausam-roan.vercel.app/api/weather

Verified HTTP 200 responses after deployment on 6 September 2026:

| Requested location | Selected station | AQI | Category | Station reporting time |
| --- | --- | --- | --- | --- |
| Kolkata (22.5726, 88.3639) | Fort William, Kolkata - WBPCB | 70 | Satisfactory | 6 September 2026, 13:00 IST |
| New Delhi (28.6139, 77.209) | Talkatora Garden, Delhi - DPCC | 62 | Satisfactory | 6 September 2026, 13:00 IST |

These are historical observations, not fixed application values or verification of every PIN. Personalized briefing has no equivalent Vercel serverless endpoint and uses the frontend's local computation fallback.
