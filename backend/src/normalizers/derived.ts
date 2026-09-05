import type { DashboardWeatherData } from '../types/dashboard.js'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export type ComfortInput = {
  temperature: number
  humidity: number
  windSpeed: number
}

// Heuristic comfort score, not a scientific index: penalizes distance from
// ~22°C, high humidity above 50%, and high wind speed.
export function computeComfort(input: ComfortInput): DashboardWeatherData['comfort'] {
  const temperaturePenalty = Math.abs(input.temperature - 22) * 3
  const humidityPenalty = Math.max(0, input.humidity - 50) * 0.8
  const windPenalty = Math.max(0, input.windSpeed - 30) * 0.5

  const index = Math.round(clamp(100 - temperaturePenalty - humidityPenalty - windPenalty, 0, 100))

  const label = index >= 70 ? 'Comfortable' : index >= 30 ? 'Uncomfortable' : 'Very Uncomfortable'
  const icon = input.temperature <= 15 ? '🥶' : label === 'Comfortable' ? '🙂' : '🥵'

  const advice = label === 'Comfortable'
    ? '🙂 Pleasant conditions for outdoor activity.'
    : label === 'Uncomfortable'
      ? '💧 Stay hydrated and take breaks if outdoors for long.'
      : '⚠️ Limit prolonged outdoor exposure; conditions are taxing.'

  return {
    index,
    label,
    icon,
    advice,
    factors: [
      { label: 'Temperature', value: `${Math.round(input.temperature)}°C`, percent: Math.round(clamp((input.temperature / 45) * 100, 0, 100)), color: '#f59e0b' },
      { label: 'Humidity', value: `${Math.round(input.humidity)}%`, percent: Math.round(clamp(input.humidity, 0, 100)), color: '#60a5fa' },
      { label: 'Wind', value: `${Math.round(input.windSpeed)} km/h`, percent: Math.round(clamp((input.windSpeed / 60) * 100, 0, 100)), color: '#a78bfa' },
    ],
  }
}

export type RainfallInput = {
  chance: number
  todayTotal: number
  monthLabel: string
}

// Only "today" is sourced from the forecast API — monthly totals/averages
// and rainfall history would require Open-Meteo's separate historical
// archive API, which is intentionally out of scope for v0.1 (kept simple,
// no extra provider dependency). Those fields are omitted so the frontend's
// deep merge preserves fallback values for them.
export function computeRainfall(input: RainfallInput): Pick<DashboardWeatherData['rainfall'], 'chance' | 'today' | 'unit' | 'periodLabel' | 'monthLabel'> {
  return {
    chance: Math.round(clamp(input.chance, 0, 100)),
    today: Math.round(input.todayTotal * 10) / 10,
    unit: 'mm',
    periodLabel: 'Today',
    monthLabel: input.monthLabel,
  }
}

// Closes the last remaining demo-data-leak gap (v0.2 review item 2):
// hydrationAdvice was previously never sent by the backend at all, so the
// frontend's old deep-merge silently filled it from DEMO_WEATHER_DATA
// even in live mode. Deterministic and heat-index-driven, same spirit as
// computeComfort above — not a measured value, just rule-based guidance.
export function computeHydrationAdvice(heatIndex: number): string {
  if (heatIndex >= 41) return '💧 Drink 3–4L water today · Avoid exertion 11 AM–4 PM · Use ORS if feeling dehydrated'
  if (heatIndex >= 35) return '💧 Drink 2–3L water today · Limit strenuous activity during peak heat'
  return '💧 Stay hydrated — drink water regularly through the day'
}

export type OverviewInput = {
  // undefined when the AQI provider is unavailable — the health card falls
  // back to UV-only rather than showing a misleading "AQI 0".
  aqiIndex: number | undefined
  aqiLabel: string
  uvIndex: number
  uvLabel: string
  rainChanceToday: number
  windSpeed: number
  bestWindowLabel: string
}

// Derived only from data already normalized elsewhere (AQI, UV, rain
// chance, wind) — no invented commute/marine data, which remain out of
// scope for this phase.
export function computeOverview(input: OverviewInput): DashboardWeatherData['overview'] {
  const healthValue = input.aqiIndex !== undefined
    ? `US AQI ${input.aqiIndex} · UV ${input.uvIndex}`
    : `UV ${input.uvIndex} · ${input.uvLabel}`

  return [
    { icon: '♥', label: 'Health', value: healthValue, tone: 'focus-health' },
    { icon: '↗', label: 'Move', value: `Best window ${input.bestWindowLabel}`, tone: 'focus-move' },
    { icon: '⌁', label: 'Commute', value: input.rainChanceToday >= 60 ? 'Rain likely · plan extra time' : 'Clear conditions expected', tone: 'focus-commute' },
    { icon: '⌂', label: 'Outdoors', value: `Wind ${Math.round(input.windSpeed)} km/h`, tone: 'focus-outdoors' },
  ]
}
