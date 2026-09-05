// Mirrors DashboardWeatherData from ../../../src/weatherData.ts exactly.
// Keep in sync manually — the frontend contract is the source of truth.

export type WeatherHeroVariant = 'rainy' | 'sunny'

export type HourlyForecast = {
  time: string
  temperature: number
  condition: string
  conditionCode: string
  icon?: string
  rainChance: number
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

// Added in v0.2 for the location-first architecture (see backend-v0.2
// handoff §4/§1). Optional so the frontend's existing demo fallback and
// any older cached/partial payload remain valid without it.
export type ResolvedLocation = {
  latitude: number
  longitude: number
  locality: string
  region: string
  country: string
  timezone: string
  source: 'device' | 'manual' | 'default'
}

export type DashboardWeatherData = {
  updatedAt: string
  // Real provider-timestamp-based fields (see backend-v0.2 handoff §4):
  // `observedAt` is the ISO instant of the underlying provider reading;
  // `location` is the resolved coordinates/place-name/timezone this
  // payload was fetched for. Both optional for the same reason as above.
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
  airQuality: {
    index: number
    scaleMax: number
    scaleLabels: string[]
    label: string
    updatedLabel: string
    icon: string
    advice: string
    pollutants: Array<{ label: string; value: number; scaleMax: number; unit: string; color: string }>
    // Added in v0.2 for AQI-source honesty (see backend-v0.2 handoff §8):
    // which national standard this index uses, and whether it came from a
    // real government monitoring station or a modeled global estimate.
    // Optional so older/partial responses (and the frontend's own demo
    // fallback) remain valid without these fields.
    standard?: 'IN_NAQI' | 'US_AQI'
    source?: 'CPCB' | 'OPEN_METEO'
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
  }
  running: {
    badge: string
    start: string
    end: string
    summary: string
  }
  rainfall: {
    chance: number
    today: number
    month: number
    monthlyAverage: number
    unit: string
    periodLabel: string
    monthLabel: string
    history: Array<{ label: string; value: number }>
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
  }
  garden: {
    badge: string
    title: string
    soil: string
    note: string
  }
  pollen: {
    overall: string
    icon: string
    advice: string
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
    factors: Array<{ label: string; value: string; percent: number; color: string }>
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
  }
}

// Phase 1 only ever produces a subset of these top-level sections
// (current, hourly, daily). The frontend deep-merges partial responses
// into its fallback dataset, so omitted sections/fields are safe.
export type PartialDashboardWeatherData = {
  [K in keyof DashboardWeatherData]?: DashboardWeatherData[K]
}
