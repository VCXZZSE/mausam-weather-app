// CURATED / RULE-BASED DEMO ALERTS — NOT sourced from IMD or any live
// government alert feed. There is no free, reliable IMD API (see
// BACKEND_HANDOFF_LOCAL.md). These are deterministic, threshold-based
// advisories derived only from the already-normalized live weather values
// (temperature, wind, rain chance, condition, month). The `source` field
// is intentionally NOT "IMD" so this is never mistaken for an official
// government warning.
import type { DashboardWeatherData } from '../types/dashboard.js'

export type CuratedAlertInput = {
  conditionCode: string
  temperature: number
  windSpeed: number
  rainChanceToday: number
  month: number
  aqiIndex?: number
}

type AlertTemplate = DashboardWeatherData['alerts'][number]

function buildAlert(
  level: 'Red' | 'Orange' | 'Yellow',
  title: string,
  body: string,
): AlertTemplate {
  const palette = {
    Red: { dotColor: '#ef4444', background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' },
    Orange: { dotColor: '#f97316', background: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.2)' },
    Yellow: { dotColor: '#eab308', background: 'rgba(234,179,8,0.1)', borderColor: 'rgba(234,179,8,0.2)' },
  }[level]

  return {
    level,
    ...palette,
    title,
    body,
    time: 'Just now',
    source: 'Mausam Weather Advisory',
  }
}

const RAINY_CONDITIONS = new Set(['drizzle', 'showers', 'rain', 'heavy_rain', 'thunderstorm', 'storm'])
const MONSOON_MONTHS = new Set([5, 6, 7, 8])

/**
 * Deterministic threshold-based advisories. Same inputs always produce the
 * same alerts, in the same order (most severe first). Returns an empty
 * array when nothing crosses a threshold — this is the expected "normal"
 * state, not a missing-data condition.
 */
export function computeCuratedAlerts(input: CuratedAlertInput): DashboardWeatherData['alerts'] {
  const alerts: AlertTemplate[] = []

  if (input.conditionCode === 'thunderstorm' || input.conditionCode === 'storm') {
    alerts.push(buildAlert(
      'Red',
      'Thunderstorm Advisory',
      'Thunderstorms expected. Avoid open areas, tall isolated trees, and unnecessary travel.',
    ))
  } else if (MONSOON_MONTHS.has(input.month) && input.rainChanceToday >= 80 && RAINY_CONDITIONS.has(input.conditionCode)) {
    alerts.push(buildAlert(
      'Red',
      'Monsoon Flooding Risk',
      'High rain chance during peak monsoon season. Low-lying areas may experience waterlogging.',
    ))
  } else if (input.rainChanceToday >= 70) {
    alerts.push(buildAlert(
      'Orange',
      'Heavy Rainfall Warning',
      `Rain chance is ${Math.round(input.rainChanceToday)}%. Allow extra travel time and avoid underpasses.`,
    ))
  }

  if (input.windSpeed >= 40) {
    alerts.push(buildAlert('Yellow', 'Strong Wind Advisory', `Wind gusts near ${Math.round(input.windSpeed)} km/h expected. Secure loose outdoor items.`))
  }

  if (input.temperature >= 42) {
    alerts.push(buildAlert('Red', 'Extreme Heat Warning', 'Dangerously high temperatures expected. Avoid outdoor exertion during peak hours.'))
  } else if (input.temperature >= 38) {
    alerts.push(buildAlert('Orange', 'Heatwave Advisory', 'High temperatures expected. Stay hydrated and limit midday outdoor activity.'))
  }

  if (input.aqiIndex !== undefined && input.aqiIndex >= 150) {
    alerts.push(buildAlert('Orange', 'Poor Air Quality Advisory', 'Air quality is unhealthy for sensitive groups. Consider limiting prolonged outdoor exertion.'))
  }

  const severityOrder: Record<string, number> = { Red: 0, Orange: 1, Yellow: 2 }
  return alerts.sort((a, b) => severityOrder[a.level] - severityOrder[b.level])
}
