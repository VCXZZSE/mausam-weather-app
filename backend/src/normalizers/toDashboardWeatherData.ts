import type { OpenMeteoResponse } from '../providers/openMeteoClient.js'
import type { OpenMeteoAirQualityResponse } from '../providers/openMeteoAirQualityClient.js'
import type { DailyForecast, DashboardWeatherData, HourlyForecast } from '../types/dashboard.js'
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
import { parseKolkataCalendarDate, toKolkataInstant } from '../utils/kolkataTime.js'

// Sections intentionally NOT produced here (running, rainfall.month/
// monthlyAverage/history) are left out of the returned object so the
// frontend's deep merge preserves DEMO_WEATHER_DATA's fallback values.
//
// Data provenance (see BACKEND_HANDOFF_LOCAL.md §16):
//  LIVE:    current/hourly/daily (Open-Meteo forecast), airQuality (Open-Meteo AQI)
//  LOCAL COMPUTATION: uv, astronomy, comfort, rainfall (derived from live values)
//  CURATED/RULE-BASED: pollen, alerts, commute, swimming, garden, locations,
//                       packing, event — deterministic demo content, not live
//                       measurements. See each module's header comment.
export type WeatherPayload = {
  updatedAt: string
  current: Partial<DashboardWeatherData['current']>
  hourly: HourlyForecast[]
  daily: DailyForecast[]
  airQuality?: DashboardWeatherData['airQuality']
  uv: DashboardWeatherData['uv']
  astronomy: DashboardWeatherData['astronomy']
  comfort: DashboardWeatherData['comfort']
  rainfall: Pick<DashboardWeatherData['rainfall'], 'chance' | 'today' | 'unit' | 'periodLabel' | 'monthLabel'>
  overview: DashboardWeatherData['overview']
  pollen: DashboardWeatherData['pollen']
  alerts: DashboardWeatherData['alerts']
  commute: DashboardWeatherData['commute']
  swimming: DashboardWeatherData['swimming']
  garden: DashboardWeatherData['garden']
  locations: DashboardWeatherData['locations']
  packing: DashboardWeatherData['packing']
  event: DashboardWeatherData['event']
}

/** @deprecated kept for backward compatibility with earlier Phase 1 imports */
export type Phase1WeatherPayload = WeatherPayload

export type NormalizeContext = {
  city: string
  region: string
  latitude: number
  longitude: number
}

function formatHourLabel(isoTime: string, index: number): string {
  if (index === 0) return 'Now'
  // Kolkata wall-clock hour — parsed and formatted independent of the
  // server's local timezone (see utils/kolkataTime.ts).
  const date = parseKolkataCalendarDate(isoTime)
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: undefined, hour12: true, timeZone: 'UTC' })
}

function formatDayLabel(isoDate: string, index: number): string {
  if (index === 0) return 'Today'
  const date = parseKolkataCalendarDate(isoDate)
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

  // Astronomy needs the real absolute instant (see kolkataTime.ts).
  const astronomy = calculateAstronomy(toKolkataInstant(data.current_weather.time), {
    latitude: context.latitude,
    longitude: context.longitude,
  })

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
    monthLabel: parseKolkataCalendarDate(data.current_weather.time).toLocaleDateString('en-IN', { month: 'long', timeZone: 'UTC' }),
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

  // Kolkata CALENDAR date — read only with UTC getters/timeZone:'UTC'
  // formatting (see utils/kolkataTime.ts). Do not use for real instant math.
  const currentDate = parseKolkataCalendarDate(data.current_weather.time)
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

  return {
    updatedAt: 'Updated just now',
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
