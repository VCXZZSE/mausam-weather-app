import type { OpenMeteoResponse } from '../providers/openMeteoClient.js'
import type { OpenMeteoAirQualityResponse } from '../providers/openMeteoAirQualityClient.js'
import type { DailyForecast, DashboardWeatherData, HourlyForecast, ResolvedLocation } from '../types/dashboard.js'
import { degreesToCompass, resolveCondition, resolveHeroVariant } from './conditionCode.js'
import { findClosestTimeIndex } from './timeIndex.js'
import { normalizeAirQuality } from './airQuality.js'
import { normalizeUv } from './uv.js'
import { calculateAstronomy } from '../astronomy/astronomyCalculator.js'
import { computeComfort, computeOverview, computeRainfall } from './derived.js'
import { computePollen } from '../data/pollenSeasonalTable.js'
import { computeCuratedAlerts } from '../data/curatedAlerts.js'
import { computeCommute } from '../rules/commute.js'
import { computeSwimming } from '../rules/swimming.js'
import { computeGarden } from '../rules/garden.js'
import { computeLocations } from '../rules/locations.js'
import { computePacking } from '../rules/packing.js'
import { computeEvent } from '../rules/event.js'
import { computeRunning } from '../rules/running.js'
import { parseLocalCalendarDate, toLocationInstant } from '../utils/locationTime.js'

// Sections intentionally NOT produced here (rainfall.month/monthlyAverage/
// history) require data this app doesn't fetch (Open-Meteo's separate
// historical archive API) and are left out rather than fabricated — see
// backend-v0.2 handoff §9 ("never replace a missing live field with a
// hardcoded demo value"). The frontend now surfaces these as an explicit
// "Unavailable" state instead of silently merging in demo numbers.
//
// Data provenance:
//  LIVE:    current/hourly/daily (Open-Meteo forecast), airQuality (Open-Meteo AQI)
//  LOCAL COMPUTATION: uv, astronomy, comfort, rainfall, overview, running
//  CURATED/RULE-BASED: pollen, alerts, commute, swimming, garden, locations,
//                       packing, event — deterministic content, not live
//                       measurements. See each module's header comment.
export type WeatherPayload = {
  updatedAt: string
  observedAt: string
  location: ResolvedLocation
  current: Partial<DashboardWeatherData['current']>
  hourly: HourlyForecast[]
  daily: DailyForecast[]
  airQuality?: DashboardWeatherData['airQuality']
  uv: DashboardWeatherData['uv']
  astronomy: DashboardWeatherData['astronomy']
  comfort: DashboardWeatherData['comfort']
  rainfall: Pick<DashboardWeatherData['rainfall'], 'chance' | 'today' | 'unit' | 'periodLabel' | 'monthLabel'>
  overview: DashboardWeatherData['overview']
  running: DashboardWeatherData['running']
  pollen: DashboardWeatherData['pollen']
  alerts: DashboardWeatherData['alerts']
  commute: DashboardWeatherData['commute']
  swimming: DashboardWeatherData['swimming']
  garden: DashboardWeatherData['garden']
  locations: DashboardWeatherData['locations']
  packing: DashboardWeatherData['packing']
  event: DashboardWeatherData['event']
}

export type NormalizeContext = {
  city: string
  region: string
  country: string
  latitude: number
  longitude: number
  source: ResolvedLocation['source']
}

function formatHourLabel(isoTime: string, index: number): string {
  if (index === 0) return 'Now'
  const date = parseLocalCalendarDate(isoTime)
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: undefined, hour12: true, timeZone: 'UTC' })
}

function formatDayLabel(isoDate: string, index: number): string {
  if (index === 0) return 'Today'
  const date = parseLocalCalendarDate(isoDate)
  return date.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' })
}

export function toDashboardWeatherData(
  data: OpenMeteoResponse,
  airQualityData: OpenMeteoAirQualityResponse | undefined,
  context: NormalizeContext,
): WeatherPayload {
  const currentHourIndex = findClosestTimeIndex(data.hourly.time, data.current_weather.time)

  const { conditionCode, condition } = resolveCondition(data.current_weather.weathercode)
  const heroVariant = resolveHeroVariant(conditionCode, condition)

  const temperature = data.current_weather.temperature
  const feelsLike = Math.round(data.hourly.apparent_temperature[currentHourIndex])
  const humidity = Math.round(data.hourly.relative_humidity_2m[currentHourIndex])
  const pressure = Math.round(data.hourly.surface_pressure[currentHourIndex])
  const dewPoint = Math.round(data.hourly.dew_point_2m[currentHourIndex])
  const visibilityMeters = data.hourly.visibility[currentHourIndex]
  const windGust = Math.round(data.hourly.wind_gusts_10m[currentHourIndex])
  const windSpeed = data.current_weather.windspeed

  const hourly: HourlyForecast[] = data.hourly.time.slice(currentHourIndex, currentHourIndex + 10).map((time, offset) => {
    const index = currentHourIndex + offset
    const info = resolveCondition(data.hourly.weathercode[index])
    return {
      time: formatHourLabel(time, offset),
      temperature: Math.round(data.hourly.temperature_2m[index]),
      condition: info.condition,
      conditionCode: info.conditionCode,
      rainChance: Math.round(data.hourly.precipitation_probability[index] ?? 0),
    }
  })

  const daily: DailyForecast[] = data.daily.time.slice(0, 7).map((date, index) => {
    const info = resolveCondition(data.daily.weathercode[index])
    return {
      day: formatDayLabel(date, index),
      high: Math.round(data.daily.temperature_2m_max[index]),
      low: Math.round(data.daily.temperature_2m_min[index]),
      condition: info.condition,
      conditionCode: info.conditionCode,
      rainChance: Math.round(data.daily.precipitation_probability_max[index] ?? 0),
    }
  })

  // Astronomy needs the real absolute instant, computed using the
  // provider's own UTC offset for the requested coordinates (not a
  // hardcoded Kolkata +05:30 — see utils/locationTime.ts).
  const currentInstant = toLocationInstant(data.current_weather.time, data.utc_offset_seconds)
  const astronomy = calculateAstronomy(
    currentInstant,
    { latitude: context.latitude, longitude: context.longitude },
    data.timezone,
  )
  // Prefer Open-Meteo's own daily sunrise/sunset over the suncalc estimate
  // (backend-v0.2 handoff §7) — format them in the same requested timezone.
  const sunriseInstant = toLocationInstant(data.daily.sunrise[0], data.utc_offset_seconds)
  const sunsetInstant = toLocationInstant(data.daily.sunset[0], data.utc_offset_seconds)
  astronomy.sunrise = sunriseInstant.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: data.timezone })
  astronomy.sunset = sunsetInstant.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: data.timezone })

  const uv = normalizeUv({
    currentUvIndex: data.hourly.uv_index[currentHourIndex] ?? 0,
    solarNoon: astronomy.solarNoon,
  })

  const airQuality = airQualityData
    ? normalizeAirQuality(airQualityData, data.current_weather.time)
    : undefined

  const comfort = computeComfort({ temperature, humidity, windSpeed })

  const rainfall = computeRainfall({
    chance: data.daily.precipitation_probability_max[0] ?? 0,
    todayTotal: data.daily.precipitation_sum[0] ?? 0,
    monthLabel: parseLocalCalendarDate(data.current_weather.time).toLocaleDateString('en-IN', { month: 'long', timeZone: 'UTC' }),
  })

  const bestWindowLabel = uv.index >= 6 ? `before ${astronomy.sunrise !== '—' ? astronomy.sunrise : '9 AM'}` : 'most of the day'

  const overview = computeOverview({
    aqiIndex: airQuality?.index,
    aqiLabel: airQuality?.label ?? 'Unavailable',
    uvIndex: uv.index,
    uvLabel: uv.label,
    rainChanceToday: daily[0]?.rainChance ?? 0,
    windSpeed,
    bestWindowLabel,
  })

  const running = computeRunning(data)

  // Local CALENDAR date — read only with UTC getters/timeZone:'UTC'
  // formatting (see utils/locationTime.ts). Do not use for real instant math.
  const currentDate = parseLocalCalendarDate(data.current_weather.time)
  const month = currentDate.getUTCMonth()
  const rainChanceToday = daily[0]?.rainChance ?? 0
  const visibilityKm = Math.round((visibilityMeters / 1000) * 10) / 10

  const pollen = computePollen(month)

  const alerts = computeCuratedAlerts({
    conditionCode,
    temperature,
    windSpeed,
    rainChanceToday,
    month,
    aqiIndex: airQuality?.index,
  })

  const commute = computeCommute({
    conditionCode,
    rainChanceToday,
    windSpeed,
    visibilityKm,
    city: context.city,
  })

  const swimming = computeSwimming({
    conditionCode,
    temperature,
    uvIndex: uv.index,
    windSpeed,
    rainChanceToday,
    peakTime: astronomy.solarNoon,
  })

  const garden = computeGarden({
    temperature,
    rainChanceToday,
    humidity,
    windSpeed,
    month,
  })

  const locations = computeLocations({ temperature, condition, conditionCode })

  const packing = computePacking({
    temperature,
    rainChanceToday,
    uvIndex: uv.index,
    windSpeed,
    conditionCode,
    aqiIndex: airQuality?.index,
    city: context.city,
    dateLabel: currentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
  })

  const event = computeEvent({ daily, currentDate, month })

  const observedAt = currentInstant.toISOString()
  const updatedAtLabel = currentInstant.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: data.timezone })

  return {
    // A real provider-based timestamp, never the literal "Updated just
    // now" (backend-v0.2 handoff §4).
    updatedAt: `Updated at ${updatedAtLabel}`,
    observedAt,
    location: {
      latitude: context.latitude,
      longitude: context.longitude,
      locality: context.city,
      region: context.region,
      country: context.country,
      timezone: data.timezone,
      source: context.source,
    },
    current: {
      city: context.city,
      region: context.region,
      temperature: Math.round(temperature),
      feelsLike,
      condition,
      conditionCode,
      heroVariant,
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
      humidity,
      windSpeed: Math.round(windSpeed),
      windDirection: degreesToCompass(data.current_weather.winddirection),
      windGust,
      visibility: Math.round((visibilityMeters / 1000) * 10) / 10,
      pressure,
      dewPoint,
      // Open-Meteo has no direct heat-index field; apparent temperature
      // already accounts for humidity/wind, so it is used as the proxy.
      heatIndex: feelsLike,
    },
    hourly,
    daily,
    airQuality,
    uv,
    astronomy,
    comfort,
    rainfall,
    overview,
    running,
    pollen,
    alerts,
    commute,
    swimming,
    garden,
    locations,
    packing,
    event,
  }
}
