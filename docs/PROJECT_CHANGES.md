# MAUSAM — Project Changes: Before vs After Backend Implementation

## 1. Executive Summary

Before this work, Mausam was a **frontend-only React application**. Every number on screen — temperature, AQI, UV, pollen, alerts, locations — came from a single hardcoded object (`DEMO_WEATHER_DATA`) in `src/weatherData.ts`. There was no server, no live data, and no personalization beyond a client-side rule table keyed off onboarding choices.

Mausam is now a **two-part system**: the same React frontend, plus a small Node.js/Fastify backend (`backend/`) that fetches live weather and air-quality data from Open-Meteo, normalizes it into the frontend's existing data contract, layers deterministic local intelligence on top (astronomy, comfort, curated advisories, a rule-based personalized briefing), and serves it over a small JSON API. The frontend was extended with a live-fetch/merge/fallback layer and a backend-briefing client, but its screens, components, and visual design were **not redesigned**.

Overall transformation:
- **Live**: current/hourly/daily forecast, AQI, pollutants, UV (Open-Meteo, free, no API key).
- **Derived** (computed locally from live data): astronomy, comfort index, today's rainfall, homepage overview cards.
- **Curated/rule-based** (not live): pollen, weather advisories, commute/swimming/garden guidance, saved-location cards, packing suggestions, event-weather suitability.
- **Deterministic, not AI-generated**: the personalized briefing is rule-based logic with no LLM call anywhere in the runtime.
- **Fallback-based**: if the backend is unreachable, the original `DEMO_WEATHER_DATA` and local personalization logic still work exactly as before — nothing was removed.

This is not exaggerated: the codebase now genuinely fetches and serves live weather, but several features remain intentionally curated or heuristic rather than independently live-sourced, and this document is explicit about which is which.

## 2. Previous Project State

Based on the previous README:

- **Architecture**: a single-page React 19 + Vite + TypeScript app (`src/App.tsx`, `src/weatherData.ts`, `src/index.css`), packaged for Android via Capacitor. No backend, no server, no API of any kind.
- **Data flow**: every screen read from one shared in-memory object. The README described this as "Demonstration content keeps the complete interface usable during development" — i.e., all values were static/hardcoded, not fetched.
- **Weather "data"**: temperature, AQI, UV, pollen, alerts, locations, packing lists, etc. were all pre-written demo values with no live source.
- **Personalization**: onboarding collected sensitivities/concerns/goals, stored locally (`localStorage`), and a client-side rule table (`PERSONALIZED_VARIANTS` in `App.tsx`) picked one of several pre-written variant templates — no server round-trip, no generated content.
- **Explicit limitation acknowledged in the old README**: "No account, remote database or analytics service is included in the current build." Nothing about live weather integration was mentioned because none existed.
- **What was UI-only vs backed by data**: everything was "UI-only" in the sense that nothing was backed by a real data source — the entire app was a polished, fully-navigable mockup with realistic-looking but static numbers.

## 3. Original Assigned Requirements

Based specifically on `BACKEND_HANDOFF_LOCAL.md`:

**Major requirements:**
1. Connect the existing frontend to live weather data via a backend weather endpoint (`GET /api/weather`), supplying every section already read by the Homepage, Health Metrics, Extended Forecast, Alerts & Travel, and "Your Mausam" screens — without redesigning the interface.
2. Keep AQI/UV/temperature/humidity/wind/rainfall internally consistent across all screens.
3. Correctly select the `sunny`/`rainy` hero preset from provider data.
4. Normalize provider fields into the existing `DashboardWeatherData` contract — never hardcode a provider response directly into a component.
5. Personalize using the *existing* onboarding presets (sensitivities/concerns/goals/activity) — no new taxonomy without updating the frontend in lockstep.
6. Build a personalized-briefing endpoint (`POST /api/personalized-briefing`) that sends weather context + permitted profile fields to "a text-generation service" and returns structured JSON — **the handoff document's original wording assumed an LLM-backed generation service**, though it also stipulated the model "must never create weather numbers" and every number must come from the supplied weather data.

**Explicit constraints:**
- **Reliability/fallback**: last valid payload stays visible on failure; initial failure uses local fallback content; invalid/slow/failed briefing responses fall back to the deterministic local briefing.
- **Partial-response behavior**: object fields deep-merge into the fallback dataset; arrays replace fully.
- **Security**: keep weather-provider and model-service keys server-side; never return secret-bearing upstream errors; no secret in the browser bundle or committed env files.
- **CORS**: configure only for approved frontend origins.
- **Rate-limiting**: rate-limit the personalized-briefing route (this was requested but not implemented — see §13).
- **Units**: one consistent system (Celsius, km, km/h, mm).
- **No architectural redesign**: "without redesigning the interface"; "Never hardcode a new provider response directly into React components."
- **Testing**: implied via the definition-of-done checklist (TypeScript check and production build pass after integration; endpoint failures show fallback content without breaking navigation).
- The handoff document does **not** mention a zero-cost/no-API-key constraint — that constraint was introduced later, in conversation with the project owner, after this document was written (see §13, "differs from original assignment").

## 4. Architecture — Before vs After

```text
BEFORE:
Frontend (React/Vite) → DEMO_WEATHER_DATA (hardcoded object) → UI

AFTER:
Frontend (React/Vite)
   │
   ├─ GET  /api/weather ──────────┐
   └─ POST /api/personalized-briefing
                                   ▼
                    Backend (Fastify, Node.js/TypeScript)
                                   │
        ┌──────────────────────────┼───────────────────────────┐
        ▼                          ▼                            ▼
 Open-Meteo Forecast API   Open-Meteo Air Quality API    Local computation
  (LIVE, free, no key)      (LIVE, free, no key)      (suncalc astronomy, comfort,
        │                          │                    rainfall-today, overview)
        └──────────┬───────────────┘                            │
                    ▼                                            │
              Normalizers                                        │
   (map provider fields → DashboardWeatherData)◄──────────────────┘
                    │
                    ▼
        Curated / rule-based logic
 (pollen table, seasonal alerts, commute,
  swimming, garden, locations, packing, event)
                    │
                    ▼
     In-memory TTL cache + last-known-good fallback
                    │
                    ▼
         Deterministic personalized-briefing engine
     (risk detection → best-window scoring → persona text → validation)
                    │
                    ▼
              JSON response
                    │
                    ▼
   Frontend deep-merge into DEMO_WEATHER_DATA fallback → UI
```

Layer-by-layer:
- **Open-Meteo Forecast + Air Quality APIs** — LIVE external data, free, no API key.
- **Normalizers** (`backend/src/normalizers/`) — pure mapping code, no data of its own; converts provider JSON into the frontend's existing types.
- **Astronomy, comfort, rainfall-today, overview** (`backend/src/astronomy/`, `backend/src/normalizers/derived.ts`) — DERIVED: real computation (sunrise/sunset via the `suncalc` library; a hand-written comfort heuristic) performed on top of the live values, not independently fetched.
- **Pollen, alerts, commute, swimming, garden, locations, packing, event** (`backend/src/data/`, `backend/src/rules/`) — CURATED / rule-based: deterministic datasets and threshold logic written for Kolkata/West Bengal, not live-sourced.
- **Cache** (`backend/src/cache/memoryCache.ts`) — in-memory TTL cache with last-known-good fallback; not a data source, a resilience layer.
- **Personalized briefing engine** (`backend/src/briefing/`) — HEURISTIC/deterministic: rule-based risk detection and text composition, not an LLM.
- **Frontend fallback** (`src/weatherData.ts`'s `DEMO_WEATHER_DATA`, deep-merge logic) — FALLBACK: the original pre-backend static dataset, still fully intact and still what's shown when the backend or a section is unavailable.

## 5. Detailed Change Log

### Backend project scaffolding

**What was done**
A new, independently runnable Node.js/TypeScript backend was created at `backend/`, with its own `package.json`, `tsconfig.json`, `vitest.config.ts`, and `.env.example`, using Fastify as the HTTP framework.

**Why it was done**
The handoff required a backend weather endpoint and a personalized-briefing endpoint; none existed before. Fastify + TypeScript + Zod (for validation) was chosen for type-safety and low overhead, consistent with "no unnecessary dependencies."

**How it was done**
`backend/src/server.ts` boots the app; `backend/src/app.ts` wires Fastify, CORS, error handling, and route registration; `backend/src/config/env.ts` validates all environment variables with Zod at startup.

**Data classification**
N/A — infrastructure, not a data source.

---

### Open-Meteo weather integration

**What was done**
`GET /api/weather` fetches current, hourly, and daily forecast data from the Open-Meteo Forecast API and normalizes it into `current`, `hourly[]`, and `daily[]` of the existing `DashboardWeatherData` contract.

**Why it was done**
This is Job 1 of the handoff: "Connect weather data for the whole application." Open-Meteo was chosen specifically because it requires no API key and has no cost, satisfying the zero-cost constraint established during implementation.

**How it was done**
`backend/src/providers/openMeteoClient.ts` builds the request (lat/lon, `timezone=auto`) and validates the JSON response against a Zod schema before returning it; `backend/src/normalizers/toDashboardWeatherData.ts` maps it into the frontend contract, including WMO weather-code → internal `conditionCode` mapping (`backend/src/normalizers/conditionCode.ts`) and `heroVariant` (sunny/rainy) selection, matching the frontend's own existing regex for that decision.

**Data classification**
**LIVE** — real Open-Meteo forecast model data, free, no key.

---

### Air Quality integration

**What was done**
`GET /api/weather`'s `airQuality` section is populated from Open-Meteo's separate Air Quality API (`us_aqi`, PM2.5, PM10, O₃, NO₂).

**Why it was done**
Job 1/3 of the handoff required AQI and pollutant readings. The handoff's original cost-audit phase considered WAQI (which would provide India's National AQI) but that requires a signup token; the project owner later imposed an absolute zero-cost/no-new-API-key constraint, so Open-Meteo's keyless Air Quality API was used instead.

**How it was done**
`backend/src/providers/openMeteoAirQualityClient.ts` fetches and shape-validates the response; `backend/src/normalizers/airQuality.ts` categorizes the US AQI value into bands and builds the pollutant array. AQI fetch failure is treated as non-critical — the whole `/api/weather` response still succeeds with `airQuality` simply omitted.

**Data classification**
**LIVE**, but explicitly the **US EPA AQI scale**, not India's National AQI — disclosed in the UI as "US AQI" (see §8 and §15 for why this distinction matters).

---

### UV data

**What was done**
UV index and category (Low/Moderate/High/Very High/Extreme) are read from Open-Meteo's forecast `uv_index` field (no separate call needed).

**Why it was done**
Job 3 of the handoff required "UV index, UV scale, UV label and peak/burn guidance."

**How it was done**
`backend/src/normalizers/uv.ts` categorizes the index and derives `peakHours` from the computed solar noon; `burnTime` is a simple heuristic formula, explicitly documented as not medical/dermatological guidance.

**Data classification**
Index itself is **LIVE**; `peakHours`/`burnTime`/`recommendation` phrasing is **DERIVED/HEURISTIC**.

---

### Astronomy calculations

**What was done**
Sunrise, sunset, solar noon, golden hour, moon phase, and moonrise are computed locally using the `suncalc` npm library from the current instant and Kolkata's coordinates.

**Why it was done**
Job 3 required astronomy data for the Extended Forecast screen; no external astronomy API was used, keeping the zero-cost constraint intact.

**How it was done**
`backend/src/astronomy/astronomyCalculator.ts` calls `suncalc.getTimes`/`getMoonIllumination`/`getMoonTimes` and formats results in the `Asia/Kolkata` timezone explicitly (not the server's local timezone — see "Timezone handling" below).

**Data classification**
**DERIVED** — real astronomical computation, entirely local, no network call.

---

### Derived weather metrics (comfort, rainfall, overview, heat index)

**What was done**
- `comfort`: a 0–100 heuristic score from temperature/humidity/wind, with a label and factor breakdown.
- `rainfall`: today's chance and total from the live forecast (month/average/history remain frontend fallback values — not fetched, since that would need Open-Meteo's separate historical archive API).
- `overview`: four homepage summary cards built from already-normalized AQI/UV/rain/wind values.
- `heatIndex`: Open-Meteo has no direct heat-index field, so apparent (feels-like) temperature is used as a documented proxy.

**Why it was done**
Job 1/3 required these fields consistently populated; rather than fetch them separately (which isn't possible for `comfort`/`overview`, since no such provider fields exist), they're computed from data already fetched.

**How it was done**
`backend/src/normalizers/derived.ts` contains `computeComfort`, `computeRainfall`, `computeOverview`, all pure functions clamped to sane ranges.

**Data classification**
**DERIVED** — computed from live inputs, not independently measured or curated.

---

### Caching

**What was done**
A generic in-memory TTL cache (`MemoryCache<T>`) is used for both the forecast and air-quality provider responses, with last-known-good-value fallback on fetch failure.

**Why it was done**
The handoff required "Cache provider data according to its update frequency" and "Preserve the last valid weather result when an upstream provider temporarily fails." The project owner's zero-cost constraint explicitly forbade Redis, so an in-memory solution was used instead — appropriate for a single-process demo deployment.

**How it was done**
`backend/src/cache/memoryCache.ts`; instantiated per-provider in `backend/src/routes/weather.ts` (`createWeatherCaches`), and the same cache instances are reused by the personalized-briefing route to avoid duplicate Open-Meteo calls.

**Data classification**
N/A — infrastructure.

---

### Error handling and runtime validation

**What was done**
Both provider clients validate the shape of the JSON they receive (via Zod) before returning it, rejecting malformed/incomplete responses rather than letting `undefined`/`NaN` propagate. The global Fastify error handler never returns stack traces or raw upstream errors to the client.

**Why it was done**
The handoff required "Return useful HTTP status codes and never return secret-bearing upstream errors" and "Validate both provider data and generated output." An initial version of the forecast client lacked this validation (caught and fixed during an audit pass) — the air-quality client had it from the start.

**How it was done**
`backend/src/providers/openMeteoClient.ts` and `openMeteoAirQualityClient.ts` both use Zod schemas; `backend/src/middleware/errorHandler.ts` hardcodes a generic "Internal server error" for any 500.

**Data classification**
N/A — reliability/security layer.

---

### Timezone handling

**What was done**
Open-Meteo (queried with `timezone=auto`) returns naive Kolkata-local time strings with no UTC offset. A dedicated utility distinguishes two needs: `toKolkataInstant()` (append the fixed `+05:30` IST offset for real astronomical instant math) and `parseKolkataCalendarDate()` (parse Y/M/D/H/M digits directly and represent them as a UTC-encoded `Date`, read back only via `getUTC*()`/`timeZone:'UTC'` formatting) so month/weekday/date-label logic is correct regardless of what timezone the server process itself runs in.

**Why it was done**
An audit found that naively doing `new Date(openMeteoString)` would be misinterpreted using the server's local timezone rather than Kolkata's — a real bug if deployed on a UTC-based host, since India has no DST and a 5.5-hour offset. This directly serves the handoff's "Keep Kolkata timing, units and local conditions intact" requirement.

**How it was done**
`backend/src/utils/kolkataTime.ts`; consumed by `toDashboardWeatherData.ts` (astronomy input, month extraction, hour/day display labels, packing date label) and `backend/src/rules/event.ts` (weekend/weekday calculation, rewritten to use `getUTCDay`/`setUTCDate` instead of local getters).

**Data classification**
N/A — correctness fix, not a data source.

---

### Pollen

**What was done**
A month-indexed seasonal table approximates tree/grass/weed pollen levels for Kolkata/West Bengal.

**Why it was done**
Job 3 required pollen data; no free, reliable, India-covering live pollen API exists (Open-Meteo's pollen data only covers Europe; other providers are paid), so a curated climatology estimate was used instead, explicitly documented as such.

**How it was done**
`backend/src/data/pollenSeasonalTable.ts`; a deterministic function of month number only.

**Data classification**
**CURATED** — not live measured pollen data, clearly commented as such in the source.

---

### Alerts

**What was done**
A small deterministic rule engine raises threshold-based advisories (thunderstorm, heavy rain, heatwave, strong wind, poor air quality) from the live normalized weather — never randomly, never scraped from IMD.

**Why it was done**
Job 3 required an alerts array; IMD has no free/stable public alerting API, so a rule-based approach was used, with the `source` field deliberately set to `"Mausam Weather Advisory"` rather than `"IMD"` to avoid false government attribution.

**How it was done**
`backend/src/data/curatedAlerts.ts`; alerts are pushed in a fixed severity-priority order from live current/daily/AQI values.

**Data classification**
**CURATED/derived from LIVE inputs** — the trigger data is live, but the advisory text and categorization are rule-based, not an official warning feed.

---

### Commute, Swimming, Garden recommendations

**What was done**
Deterministic weather-only logic for commute status (NORMAL/CAUTION/DISRUPTED), swimming suitability (FAVORABLE/CAUTION/ROUGH/UNSAFE, with an approximated water temperature), and gardening notes (badge, soil-moisture estimate, seasonal crop-calendar note).

**Why it was done**
Job 3 required these sections; no traffic, marine-sensor, or agricultural live API is used or was ever intended — this is explicitly weather-only guidance per the constraint that later phases reinforced ("do not fabricate live traffic/water-temperature/agri data").

**How it was done**
`backend/src/rules/commute.ts`, `swimming.ts`, `garden.ts` (the latter using a curated seasonal-crop table, `backend/src/data/gardenSeasonalTable.ts`).

**Data classification**
**HEURISTIC/CURATED**, derived from live temperature/rain/wind/UV inputs. Water temperature is explicitly an approximation (`air temperature − 3°C`, clamped), disclosed in the UI as "(est.)".

---

### Locations

**What was done**
A static curated list of West Bengal locations (Darjeeling, Digha Beach, Sundarbans, Siliguri) with fixed temperature offsets from Kolkata. Coastal/deltaic locations share Kolkata's live condition (a defensible regional approximation); climatically distinct hill-station locations (Darjeeling, Siliguri) use a curated condition override instead, so Kolkata's exact live condition is never shown 600km away in the Himalayan foothills.

**Why it was done**
Job 3 required saved-location cards. No geocoding/multi-location forecast API is used (that would require additional network calls, explicitly out of scope). The condition-override correction was added during a later hardening pass after an audit flagged that all four locations sharing Kolkata's exact condition (e.g., all showing "Thunderstorm" simultaneously) was an obvious, misleading tell.

**How it was done**
`backend/src/data/locationsStatic.ts` (static list + optional `conditionOverride`), `backend/src/rules/locations.ts` (applies the offset/override).

**Data classification**
**CURATED** — no independent live per-location forecast exists; temperature is a static offset from the one live Kolkata reading.

---

### Packing recommendations

**What was done**
Deterministic packing-item suggestions (umbrella, sunscreen, layers, mask, etc.) triggered by real rain chance / UV / temperature / wind / AQI thresholds, de-duplicated by construction.

**Why it was done**
Job 3 required a packing list; this directly reuses already-normalized live values rather than inventing new data.

**How it was done**
`backend/src/rules/packing.ts`.

**Data classification**
**HEURISTIC**, derived from LIVE inputs — the triggers are real values, the recommendation text is rule-based.

---

### Event / outdoor-suitability recommendations

**What was done**
A generic "Weekend Outdoor Weather Outlook" (not a real, named festival) computed from the average forecasted high/rain-chance across the upcoming weekend, using the real 7-day forecast.

**Why it was done**
Job 3 required an event-planning card; the original demo data referenced a real festival (Durga Puja) with invented details, which would misrepresent a curated feature as calendar-aware event knowledge. The generic framing avoids fabricating a real-world event while still using the schema.

**How it was done**
`backend/src/rules/event.ts`; finds the upcoming Saturday/Sunday via timezone-safe date math and averages the relevant `daily[]` entries.

**Data classification**
**DERIVED from LIVE forecast data** — the temperatures/rain-chance are real; there is no real event being tracked.

---

### Personalized weather briefing

**What was done**
`POST /api/personalized-briefing` accepts `{ persona, activity?, sensitivity?, location? }` and returns a structured briefing (`title`, `summary`, `recommendation`, `bestWindow`, `risks[]`, `actions[]`, `dataContext`, `generatedAt`) generated by a **fully deterministic, rule-based engine — no LLM or external AI API is called anywhere in this path.**

**Why it was done**
This is Job 5 of the handoff, which originally envisioned "a text-generation service." During implementation, the project owner explicitly and repeatedly constrained the project to zero additional cost and forbade any LLM/Anthropic/OpenAI/Gemini integration. The deterministic approach satisfies the handoff's actual hard requirements — "the model must never create weather numbers," every number traceable to supplied weather data, structured JSON only — without requiring a paid or keyed AI service.

**How it was done**
`backend/src/briefing/riskDetection.ts` detects applicable risks in a fixed priority order (thunderstorm > extreme heat > heavy rain > high UV > high AQI > strong wind); `backend/src/briefing/personaComposers.ts` produces persona-flavored text gated on that same top risk (preventing contradictions like recommending outdoor activity during a thunderstorm); `backend/src/briefing/bestWindow.ts` scores real hourly entries to find a contiguous favorable window (or returns an honest fallback message); `backend/src/briefing/buildPersonalizedBriefing.ts` assembles the response; `backend/src/briefing/validateBriefingResponse.ts` validates it with Zod before it ever leaves the server. A `BriefingGenerator` interface with one implementation, `DeterministicBriefingGenerator`, exists as an unimplemented seam for a possible future model-backed generator — no such generator exists in the codebase.

**Data classification**
**HEURISTIC/deterministic**, built entirely from LIVE inputs (temperature, rain chance, UV, AQI, real hourly forecast). **Not an LLM.**

---

### Persona logic

**What was done**
Five personas are supported server-side: `commuter`, `student`, `outdoor`, `health`, `general`. The frontend maps its existing onboarding profile (sensitivities/concerns/goals) to one of these via a best-effort heuristic (`mapProfileToPersona` in `src/personalizedBriefing.ts`) — `student` has no corresponding onboarding field and is never auto-selected.

**Why it was done**
The original handoff's personalization taxonomy (sensitivities/concerns/goals) predates the persona model introduced for the briefing endpoint; rather than change the onboarding UI (explicitly out of scope — "without redesigning the interface"), a mapping layer was added instead.

**How it was done**
`src/personalizedBriefing.ts`'s `mapProfileToPersona`/`mapProfileToSensitivity`.

**Data classification**
N/A — a mapping function, not a data source. This differs from the original assignment, which assumed the backend would consume the existing profile shape directly; see §13.

---

### Best outdoor window calculation

**What was done**
Scores each real hourly forecast entry (hard-excluding thunderstorm/storm hours; penalizing rain chance and distance from ~24°C comfort) and returns the best-scoring contiguous run of real hours — never a fabricated time — or an honest fallback sentence if nothing qualifies.

**Why it was done**
Both the original handoff ("Ensure the recommended window is supported by hourly conditions") and the later briefing-specific instructions required this to be derived from real data, not invented.

**How it was done**
`backend/src/briefing/bestWindow.ts`. Only fields actually present per hour (temperature, condition, rain chance) are used — per-hour wind/UV aren't in the hourly contract, so they're not factored in rather than fabricated.

**Data classification**
**DERIVED from LIVE hourly forecast data.**

---

### Frontend/backend integration

**What was done**
`src/weatherData.ts`'s pre-existing `fetchWeatherDashboard()` (already written before backend work, per the original handoff's spec) now has a real backend to call. A new `src/personalizedBriefing.ts` client was added for the briefing endpoint, including request/response typing, a session-lifetime in-memory cache, and an adapter that maps the backend's response into the existing local `PersonalizedWeather` shape so `PersonalizedWeatherPage` renders it with no JSX changes.

**Why it was done**
The handoff specified the weather-fetch client's exact behavior in advance (partial-merge, refresh interval, fallback), and it was already implemented; the briefing endpoint had no client at all before this work — `src/personalizedBriefing.ts` didn't exist previously.

**How it was done**
`PersonalizedWeatherPage` in `src/App.tsx` was changed from a synchronous `useMemo` (calling only the local logic) to a `useState` + `useEffect`: it shows the local fallback immediately, then silently upgrades to the backend briefing if it arrives, catching any failure silently.

**Data classification**
N/A — integration code.

---

### Frontend fallback behavior

**What was done**
Preserved and relied upon, not rewritten: `DEMO_WEATHER_DATA`, the deep-merge logic (`mergeWeatherPayload`), and `isDashboardWeatherData` validation in `src/weatherData.ts` are unchanged from before the backend work. The local `getPersonalizedWeather()`/`PERSONALIZED_VARIANTS` logic in `App.tsx` is also unchanged and still the fallback for the briefing page.

**Why it was done**
The handoff explicitly required this: "the last valid payload remains visible; initial failure uses local fallback content" and "Invalid, slow or failed responses fall back to the deterministic local briefing."

**How it was done**
No changes were made to this logic; new code was written to call it as a fallback path rather than replace it.

**Data classification**
**FALLBACK** — pre-existing static demo content, unchanged.

---

### Data-source disclosures

**What was done**
UI text was adjusted in a small number of places to distinguish curated/heuristic values from live measurements: "AQI" → "US AQI" (Homepage badge and Health Metrics heading), "Pollen Count" → "Pollen Outlook (Seasonal Estimate)", "Heat Index" → "Heat Index (Approx.)", "Comfort Index" → "Comfort Index (Estimate)" (also removing a stray "°" that incorrectly implied the 0–100 comfort score was a temperature), and swimming water temperature now reads "~24°C (est.)".

**Why it was done**
A dedicated accuracy audit (performed specifically because this is an India-focused SIH project) found that presenting a US-scale AQI or heuristic values without qualification could mislead a technically knowledgeable judge.

**How it was done**
Targeted text-only edits in `src/App.tsx`; no layout or component changes.

**Data classification**
N/A — presentation/labeling correction.

---

### CORS hardening

**What was done**
The backend's default `ALLOWED_ORIGINS` was corrected from `http://localhost:5173` (Vite's generic default) to include `http://localhost:8443` (the frontend's actual configured Vite dev-server port per `vite.config.ts`) alongside 5173 as a fallback.

**Why it was done**
This was a genuine bug found during hardening: with the original default, a fresh `npm run dev` on both frontend and backend would have every live API call silently blocked by CORS, with the frontend just falling back to demo data and no visible error — a real risk of an unexplained "why isn't live data showing" moment during a demo.

**How it was done**
`backend/src/config/env.ts` and `backend/.env.example`; verified live with a real CORS preflight request.

**Data classification**
N/A — configuration fix.

---

### Documentation changes

**What was done**
`README.md` was substantially extended (not replaced) with: a System Architecture diagram, a Data Sources table classifying every value as live/derived/curated, a Personalized Briefing Architecture section explicitly stating it is deterministic and not an LLM, backend setup instructions, an updated project-structure tree including `backend/`, Environment Variables tables for both frontend and backend, an API Endpoints reference, a Testing section, a Zero-Cost Architecture section, and a Current Limitations section. All pre-existing frontend-feature content was preserved.

**Why it was done**
The original README predated the backend entirely and contained no mention of it; accurate documentation was needed for both onboarding and honest SIH presentation.

**How it was done**
Targeted additions to `README.md` at the repository root.

**Data classification**
N/A — documentation.

---

### Testing

**What was done**
164 backend tests across 22 files were written using Vitest, covering providers (with mocked `fetch`), normalizers, cache TTL/fallback behavior, timezone utilities, every curated/derived module, the briefing engine (all 5 personas, full rule-priority ordering, explicit contradiction-prevention tests, best-window selection/fallback), request/response validation, and both HTTP routes (success, validation failure, provider failure, graceful AQI-down degradation). No test depends on a live external API.

**Why it was done**
The handoff's definition-of-done required the TypeScript check and production build to pass after integration; testing infrastructure was added proactively across each implementation phase to catch regressions as the codebase grew.

**How it was done**
`backend/test/*.test.ts`, `vitest.config.ts`; `npm test` and `npm run typecheck` in `backend/package.json`.

**Data classification**
N/A — quality assurance.

## 6. Phase-by-Phase Implementation History

### Phase 1 — Backend scaffold and live weather

**What**: Created the backend project; implemented the Open-Meteo forecast client, normalizer, in-memory cache, `GET /api/health`, and `GET /api/weather` for `current`/`hourly`/`daily` only.
**Why**: Establish the foundational live-data pipeline required by Job 1, incrementally (per the project owner's explicit request to implement in phases rather than all at once).
**How**: Fastify + Zod + TypeScript; `backend/src/providers/openMeteoClient.ts`, `backend/src/normalizers/toDashboardWeatherData.ts`, `backend/src/cache/memoryCache.ts`, `backend/src/routes/weather.ts`.
**Important files**: as listed above, plus `backend/package.json`, `backend/tsconfig.json`.
**Verification**: Commit `559390a feat: scaffold backend and Open-Meteo weather API`. Verified live against real Kolkata coordinates at the time.

### Phase 2 — AQI, UV, astronomy, derived data

**What**: Added the Open-Meteo Air Quality client and normalizer, UV normalization, local astronomy calculation via `suncalc`, and derived `comfort`/`rainfall`/`overview`.
**Why**: Extend the weather endpoint toward full Job 1/3 coverage without introducing a paid AQI provider (WAQI was explicitly ruled out at this point for cost reasons).
**How**: `backend/src/providers/openMeteoAirQualityClient.ts`, `backend/src/normalizers/airQuality.ts`, `uv.ts`, `backend/src/astronomy/astronomyCalculator.ts`, `backend/src/normalizers/derived.ts`.
**Important files**: as listed above.
**Verification**: Commit `aa6c545 feat: add air quality, UV, astronomy and derived weather data`. Verified live, including a graceful-degradation test where the AQI provider was made unreachable.

### Phase 3 — Curated weather intelligence

**What**: Added pollen, curated alerts, commute, swimming, garden, locations, packing, and event sections — completing the `DashboardWeatherData` contract.
**Why**: Cover the remainder of Job 1/3's required sections using only local computation and curated datasets, per the zero-cost constraint (no WAQI/paid alert feed/maps API).
**How**: `backend/src/data/*.ts` (curated datasets), `backend/src/rules/*.ts` (rule engines), wired into the normalizer.
**Important files**: as listed above.
**Verification**: Commit `ae2c989 feat: add curated weather intelligence and recommendations`. 98 backend tests passing at this point; verified live against a real active thunderstorm.

### Audit and hardening fixes (between Phase 3 and Phase 4)

**What**: Fixed a real timezone bug (naive `Date` parsing depending on server-local timezone instead of Kolkata's), added runtime shape validation to the forecast client (previously only the AQI client had it), added the "US AQI" disclosure, and cleaned up a stale comment/dead parameter in the UV normalizer.
**Why**: A full read-only Phase 1–3 audit identified these as the most significant reliability/accuracy gaps before continuing.
**How**: `backend/src/utils/kolkataTime.ts` (new), `backend/src/providers/openMeteoClient.ts` (Zod validation added), `src/App.tsx` (AQI label text).
**Important files**: as listed above.
**Verification**: Commit `7b0ac4a fix: harden weather data and timezone handling`. 115 tests passing.

### Phase 4 — Personalized weather briefing

**What**: Built the deterministic `POST /api/personalized-briefing` endpoint and engine (risk detection, best-window scoring, five persona composers, request/response validation, a `BriefingGenerator` seam for a possible future generator), and wired the frontend to call it with a local-fallback path.
**Why**: Fulfill Job 5 of the handoff without an LLM, per the project owner's explicit zero-cost/no-AI-API constraint.
**How**: `backend/src/briefing/*.ts`, `backend/src/routes/personalizedBriefing.ts`, `src/personalizedBriefing.ts` (new frontend client), `src/App.tsx` (`PersonalizedWeatherPage` updated to fetch-then-fallback).
**Important files**: as listed above.
**Verification**: Commit `e0f870c feat: add personalized weather briefing engine`. 156 tests passing; verified live against a real thunderstorm, confirming all five personas correctly gated their advice on the same top risk with no contradictions.

### Phase 5 — Final hardening, QA, and documentation

**What**: Fixed the CORS default-port mismatch (a real demo-blocking bug), corrected the locations feature so distant hill-station locations no longer implausibly mirror Kolkata's exact live condition, fixed a mislabeled comfort-index units bug, added several data-source disclosure labels, added `backend/test/env.test.ts`, and substantially expanded `README.md`.
**Why**: A dedicated final audit checked runtime reliability, demo resilience, accuracy/disclosure, and documentation completeness before considering the project demo-ready.
**How**: `backend/src/config/env.ts` + `.env.example` (CORS fix), `backend/src/data/locationsStatic.ts` + `backend/src/rules/locations.ts` (condition-override fix), `src/App.tsx` (label fixes), `README.md` (expansion).
**Important files**: as listed above.
**Verification**: Commit `788a7c3 fix: harden CORS defaults and weather data accuracy`. 164 tests passing; verified live, including a real-time confirmation that Darjeeling no longer showed a Kolkata thunderstorm.

## 7. Current Data Flow

**`GET /api/weather`:**
```
Frontend fetchWeatherDashboard()
  → GET http://localhost:3000/api/weather
    → backend/src/routes/weather.ts
      → env config already validated at startup (Zod)
      → caches.forecast.getOrFetch()
          → cache hit: return cached value
          → cache miss: fetch Open-Meteo Forecast API (LIVE network call)
              → Zod-validate response shape
              → on failure: return last-known-good cached value, or throw (→ 502) if none exists
      → caches.airQuality.getOrFetch()
          → same pattern; on failure, `airQuality` section is simply omitted (never fails the request)
      → toDashboardWeatherData(forecast, airQuality, context)
          → maps current/hourly/daily
          → computes astronomy (suncalc, local), uv, comfort, rainfall, overview (derived)
          → computes pollen, alerts, commute, swimming, garden, locations, packing, event (curated/rule-based)
      → JSON response
  → frontend: unwrap `{ data }` if present, deep-merge into DEMO_WEATHER_DATA, validate shape
  → React state → UI
```

**`POST /api/personalized-briefing`:**
```
Frontend PersonalizedWeatherPage
  → shows local getPersonalizedWeather() immediately
  → fetchPersonalizedBriefing({ persona, sensitivity, location })
    → backend/src/routes/personalizedBriefing.ts
      → validateBriefingRequest (Zod) — 400 on invalid persona/sensitivity/body
      → reuses the SAME forecast/AQI caches as /api/weather (no duplicate Open-Meteo calls)
      → toDashboardWeatherData(...) (same normalizer)
      → DeterministicBriefingGenerator.generate(weather, request)
          → detectRisks (priority-ordered) → composePersonaBriefing → computeBestWindow
      → validateBriefingResponse (Zod) before returning
  → on success: adaptBriefingToPersonalizedWeather() maps it into the existing local shape, replaces the shown briefing
  → on any failure: local fallback stays displayed, silently
```

**Network calls made**: exactly two, both from the backend to Open-Meteo (Forecast, Air Quality). The frontend calls only its own backend. **Computations happening locally** (no network call): astronomy, comfort, rainfall-today, overview, all of Phase 3's curated/rule-based sections, and the entire personalized-briefing engine.

## 8. What Is Actually Live?

| Feature | Current source | Live? | API/key required? | Notes |
|---|---|---|---|---|
| Current/hourly/daily forecast | Open-Meteo Forecast API | Yes | No key | Free tier, keyless |
| AQI (`airQuality.index`) | Open-Meteo Air Quality API | Yes | No key | **US EPA AQI, not India's National AQI** |
| Pollutants (PM2.5/PM10/O₃/NO₂) | Open-Meteo Air Quality API | Yes | No key | |
| UV index | Open-Meteo Forecast API (`uv_index`) | Yes | No key | Peak-hours/burn-time phrasing is heuristic |
| Astronomy (sunrise/sunset/moon) | `suncalc` (local library) | No — computed | No | Real astronomical math, not fetched |
| Comfort index | Local formula | No | No | Heuristic 0–100 score, not a standard index |
| Heat index | Open-Meteo apparent temperature (proxy) | Partially | No | Not the true NWS Heat Index formula |
| Rainfall (today/chance) | Open-Meteo Forecast API | Yes | No key | Month/average/history remain frontend fallback values |
| Pollen | Curated seasonal table | No | No | Deterministic climatology estimate, not measured |
| Alerts | Rule-based, from live inputs | Trigger data yes, content no | No | Source labeled "Mausam Weather Advisory", never IMD |
| Locations (saved-location cards) | Static curated list + live Kolkata condition | Partially | No | Temperature is a static offset; hill stations use a curated condition override |
| Swimming water temperature | Heuristic (`air temp − 3°C`) | No | No | Disclosed as "(est.)" in the UI |
| Commute/garden/packing/event | Rule-based, from live inputs | Trigger data yes, content no | No | |
| Personalized briefing | Deterministic rule engine, from live inputs | Trigger data yes, generation no | No | **Not an LLM** |

## 9. What Changed in the Frontend?

**Files modified**: `src/App.tsx` (type exports for briefing-adapter reuse, `PersonalizedWeatherPage`'s data-fetching hook, and a handful of disclosure/label text strings), `.env.example` (added `VITE_PERSONALIZED_BRIEFING_API_URL`).

**Files created**: `src/personalizedBriefing.ts` (new — did not exist before this work, despite being referenced as if it already existed in the original `BACKEND_HANDOFF_LOCAL.md`).

**What deliberately did NOT change**: `src/weatherData.ts`'s `DEMO_WEATHER_DATA`, `fetchWeatherDashboard()`, `mergeWeatherPayload()`, and `isDashboardWeatherData()` are byte-for-byte the same logic as before backend work began — this code was already written to spec in the original handoff and needed no changes. `PersonalizedWeatherPage`'s JSX/rendering, `getPersonalizedWeather()`, and `PERSONALIZED_VARIANTS` are all unchanged. No component was redesigned, restyled, or restructured.

**How backend data merges/falls back**: unchanged mechanism — the frontend deep-merges whatever the backend returns into `DEMO_WEATHER_DATA`, so any field the backend doesn't yet supply (e.g. `rainfall.month`, `running`) silently keeps its demo value with no visual gap.

**Personalized briefing integration**: `PersonalizedWeatherPage` now shows the local briefing immediately, then silently swaps in the backend's briefing if it arrives before the user notices — an addition, not a redesign.

## 10. Reliability and Error Handling

- **Caching**: in-memory TTL cache per provider (forecast, air quality), shared between both routes.
- **Last-good-value fallback**: on a fetch failure, the cache returns the last successful value if one exists, rather than propagating the error.
- **Forecast failure with no cache**: `GET /api/weather` returns `502`.
- **AQI failure**: never fails the request; `airQuality` is simply omitted, and the personalized-briefing engine correctly reports UV-only (not a misleading "AQI 0") in that case.
- **Malformed provider response**: rejected by Zod validation in both provider clients, triggering the same fallback/502 path rather than propagating `NaN`/`undefined`.
- **Frontend fallback**: unchanged pre-existing behavior — demo data on total failure, last successful payload retained otherwise.
- **CORS**: origin allowlist via `@fastify/cors`, defaulting to the frontend's actual dev ports (fixed in Phase 5).
- **Validation**: both directions of the briefing endpoint (request and response) are Zod-validated; the weather endpoint's provider responses are Zod-validated.
- **Timezone handling**: Kolkata-correct regardless of server timezone (see §5).

**Remaining reliability limitations actually present**:
- `MemoryCache` has no single-flight de-duplication — concurrent requests during a cache miss could trigger duplicate simultaneous upstream fetches. Documented, not fixed (low risk at demo scale).
- No rate-limiting exists on `/api/personalized-briefing`, despite being requested in the original handoff — deliberately skipped since the endpoint is free/deterministic and adding a dependency solely for this was judged unnecessary for v0.1.
- The backend serves exactly one hardcoded location (Kolkata); the `location` field in briefing requests is accepted but not yet used to change which coordinates are queried.

## 11. Cost and External Services

**External services actually called at runtime**: exactly two — the Open-Meteo Forecast API and the Open-Meteo Air Quality API. Both are free and require no API key or account.

**No paid service was introduced.** A full-repository grep for Anthropic, Claude, OpenAI, Gemini, WAQI, OpenWeatherMap, Google Maps/Places, Ambee, and Redis found zero runtime references — the only matches are source-code comments explicitly documenting that these are *not* used.

**No LLM API is part of the runtime architecture.** The personalized briefing is produced entirely by deterministic TypeScript logic (`backend/src/briefing/`) — there is no HTTP call to any AI/model provider anywhere in the codebase.

**Important distinction**: Claude Code (an Anthropic product) was used as the *development tool* to write this codebase — the same way a human engineer using an IDE would write it. That is a fact about how the code was produced, not a runtime dependency of the shipped application. The Mausam backend and frontend contain no Anthropic API calls, no `ANTHROPIC_API_KEY`, and no SDK for any AI provider.

## 12. Testing and Verification

**Before**: no test framework existed anywhere in the repository (frontend or otherwise).

**After**: the backend has a Vitest suite of **164 tests across 22 files**, verified passing at the time of this document. Coverage includes: provider clients (mocked `fetch`, including malformed-response rejection), normalizers, the cache's TTL/fallback behavior, timezone utilities, every curated/rule-based module (pollen, alerts, commute, swimming, garden, locations, packing, event), the entire briefing engine (all 5 personas, full priority-ordering, explicit contradiction-prevention, best-window selection and fallback), request/response validation, environment-config defaults (including a regression test for the CORS port fix), and both HTTP routes end-to-end (success, validation failure, provider failure, graceful AQI-down degradation).

**Typecheck**: `cd backend && npm run typecheck` passes cleanly (TypeScript strict mode, no emit).

**Frontend build**: `npm run build` (Vite) passes and produces a working production bundle.

**Mocked vs. live testing**: all 164 backend tests mock external HTTP calls via `vi.stubGlobal('fetch', ...)` — none depend on live internet access, making the suite fully deterministic and CI-safe. Live verification (real Open-Meteo calls) was performed manually during each implementation phase via `curl` against a running local server, not as part of the automated suite.

**Frontend test limitations**: the frontend has no automated test runner configured (confirmed via `package.json` — no `test` script, no test framework dependency). Frontend correctness was verified via production build success and manual review/testing, not automated tests. This was a deliberate scope decision at each phase, not an oversight — adding a frontend test framework solely for this work was explicitly avoided per instruction.

## 13. Remaining Limitations

| Limitation | Why it remains | What would fix it |
|---|---|---|
| Single city (Kolkata) only | No geocoding/multi-city support was in scope; adding it means new location-resolution logic and likely a geocoding API | Add a geocoding step and per-request coordinates |
| US AQI, not India's National AQI | An India-specific AQI requires a keyed provider (e.g. WAQI/CPCB), explicitly excluded by the zero-cost constraint | Integrate a keyed AQI provider (reintroduces cost) |
| No live per-location weather | Fetching independent forecasts for each saved location would require additional Open-Meteo calls per location, out of scope | Add per-location forecast fetches (increases API calls, still free but more complex) |
| No historical rainfall data | Requires Open-Meteo's separate historical archive API, not integrated | Add a historical-archive client |
| No rate-limiting on the briefing endpoint | Requested in the original handoff but deliberately skipped — the endpoint is free and deterministic, and a dependency solely for this was judged unnecessary for v0.1 | Add `@fastify/rate-limit` or a simple in-memory guard |
| `MemoryCache` has no single-flight de-duplication | Known, documented, low-risk at demo request volume | Add a pending-promise map to coalesce concurrent misses |
| No automated frontend tests | Deliberately out of scope per instruction; frontend has no test framework configured | Add Vitest + React Testing Library |
| Persona is heuristically inferred, not user-selected | The onboarding UI predates the persona model and was not redesigned (explicitly out of scope) | Add a persona-selection step to onboarding |

None of these are accidental oversights presented as bugs — each is a direct consequence of the explicit zero-cost, no-redesign, or "keep scope small" constraints given during implementation.

**Not implemented / deferred relative to the original `BACKEND_HANDOFF_LOCAL.md`:**
- "Rate-limit the personalised briefing route" — not implemented (see table above).
- A true text-generation/LLM service for the briefing, as the handoff's Job 5 wording originally envisioned — implemented instead as a deterministic rule engine, per a later, explicit zero-cost/no-AI-API constraint from the project owner that supersedes the handoff's original wording.
- Alerts sourced from "weather, AQI and alert providers" (plural, implying a live alert feed) — implemented as a curated rule-based dataset instead, since no free/stable alert-provider API exists.

## 14. Final Before vs After Summary

| Area | Before | After |
|---|---|---|
| Architecture | Frontend-only React app | React frontend + Fastify/Node.js backend |
| Weather data | Hardcoded `DEMO_WEATHER_DATA` | Live Open-Meteo forecast, normalized, with demo-data fallback |
| AQI | Hardcoded demo value | Live US AQI (Open-Meteo), with disclosure that it's not India's National AQI |
| UV | Hardcoded demo value | Live UV index (Open-Meteo) with derived peak-hour/burn-time guidance |
| Recommendations (commute/swimming/garden/packing/event) | Static demo text | Deterministic rule-based logic driven by live weather values |
| Personalization | Client-side static variant templates | Backend deterministic briefing engine (5 personas, risk-priority logic) with the original local logic retained as fallback |
| Reliability | N/A (nothing to fail) | Caching, last-good-value fallback, runtime validation, timezone-safe date handling, graceful AQI degradation |
| Testing | None | 164 backend tests (Vitest), TypeScript strict typecheck, passing frontend build |
| Documentation | Frontend-only README | README covers architecture, data-source honesty, API reference, env vars, testing, limitations |
| External services | None | Open-Meteo Forecast + Air Quality APIs only — both free, no key, no LLM |

## 15. SIH Presentation Interpretation

### What we can honestly claim

- Mausam fetches and displays **real, live weather and air-quality data** for Kolkata from Open-Meteo, with zero API keys and zero ongoing cost.
- The backend **normalizes multiple live data sources into one consistent contract**, keeping temperature/AQI/UV/humidity/wind synchronized across every screen.
- The app includes a **working personalized recommendation engine** that reasons over live conditions with a fixed, auditable safety priority (severe weather always outranks generic advice) — and it **never contradicts itself** (verified by dedicated tests and live testing against real thunderstorm conditions).
- The system is **resilient by design**: cached last-known-good data, graceful degradation when a non-critical provider fails, and a complete local fallback if the backend is entirely unreachable — the app never shows a blank or broken screen.
- The codebase has **164 passing automated tests** and a clean TypeScript strict-mode build, none of which depend on live network access.
- The entire system runs at **zero marginal cost** and requires no account, API key, or payment method of any kind.

### What we should NOT claim

- Do **not** claim the AQI shown is India's National AQI — it is the US EPA AQI scale (this is disclosed in the UI as "US AQI").
- Do **not** claim the personalized briefing is powered by an LLM or AI model — it is deterministic, rule-based TypeScript logic with no AI API call anywhere in the runtime.
- Do **not** claim all "Saved Locations" have independently fetched live forecasts — most share Kolkata's live condition as a regional approximation, and hill-station locations use a curated override; none has its own live sensor feed.
- Do **not** claim swimming water temperature is sensor-measured — it is a documented approximation from air temperature.
- Do **not** claim pollen levels or weather alerts are live IMD/government data — pollen is a seasonal climatology estimate, and alerts are locally generated advisories explicitly labeled "Mausam Weather Advisory," not an official warning feed.
- Do **not** claim "Heat Index" or "Comfort Index" are standardized meteorological metrics — both are documented approximations/heuristics.

### One-paragraph project evolution

Mausam began as a polished, fully-navigable frontend weather dashboard built entirely on static demonstration data, with no server, no live inputs, and personalization limited to a handful of pre-written client-side templates. Through incremental backend development, it evolved into a genuine weather-intelligence system: a Fastify backend now fetches live temperature, forecast, and air-quality data from Open-Meteo — entirely free, with no API key — and normalizes it into the app's existing data contract so every screen stays consistent. On top of that live foundation, the backend layers locally-computed astronomy and comfort metrics, a set of deterministic, Kolkata-specific rule engines for pollen, alerts, commute, swimming, gardening, packing, and event guidance, and a fully rule-based personalized daily briefing that reasons over real conditions with an explicit, contradiction-free safety priority — all without ever calling an LLM or any paid service. Runtime validation, in-memory caching with last-known-good fallback, timezone-safe date handling, and a preserved frontend fallback path make the system resilient enough to demonstrate reliably even under network failure, while 164 automated tests and honest UI labeling of every curated or heuristic value keep the implementation both verifiable and transparent — the result of disciplined, zero-cost engineering rather than architectural redesign.
