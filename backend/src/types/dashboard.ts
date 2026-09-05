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

export type DashboardWeatherData = {
  updatedAt: string
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
