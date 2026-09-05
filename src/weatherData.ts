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

export const DEMO_WEATHER_DATA: DashboardWeatherData = {
  updatedAt: 'Updated just now',
  current: {
    city: 'Kolkata',
    region: 'West Bengal',
    temperature: 31,
    feelsLike: 37,
    condition: 'Bright & Sunny',
    conditionCode: 'sunny',
    high: 32,
    low: 25,
    humidity: 89,
    windSpeed: 22,
    windDirection: 'SW',
    windGust: 38,
    visibility: 3.2,
    pressure: 1008,
    dewPoint: 28,
    heatIndex: 41,
    hydrationAdvice: '💧 Drink 3–4L water today · Avoid exertion 11 AM–4 PM · Use ORS if feeling dehydrated',
  },
  hourly: [
    { time: 'Now', temperature: 31, condition: 'Thunderstorms', conditionCode: 'thunderstorm', icon: '⛈️', rainChance: 92 },
    { time: '1 PM', temperature: 30, condition: 'Thunderstorms', conditionCode: 'thunderstorm', icon: '⛈️', rainChance: 95 },
    { time: '2 PM', temperature: 29, condition: 'Thunderstorms', conditionCode: 'thunderstorm', icon: '⛈️', rainChance: 88 },
    { time: '3 PM', temperature: 30, condition: 'Showers', conditionCode: 'showers', icon: '🌦️', rainChance: 72 },
    { time: '4 PM', temperature: 31, condition: 'Showers', conditionCode: 'showers', icon: '🌦️', rainChance: 65 },
    { time: '5 PM', temperature: 30, condition: 'Rain', conditionCode: 'rain', icon: '🌧️', rainChance: 80 },
    { time: '6 PM', temperature: 29, condition: 'Rain', conditionCode: 'rain', icon: '🌧️', rainChance: 85 },
    { time: '7 PM', temperature: 28, condition: 'Showers', conditionCode: 'showers', icon: '🌦️', rainChance: 68 },
    { time: '8 PM', temperature: 27, condition: 'Rain', conditionCode: 'rain', icon: '🌧️', rainChance: 58 },
    { time: '9 PM', temperature: 27, condition: 'Rain', conditionCode: 'rain', icon: '🌧️', rainChance: 45 },
  ],
  daily: [
    { day: 'Today', high: 31, low: 25, condition: 'Thunderstorms', conditionCode: 'thunderstorm', icon: '⛈️', rainChance: 92 },
    { day: 'Fri', high: 30, low: 25, condition: 'Heavy Rain', conditionCode: 'heavy_rain', icon: '🌧️', rainChance: 85 },
    { day: 'Sat', high: 32, low: 26, condition: 'Showers', conditionCode: 'showers', icon: '🌦️', rainChance: 60 },
    { day: 'Sun', high: 33, low: 27, condition: 'Partly Cloudy', conditionCode: 'partly_cloudy', icon: '🌤️', rainChance: 30 },
    { day: 'Mon', high: 34, low: 27, condition: 'Cloudy', conditionCode: 'cloudy', icon: '⛅', rainChance: 40 },
    { day: 'Tue', high: 31, low: 25, condition: 'Rain', conditionCode: 'rain', icon: '🌧️', rainChance: 80 },
    { day: 'Wed', high: 30, low: 24, condition: 'Storms', conditionCode: 'storm', icon: '⛈️', rainChance: 90 },
  ],
  overview: [
    { icon: '♥', label: 'Health', value: 'AQI 78 · UV 6', tone: 'focus-health' },
    { icon: '↗', label: 'Move', value: 'Run 5:30–7 AM', tone: 'focus-move' },
    { icon: '⌁', label: 'Commute', value: 'Flooding nearby', tone: 'focus-commute' },
    { icon: '⌂', label: 'Outdoors', value: 'Rough seas · 2.1m', tone: 'focus-outdoors' },
  ],
  airQuality: {
    index: 78,
    scaleMax: 300,
    scaleLabels: ['Good', 'Moderate', 'Sensitive', 'Poor', 'Very Poor'],
    label: 'Satisfactory',
    updatedLabel: 'Updated just now',
    icon: '😷',
    advice: '💡 Asthma / COPD sufferers: limit outdoor time. Mask recommended near high-traffic zones.',
    pollutants: [
      { label: 'PM2.5', value: 42, scaleMax: 100, unit: 'µg/m³', color: '#f59e0b' },
      { label: 'PM10', value: 68, scaleMax: 150, unit: 'µg/m³', color: '#f97316' },
      { label: 'O₃', value: 38, scaleMax: 120, unit: 'µg/m³', color: '#60a5fa' },
      { label: 'NO₂', value: 22, scaleMax: 80, unit: 'µg/m³', color: '#a78bfa' },
    ],
  },
  uv: {
    index: 6,
    scaleMax: 11,
    scaleLabels: ['Low', 'Moderate', 'High', 'Very High', 'Extreme'],
    label: 'High',
    recommendation: 'Use SPF 30+',
    peakHours: '11 AM–2 PM',
    burnTime: '~25 min',
    advice: '☂️ Carry umbrella · 😎 Wear sunglasses · 🧴 Reapply SPF every 2h',
  },
  running: { badge: 'FITNESS', start: '5:30', end: '7:00 AM', summary: 'Before humidity peaks' },
  rainfall: {
    chance: 92,
    today: 34.2,
    month: 312,
    monthlyAverage: 395,
    unit: 'mm',
    periodLabel: 'Today',
    monthLabel: 'August',
    history: [
      { label: '22', value: 28 }, { label: '23', value: 12 }, { label: '24', value: 45 },
      { label: '25', value: 18 }, { label: '26', value: 52 }, { label: '27', value: 38 },
      { label: '28', value: 34 },
    ],
  },
  commute: {
    status: 'DISRUPTED',
    location: 'Kolkata',
    items: [
      { icon: '🚇', name: 'Metro Line', value: 'Modified', detail: 'Delays expected' },
      { icon: '🚗', name: 'EM Bypass', value: 'Flooded', detail: 'Park St · Behala' },
      { icon: '👁️', name: 'Howrah Br.', value: '1.8 km', detail: 'Visibility' },
    ],
  },
  swimming: {
    badge: 'ROUGH', venue: 'Kolkata Swimming Pool', distance: '12km', depth: 2.1, depthUnit: 'm',
    waterTemperature: 28, peakTime: '11:23 AM', advice: '🚫 Swimming not advised due to heavy rain',
  },
  garden: {
    badge: 'AMAN', title: 'Aman rice transplanting season', soil: 'Saturated', note: '🐟 Hilsa season active!',
  },
  pollen: {
    overall: 'Moderate', icon: '🌿',
    advice: '🤧 Keep windows closed 10 AM–3 PM · Antihistamine recommended if allergy-prone',
    items: [
      { type: 'Tree', level: 'Low', percent: 20, color: '#4ade80' },
      { type: 'Grass', level: 'Moderate', percent: 55, color: '#eab308' },
      { type: 'Weed', level: 'High', percent: 80, color: '#f97316' },
    ],
  },
  astronomy: {
    sunrise: '5:21 AM', sunset: '6:14 PM', solarNoon: '12:47 PM', moonPhase: 'Waxing Gibbous',
    goldenHour: '5:51 PM', moonrise: '8:45 PM',
  },
  comfort: {
    index: 38,
    label: 'Uncomfortable',
    icon: '🥵',
    advice: '🎪 Event planners: Provide shade and water stations. Rain disruption probability is about 30%.',
    factors: [
      { label: 'Temperature', value: '31°C', percent: 60, color: '#f59e0b' },
      { label: 'Humidity', value: '89%', percent: 89, color: '#60a5fa' },
      { label: 'Wind', value: '22 km/h', percent: 40, color: '#a78bfa' },
    ],
  },
  alerts: [
    { level: 'Red', dotColor: '#ef4444', background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', title: 'Heavy Rainfall Warning', body: 'IMD red alert: 115mm+ rain expected in next 24h. Avoid underpasses, the Maidan, and low-lying Behala.', time: '2h ago', source: 'IMD' },
    { level: 'Orange', dotColor: '#f97316', background: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.2)', title: 'Waterlogging — EM Bypass', body: 'Severe waterlogging on EM Bypass, Park Street, Kasba. Metro running on modified schedule. Allow extra time.', time: '3h ago', source: 'IMD' },
    { level: 'Yellow', dotColor: '#eab308', background: 'rgba(234,179,8,0.1)', borderColor: 'rgba(234,179,8,0.2)', title: 'Ganga Ferry Suspended', body: 'Wind gusts 45 km/h. All ferry services on the Hooghly suspended until further notice.', time: '5h ago', source: 'IMD' },
  ],
  locations: [
    { name: 'Darjeeling', temperature: 16, condition: 'Foggy Rain', conditionCode: 'fog', icon: '🌧️', distance: '600 km' },
    { name: 'Digha Beach', temperature: 28, condition: 'Rough Seas', conditionCode: 'storm', icon: '⛈️', distance: '180 km' },
    { name: 'Sundarbans', temperature: 30, condition: 'Showers', conditionCode: 'showers', icon: '🌦️', distance: '130 km' },
    { name: 'Siliguri', temperature: 24, condition: 'Heavy Rain', conditionCode: 'heavy_rain', icon: '🌧️', distance: '570 km' },
  ],
  packing: {
    title: 'For Kolkata · 28 Aug 2026',
    items: [
      { icon: '☂️', item: 'Heavy duty umbrella', reason: '92% rain chance' },
      { icon: '👟', item: 'Waterproof footwear', reason: 'Severe waterlogging' },
      { icon: '🧴', item: 'Sunscreen SPF 30+', reason: 'UV Index 6 (High)' },
      { icon: '💧', item: 'Water bottle (1L+)', reason: 'Heat index 41°C' },
      { icon: '😷', item: 'N95 mask', reason: 'AQI 78 (Satisfactory)' },
      { icon: '📱', item: 'Power bank', reason: 'Power cuts likely' },
    ],
  },
  event: {
    sectionLabel: 'Event Planner', icon: '🪔', title: 'Durga Puja 2026', dateRange: 'Oct 2–6', daysAway: 33,
    expectedSeason: 'Post-monsoon', expectedTemperature: 28, rainLabel: 'Low Rain', rainChance: 15,
    advice: '💡 Plan pandal visits 5–9 AM for best weather. Avoid afternoons during the first two days.',
  },
}

const CONDITION_ICONS: Record<string, string> = {
  sunny: '☀️', clear: '☀️', fair: '☀️', partly_cloudy: '🌤️', cloudy: '☁️', overcast: '☁️',
  drizzle: '🌦️', showers: '🌦️', rain: '🌧️', heavy_rain: '🌧️', thunderstorm: '⛈️', storm: '⛈️',
  fog: '🌫️', mist: '🌫️', wind: '💨', snow: '🌨️',
}

export function resolveWeatherIcon(conditionCode: string, override?: string): string {
  return override || CONDITION_ICONS[conditionCode.trim().toLowerCase().replace(/[\s-]+/g, '_')] || '🌡️'
}

export function getWeatherHeroVariant(conditionCode: string, condition = ''): WeatherHeroVariant {
  return /rain|storm|shower|drizzle|thunder/i.test(`${conditionCode} ${condition}`) ? 'rainy' : 'sunny'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function mergeWeatherPayload(base: unknown, update: unknown): unknown {
  if (update === undefined) return base
  if (Array.isArray(update)) return update
  if (!isRecord(base) || !isRecord(update)) return update

  const merged: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(update)) {
    merged[key] = mergeWeatherPayload(merged[key], value)
  }
  return merged
}

function isDashboardWeatherData(value: unknown): value is DashboardWeatherData {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<DashboardWeatherData>
  return Boolean(
    candidate.current && typeof candidate.current.temperature === 'number'
    && candidate.airQuality && typeof candidate.airQuality.index === 'number'
    && candidate.uv && typeof candidate.uv.index === 'number'
    && candidate.rainfall
    && Array.isArray(candidate.hourly) && Array.isArray(candidate.daily)
    && Array.isArray(candidate.overview) && Array.isArray(candidate.alerts),
  )
}

export async function fetchWeatherDashboard(signal?: AbortSignal): Promise<DashboardWeatherData> {
  const endpoint = import.meta.env.VITE_WEATHER_API_URL?.trim()
  if (!endpoint) return DEMO_WEATHER_DATA

  const response = await fetch(endpoint, {
    signal,
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Weather request failed with status ${response.status}`)

  const responseBody: unknown = await response.json()
  const payload = responseBody && typeof responseBody === 'object' && 'data' in responseBody
    ? (responseBody as { data: unknown }).data
    : responseBody

  if (!isRecord(payload)) {
    throw new Error('Weather response does not match the dashboard data contract')
  }

  const mergedPayload = mergeWeatherPayload(DEMO_WEATHER_DATA, payload)
  if (!isDashboardWeatherData(mergedPayload)) {
    throw new Error('Weather response contains invalid dashboard values')
  }
  return mergedPayload
}
