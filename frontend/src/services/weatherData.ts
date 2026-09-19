import {
  resolveIconName,
  weatherIconForCondition,
  type IconName,
} from "@/components/icons/iconMap"

export type WeatherHeroVariant = "rainy" | "sunny" | "night"

export type HourlyForecast = {
  time: string
  temperature: number
  condition: string
  conditionCode: string
  icon?: string
  rainChance: number
  isDay?: boolean
}

export type DailyForecast = {
  day: string
  high: number
  low: number
  condition: string
  conditionCode: string
  icon?: string
  rainChance: number
}

// v0.2 location-first architecture: the backend now resolves and returns
// the actual coordinates/place-name/timezone a payload was fetched for,
// plus a real provider-based observation timestamp. Both optional so
// DEMO_WEATHER_DATA and any older/partial payload remain valid.
export type ResolvedLocation = {
  latitude: number
  longitude: number
  locality: string
  region: string
  country: string
  timezone: string
  source: "device" | "manual" | "default"
}

export type DashboardWeatherData = {
  updatedAt: string
  observedAt?: string
  location?: ResolvedLocation
  current: {
    city: string
    region: string
    temperature: number
    feelsLike: number
    condition: string
    conditionCode: string
    heroVariant?: WeatherHeroVariant
    high: number
    low: number
    humidity: number
    windSpeed: number
    windDirection: string
    windGust: number
    visibility: number
    pressure: number
    dewPoint: number
    heatIndex: number
    hydrationAdvice: string
    // v0.2: Open-Meteo's own day/night flag for the current instant —
    // lets the UI avoid showing a daytime icon (e.g. sun) after dark for
    // a "clear" condition. Optional so demo/older payloads stay valid.
    isDay?: boolean
  }
  hourly: HourlyForecast[]
  daily: DailyForecast[]
  overview: Array<{ icon: string; label: string; value: string; tone: string }>
  // Optional (backend-v0.2 handoff §9): when the AQI provider is genuinely
  // unavailable, this is left undefined rather than silently filled with a
  // demo value — the UI must render an explicit "Unavailable" state.
  airQuality?: {
    index: number
    scaleMax: number
    scaleLabels: string[]
    label: string
    updatedLabel: string
    icon: string
    advice: string
    /** Icon name leading `advice`. Optional: payloads written before the
     * icon system carried the mark inside the string instead. */
    adviceTone?: string
    pollutants: Array<{
      label: string
      value: number
      scaleMax: number
      unit: string
      color: string
    }>
    // India National AQI from the nearest usable CPCB station.
    standard: "IN_NAQI"
    source: "CPCB"
    stationName?: string | null
    stationDistanceKm?: number | null
  }
  uv: {
    index: number
    scaleMax: number
    scaleLabels: string[]
    label: string
    recommendation: string
    peakHours: string
    burnTime: string
    advice: string
    /** Icon name leading `advice`. Optional: payloads written before the
     * icon system carried the mark inside the string instead. */
    adviceTone?: string
  }
  running: {
    dayLabel?: "Today" | "Tomorrow"
    date?: string
    sunrise?: string
    badge: string
    start: string
    end: string
    summary: string
  }
  rainfall: {
    chance: number
    today: number
    // Optional (backend-v0.2 handoff §9): fetching real monthly rainfall
    // totals/history would require Open-Meteo's separate historical
    // archive API, which isn't integrated. Rather than show a convincing
    // but fabricated monthly figure, these are left undefined and the UI
    // renders an explicit "Unavailable" state instead.
    month?: number
    monthlyAverage?: number
    unit: string
    periodLabel: string
    monthLabel: string
    history?: Array<{ label: string; value: number }>
  }
  commute: {
    status: string
    location: string
    items: Array<{ icon: string; name: string; value: string; detail: string }>
  }
  swimming: {
    badge: string
    venue: string
    distance: string
    depth: number
    depthUnit: string
    waterTemperature: number
    peakTime: string
    advice: string
    /** Icon name leading `advice`. Optional: payloads written before the
     * icon system carried the mark inside the string instead. */
    adviceTone?: string
  }
  garden: {
    badge: string
    title: string
    soil: string
    note: string
    /** Icon name leading `note`. Optional, as above. */
    noteTone?: string
  }
  pollen: {
    overall: string
    icon: string
    advice: string
    /** Icon name leading `advice`. Optional: payloads written before the
     * icon system carried the mark inside the string instead. */
    adviceTone?: string
    items: Array<{ type: string; level: string; percent: number; color: string }>
  }
  astronomy: {
    sunrise: string
    sunset: string
    solarNoon: string
    moonPhase: string
    goldenHour: string
    moonrise: string
  }
  comfort: {
    index: number
    label: string
    icon: string
    advice: string
    /** Icon name leading `advice`. Optional: payloads written before the
     * icon system carried the mark inside the string instead. */
    adviceTone?: string
    factors: Array<{
      label: string
      value: string
      percent: number
      color: string
    }>
  }
  alerts: Array<{
    level: string
    dotColor: string
    background: string
    borderColor: string
    title: string
    body: string
    time: string
    source: string
  }>
  locations: Array<{
    name: string
    temperature: number
    condition: string
    conditionCode: string
    icon?: string
    distance: string
  }>
  packing: {
    title: string
    items: Array<{ icon: string; item: string; reason: string }>
  }
  event: {
    sectionLabel: string
    icon: string
    title: string
    dateRange: string
    daysAway: number
    expectedSeason: string
    expectedTemperature: number
    rainLabel: string
    rainChance: number
    advice: string
    /** Icon name leading `advice`. Optional: payloads written before the
     * icon system carried the mark inside the string instead. */
    adviceTone?: string
  }
}

export const DEMO_WEATHER_DATA: DashboardWeatherData = {
  updatedAt: "Updated just now",
  current: {
    city: "Kolkata",
    region: "West Bengal",
    temperature: 31,
    feelsLike: 37,
    condition: "Bright & Sunny",
    conditionCode: "sunny",
    high: 32,
    low: 25,
    humidity: 89,
    windSpeed: 22,
    windDirection: "SW",
    windGust: 38,
    visibility: 3.2,
    pressure: 1008,
    dewPoint: 28,
    heatIndex: 41,
    hydrationAdvice:
      "Drink 3–4L water today · Avoid exertion 11 AM–4 PM · Use ORS if feeling dehydrated",
  },
  hourly: [
    {
      time: "Now",
      temperature: 31,
      condition: "Thunderstorms",
      conditionCode: "thunderstorm",
      icon: "thunderstorms-rain",
      rainChance: 92,
    },
    {
      time: "1 PM",
      temperature: 30,
      condition: "Thunderstorms",
      conditionCode: "thunderstorm",
      icon: "thunderstorms-rain",
      rainChance: 95,
    },
    {
      time: "2 PM",
      temperature: 29,
      condition: "Thunderstorms",
      conditionCode: "thunderstorm",
      icon: "thunderstorms-rain",
      rainChance: 88,
    },
    {
      time: "3 PM",
      temperature: 30,
      condition: "Showers",
      conditionCode: "showers",
      icon: "drizzle",
      rainChance: 72,
    },
    {
      time: "4 PM",
      temperature: 31,
      condition: "Showers",
      conditionCode: "showers",
      icon: "drizzle",
      rainChance: 65,
    },
    {
      time: "5 PM",
      temperature: 30,
      condition: "Rain",
      conditionCode: "rain",
      icon: "rain-cloud",
      rainChance: 80,
    },
    {
      time: "6 PM",
      temperature: 29,
      condition: "Rain",
      conditionCode: "rain",
      icon: "rain-cloud",
      rainChance: 85,
    },
    {
      time: "7 PM",
      temperature: 28,
      condition: "Showers",
      conditionCode: "showers",
      icon: "drizzle",
      rainChance: 68,
    },
    {
      time: "8 PM",
      temperature: 27,
      condition: "Rain",
      conditionCode: "rain",
      icon: "rain-cloud",
      rainChance: 58,
    },
    {
      time: "9 PM",
      temperature: 27,
      condition: "Rain",
      conditionCode: "rain",
      icon: "rain-cloud",
      rainChance: 45,
    },
  ],
  daily: [
    {
      day: "Today",
      high: 31,
      low: 25,
      condition: "Thunderstorms",
      conditionCode: "thunderstorm",
      icon: "thunderstorms-rain",
      rainChance: 92,
    },
    {
      day: "Fri",
      high: 30,
      low: 25,
      condition: "Heavy Rain",
      conditionCode: "heavy_rain",
      icon: "rain-cloud",
      rainChance: 85,
    },
    {
      day: "Sat",
      high: 32,
      low: 26,
      condition: "Showers",
      conditionCode: "showers",
      icon: "drizzle",
      rainChance: 60,
    },
    {
      day: "Sun",
      high: 33,
      low: 27,
      condition: "Partly Cloudy",
      conditionCode: "partly_cloudy",
      icon: "partly-cloudy-day",
      rainChance: 30,
    },
    {
      day: "Mon",
      high: 34,
      low: 27,
      condition: "Cloudy",
      conditionCode: "cloudy",
      icon: "partly-cloudy-day",
      rainChance: 40,
    },
    {
      day: "Tue",
      high: 31,
      low: 25,
      condition: "Rain",
      conditionCode: "rain",
      icon: "rain-cloud",
      rainChance: 80,
    },
    {
      day: "Wed",
      high: 30,
      low: 24,
      condition: "Storms",
      conditionCode: "storm",
      icon: "thunderstorms-rain",
      rainChance: 90,
    },
  ],
  overview: [
    {
      icon: "heart",
      label: "Health",
      value: "AQI 78 · UV 6",
      tone: "focus-health",
    },
    { icon: "trending-up", label: "Move", value: "Run 5:30–7 AM", tone: "focus-move" },
    {
      icon: "commute",
      label: "Commute",
      value: "Flooding nearby",
      tone: "focus-commute",
    },
    {
      icon: "home",
      label: "Outdoors",
      value: "Rough seas · 2.1m",
      tone: "focus-outdoors",
    },
  ],
  uv: {
    index: 6,
    scaleMax: 11,
    scaleLabels: ["Low", "Moderate", "High", "Very High", "Extreme"],
    label: "High",
    recommendation: "Use SPF 30+",
    peakHours: "11 AM–2 PM",
    burnTime: "~25 min",
    advice: "Carry umbrella · Wear sunglasses · Reapply SPF every 2h",
    adviceTone: "sunscreen",
  },
  running: {
    badge: "FITNESS",
    start: "5:30",
    end: "7:00 AM",
    summary: "Before humidity peaks",
  },
  rainfall: {
    chance: 92,
    today: 34.2,
    month: 312,
    monthlyAverage: 395,
    unit: "mm",
    periodLabel: "Today",
    monthLabel: "August",
    history: [
      { label: "22", value: 28 },
      { label: "23", value: 12 },
      { label: "24", value: 45 },
      { label: "25", value: 18 },
      { label: "26", value: 52 },
      { label: "27", value: 38 },
      { label: "28", value: 34 },
    ],
  },
  commute: {
    status: "DISRUPTED",
    location: "Kolkata",
    items: [
      {
        icon: "train",
        name: "Metro Line",
        value: "Modified",
        detail: "Delays expected",
      },
      {
        icon: "car",
        name: "EM Bypass",
        value: "Flooded",
        detail: "Park St · Behala",
      },
      { icon: "visibility", name: "Howrah Br.", value: "1.8 km", detail: "Visibility" },
    ],
  },
  swimming: {
    badge: "ROUGH",
    venue: "Kolkata Swimming Pool",
    distance: "12km",
    depth: 2.1,
    depthUnit: "m",
    waterTemperature: 28,
    peakTime: "11:23 AM",
    advice: "Swimming not advised due to heavy rain",
    adviceTone: "blocked",
  },
  garden: {
    badge: "AMAN",
    title: "Aman rice transplanting season",
    soil: "Saturated",
    note: "Hilsa season active!",
    noteTone: "fish",
  },
  pollen: {
    overall: "Moderate",
    icon: "pollen",
    advice:
      "Keep windows closed 10 AM–3 PM · Antihistamine recommended if allergy-prone",
    adviceTone: "mask",
    items: [
      { type: "Tree", level: "Low", percent: 20, color: "#4ade80" },
      { type: "Grass", level: "Moderate", percent: 55, color: "#eab308" },
      { type: "Weed", level: "High", percent: 80, color: "#f97316" },
    ],
  },
  astronomy: {
    sunrise: "5:21 AM",
    sunset: "6:14 PM",
    solarNoon: "12:47 PM",
    moonPhase: "Waxing Gibbous",
    goldenHour: "5:51 PM",
    moonrise: "8:45 PM",
  },
  comfort: {
    index: 38,
    label: "Uncomfortable",
    icon: "hot",
    advice:
      "Event planners: Provide shade and water stations. Rain disruption probability is about 30%.",
    adviceTone: "tip",
    factors: [
      { label: "Temperature", value: "31°C", percent: 60, color: "#f59e0b" },
      { label: "Humidity", value: "89%", percent: 89, color: "#60a5fa" },
      { label: "Wind", value: "22 km/h", percent: 40, color: "#a78bfa" },
    ],
  },
  alerts: [
    {
      level: "Red",
      dotColor: "#ef4444",
      background: "rgba(239,68,68,0.1)",
      borderColor: "rgba(239,68,68,0.2)",
      title: "Heavy Rainfall Warning",
      body: "IMD red alert: 115mm+ rain expected in next 24h. Avoid underpasses, the Maidan, and low-lying Behala.",
      time: "2h ago",
      source: "IMD",
    },
    {
      level: "Orange",
      dotColor: "#f97316",
      background: "rgba(249,115,22,0.1)",
      borderColor: "rgba(249,115,22,0.2)",
      title: "Waterlogging — EM Bypass",
      body: "Severe waterlogging on EM Bypass, Park Street, Kasba. Metro running on modified schedule. Allow extra time.",
      time: "3h ago",
      source: "IMD",
    },
    {
      level: "Yellow",
      dotColor: "#eab308",
      background: "rgba(234,179,8,0.1)",
      borderColor: "rgba(234,179,8,0.2)",
      title: "Ganga Ferry Suspended",
      body: "Wind gusts 45 km/h. All ferry services on the Hooghly suspended until further notice.",
      time: "5h ago",
      source: "IMD",
    },
  ],
  locations: [
    {
      name: "Darjeeling",
      temperature: 16,
      condition: "Foggy Rain",
      conditionCode: "fog",
      icon: "rain-cloud",
      distance: "600 km",
    },
    {
      name: "Digha Beach",
      temperature: 28,
      condition: "Rough Seas",
      conditionCode: "storm",
      icon: "thunderstorms-rain",
      distance: "180 km",
    },
    {
      name: "Sundarbans",
      temperature: 30,
      condition: "Showers",
      conditionCode: "showers",
      icon: "drizzle",
      distance: "130 km",
    },
    {
      name: "Siliguri",
      temperature: 24,
      condition: "Heavy Rain",
      conditionCode: "heavy_rain",
      icon: "rain-cloud",
      distance: "570 km",
    },
  ],
  packing: {
    title: "For Kolkata · 28 Aug 2026",
    items: [
      { icon: "umbrella", item: "Heavy duty umbrella", reason: "92% rain chance" },
      {
        icon: "boots",
        item: "Waterproof footwear",
        reason: "Severe waterlogging",
      },
      { icon: "sunscreen", item: "Sunscreen SPF 30+", reason: "UV Index 6 (High)" },
      { icon: "water-bottle", item: "Water bottle (1L+)", reason: "Heat index 41°C" },
      { icon: "mask", item: "N95 mask", reason: "AQI 78 (Satisfactory)" },
      { icon: "power-bank", item: "Power bank", reason: "Power cuts likely" },
    ],
  },
  event: {
    sectionLabel: "Event Planner",
    icon: "festival",
    title: "Durga Puja 2026",
    dateRange: "Oct 2–6",
    daysAway: 33,
    expectedSeason: "Post-monsoon",
    expectedTemperature: 28,
    rainLabel: "Low Rain",
    rainChance: 15,
    advice:
      "Plan pandal visits 5–9 AM for best weather. Avoid afternoons during the first two days.",
    adviceTone: "tip",
  },
}

/**
 * `isDay` (v0.2, from Open-Meteo's own day/night flag) is optional — when
 * omitted (e.g. demo data or an older backend response), the daytime icon is
 * used, matching pre-v0.2 behavior exactly.
 *
 * `override` accepts a current icon name, a URL (handled by the caller), or an
 * emoji from a payload written before the icon system landed — see
 * LEGACY_EMOJI_ALIASES. Anything unrecognised falls through to the condition
 * code, which is the value actually worth trusting.
 */
export function resolveWeatherIcon(
  conditionCode: string,
  override?: string,
  isDay?: boolean,
): IconName {
  if (override) {
    const resolved = resolveIconName(override)
    if (resolved) return resolved
  }
  return weatherIconForCondition(conditionCode, isDay)
}

export function getWeatherHeroVariant(
  conditionCode: string,
  condition = "",
  isDay?: boolean,
): WeatherHeroVariant {
  if (
    /rain|storm|shower|drizzle|thunder/i.test(`${conditionCode} ${condition}`)
  )
    return "rainy"
  return isDay === false ? "night" : "sunny"
}

/** Which of the three rain characters a rainy sky gets. */
export type RainCharacter = "thunderstorm" | "heavy-rain" | "drizzle"

/**
 * Splits a sky that is already known to be rainy into its character. Both
 * preset systems — the hero card in App.tsx and resolveWidgetPreset in
 * widgets/widgetBridge.ts — call this, so the two cannot drift apart.
 *
 * It reads the condition text as well as the code because the normalizer
 * collapses WMO 61 "Slight rain" and 63 "Moderate rain" onto the same
 * `rain` code, and 80 "Slight showers" onto `showers`; the code alone
 * cannot tell a drizzle from a downpour.
 *
 * Callers are expected to have established the sky is rainy first (via
 * getWeatherHeroVariant, or a rain-family conditionKey). A dry condition
 * passed in here would come back "drizzle", which is meaningless rather
 * than wrong — this never decides *whether* it is raining.
 */
export function getRainCharacter(
  conditionCode: string,
  condition = "",
): RainCharacter {
  const text = `${conditionCode} ${condition}`.toLowerCase()
  if (/thunder|storm/.test(text)) return "thunderstorm"
  // "moderate rain" and "moderate showers" are matched in full: a bare
  // "moderate" would also catch WMO 53 "Moderate drizzle", which is not it.
  // "heavy" covers both the heavy_rain code and the text, so WMO 65, 67 and
  // 82 all land here.
  if (
    /heavy|violent|torrential|downpour|moderate rain|moderate showers/.test(
      text,
    )
  )
    return "heavy-rain"
  return "drizzle"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

// v0.2 review (Requirement 2 — "remove demo data leakage"): LIVE weather
// responses are no longer deep-merged with DEMO_WEATHER_DATA. The backend
// now sends a genuinely complete payload for every field except
// rainfall.month/monthlyAverage/history (which stay legitimately optional
// — see the `rainfall` type comment) and airQuality (optional when the
// provider is unavailable). This validator checks the payload is
// structurally usable on its own; it does NOT fill in any missing field
// from demo data. DEMO_WEATHER_DATA is used only as a whole, standalone
// object (see fetchWeatherDashboard below) — LIVE and DEMO values are
// never mixed within the same dashboard object.
function isDashboardWeatherData(value: unknown): value is DashboardWeatherData {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<DashboardWeatherData>
  return Boolean(
    candidate.current &&
      typeof candidate.current.temperature === "number" &&
      typeof candidate.current.feelsLike === "number" &&
      typeof candidate.current.condition === "string" &&
      typeof candidate.current.conditionCode === "string" &&
      typeof candidate.current.humidity === "number" &&
      typeof candidate.current.windSpeed === "number" &&
      // airQuality is intentionally NOT required here — it may be
      // legitimately absent when the provider is unavailable (see the
      // `airQuality` field comment above); the UI handles that explicitly.
      (!candidate.airQuality ||
        (Number.isFinite(candidate.airQuality.index) &&
          candidate.airQuality.standard === "IN_NAQI" &&
          candidate.airQuality.source === "CPCB")) &&
      candidate.uv &&
      typeof candidate.uv.index === "number" &&
      candidate.astronomy &&
      typeof candidate.astronomy.sunrise === "string" &&
      candidate.comfort &&
      typeof candidate.comfort.index === "number" &&
      candidate.running &&
      typeof candidate.running.badge === "string" &&
      candidate.rainfall &&
      typeof candidate.rainfall.chance === "number" &&
      Array.isArray(candidate.hourly) &&
      candidate.hourly.length > 0 &&
      Array.isArray(candidate.daily) &&
      candidate.daily.length > 0 &&
      Array.isArray(candidate.overview) &&
      Array.isArray(candidate.alerts) &&
      Array.isArray(candidate.locations) &&
      candidate.commute &&
      candidate.swimming &&
      candidate.garden &&
      candidate.pollen &&
      candidate.packing &&
      candidate.event,
  )
}

/**
 * A minimal user-location shape (see src/location.ts for the full type) —
 * kept local to avoid a circular import; only the fields actually needed
 * to build the request are read.
 */
export type WeatherLocationParam = {
  latitude: number
  longitude: number
  locality?: string
  region?: string
  country?: string
  source: "device" | "manual" | "default"
}

/**
 * True whenever a live weather request will actually be attempted — i.e.
 * VITE_USE_DEMO_WEATHER has not been explicitly set. A backend URL is no
 * longer required: fetchWeatherDashboard falls back to the relative
 * `/api/weather` Vercel serverless function when VITE_WEATHER_API_URL is
 * unset. Callers should use this instead of checking VITE_WEATHER_API_URL
 * directly (which only matters for local dev against the Fastify server).
 */
export function isLiveWeatherEnabled(): boolean {
  return import.meta.env.VITE_USE_DEMO_WEATHER !== "true"
}

/**
 * Fetches live weather for the given resolved location. Per the
 * location-first architecture (backend-v0.2 handoff), no location means
 * no live request is attempted — the caller is expected to have already
 * resolved a location (device GPS, manual search, or an explicitly
 * chosen demo location) before calling this.
 */
export async function fetchWeatherDashboard(
  location: WeatherLocationParam | undefined,
  signal?: AbortSignal,
  forceRefresh = false,
): Promise<DashboardWeatherData> {
  // Falls back to the relative Vercel serverless function when no explicit
  // backend URL is configured (production build) — VITE_WEATHER_API_URL is
  // only needed locally to point at the Fastify dev server on a different
  // port (see .env.example). Both endpoints serve the same transformed
  // DashboardWeatherData contract (see api/weather.ts).
  const endpoint = import.meta.env.VITE_WEATHER_API_URL?.trim() || "/api/weather"
  const forceDemo = import.meta.env.VITE_USE_DEMO_WEATHER === "true"

  if (forceDemo) return DEMO_WEATHER_DATA
  if (!location) throw new Error("A resolved location is required for live weather")

  const url = new URL(endpoint, window.location.origin)
  url.searchParams.set("latitude", String(location.latitude))
  url.searchParams.set("longitude", String(location.longitude))
  if (location.locality) url.searchParams.set("locality", location.locality)
  if (location.region) url.searchParams.set("region", location.region)
  if (location.country) url.searchParams.set("country", location.country)
  // The backend only recognizes 'device'/'manual' for an explicit-coordinate
  // request; a deliberately-chosen demo location is treated as 'manual'
  // since the user actively selected it (never silently substituted).
  url.searchParams.set(
    "source",
    location.source === "default" ? "manual" : location.source,
  )

  if (forceRefresh) {
    url.searchParams.set("refresh", "true")
    url.searchParams.set("_t", String(Date.now()))
  }

  try {
    const response = await fetch(url.toString(), {
      signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
    if (!response.ok)
      throw new Error(`Weather request failed with status ${response.status}`)

    const responseBody: unknown = await response.json()
    const rawPayload =
      responseBody && typeof responseBody === "object" && "data" in responseBody
        ? (responseBody as { data: unknown }).data
        : responseBody

    if (!isRecord(rawPayload)) {
      throw new Error(
        "Weather response does not match the dashboard data contract",
      )
    }

    if (!isDashboardWeatherData(rawPayload)) {
      throw new Error("Weather response contains invalid dashboard values")
    }
    if (!isCurrentWeatherFresh(rawPayload)) {
      throw new Error("Current weather estimate is out of date")
    }
    if (Array.isArray(rawPayload.overview)) {
      for (const item of rawPayload.overview) {
        if (
          item &&
          typeof item === "object" &&
          item.label === "Move" &&
          typeof item.value === "string"
        ) {
          if (
            item.value === "Best window most of the day" ||
            item.value.toLowerCase().includes("most of the day")
          ) {
            item.value = "Good all day"
          } else if (item.value.startsWith("Best window ")) {
            item.value = item.value.replace(/^Best window\s+/i, "Best: ")
          }
        }
      }
    }
    return rawPayload
  } catch (error) {
    // Never silently substitute demo data for a real request failure —
    // let the caller surface/handle the error.
    throw error
  }
}

/** Live payloads must include a recent provider timestamp, not the fetch time. */
export function isCurrentWeatherFresh(weather: Pick<DashboardWeatherData, "observedAt">): boolean {
  const age = Date.now() - Date.parse(weather.observedAt ?? "")
  return Number.isFinite(age) && age <= 30 * 60_000 && age >= -5 * 60_000
}
