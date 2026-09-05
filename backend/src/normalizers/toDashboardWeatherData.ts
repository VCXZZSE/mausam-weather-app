import type { OpenMeteoResponse } from '../providers/openMeteoClient.js'
import type { DailyForecast, DashboardWeatherData, HourlyForecast } from '../types/dashboard.js'
import { degreesToCompass, resolveCondition, resolveHeroVariant } from './conditionCode.js'

// Phase 1 only ever sources current/hourly/daily from Open-Meteo. Fields
// like hydrationAdvice are intentionally omitted so the frontend's deep
// merge preserves the fallback dataset's value for them.
export type Phase1WeatherPayload = {
  updatedAt: string
  current: Partial<DashboardWeatherData['current']>
  hourly: HourlyForecast[]
  daily: DailyForecast[]
}

export type NormalizeContext = {
  city: string
  region: string
}

function findHourIndex(hourlyTimes: string[], targetTime: string): number {
  const exact = hourlyTimes.indexOf(targetTime)
  if (exact !== -1) return exact
  const now = new Date(targetTime).getTime()
  let closestIndex = 0
  let closestDiff = Infinity
  hourlyTimes.forEach((time, index) => {
    const diff = Math.abs(new Date(time).getTime() - now)
    if (diff < closestDiff) {
      closestDiff = diff
      closestIndex = index
    }
  })
  return closestIndex
}

function formatHourLabel(isoTime: string, index: number): string {
  if (index === 0) return 'Now'
  const date = new Date(isoTime)
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: undefined, hour12: true })
}

function formatDayLabel(isoDate: string, index: number): string {
  if (index === 0) return 'Today'
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-IN', { weekday: 'short' })
}

export function toDashboardWeatherData(
  data: OpenMeteoResponse,
  context: NormalizeContext,
): Phase1WeatherPayload {
  const currentHourIndex = findHourIndex(data.hourly.time, data.current_weather.time)

  const { conditionCode, condition } = resolveCondition(data.current_weather.weathercode)
  const heroVariant = resolveHeroVariant(conditionCode, condition)

  const feelsLike = Math.round(data.hourly.apparent_temperature[currentHourIndex])
  const humidity = Math.round(data.hourly.relative_humidity_2m[currentHourIndex])
  const pressure = Math.round(data.hourly.surface_pressure[currentHourIndex])
  const dewPoint = Math.round(data.hourly.dew_point_2m[currentHourIndex])
  const visibilityMeters = data.hourly.visibility[currentHourIndex]
  const windGust = Math.round(data.hourly.wind_gusts_10m[currentHourIndex])

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

  return {
    updatedAt: 'Updated just now',
    current: {
      city: context.city,
      region: context.region,
      temperature: Math.round(data.current_weather.temperature),
      feelsLike,
      condition,
      conditionCode,
      heroVariant,
      high: Math.round(data.daily.temperature_2m_max[0]),
      low: Math.round(data.daily.temperature_2m_min[0]),
      humidity,
      windSpeed: Math.round(data.current_weather.windspeed),
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
  }
}
