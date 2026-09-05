// RULE-BASED swimming suitability guidance. `venue`/`distance` are a
// static curated placeholder (no live venue data source); `waterTemperature`
// is a rough approximation from air temperature, not a measured reading —
// documented so it is never mistaken for live sensor data.
import type { DashboardWeatherData } from '../types/dashboard.js'

export type SwimmingInput = {
  conditionCode: string
  temperature: number
  uvIndex: number
  windSpeed: number
  rainChanceToday: number
  peakTime: string
}

const UNSAFE_CONDITIONS = new Set(['thunderstorm', 'storm'])
const POOR_CONDITIONS = new Set(['heavy_rain', 'rain', 'showers'])

export function computeSwimming(input: SwimmingInput): DashboardWeatherData['swimming'] {
  let badge: string
  let advice: string

  if (UNSAFE_CONDITIONS.has(input.conditionCode)) {
    badge = 'UNSAFE'
    advice = '🚫 Swimming not advised due to thunderstorm risk'
  } else if (POOR_CONDITIONS.has(input.conditionCode) && input.rainChanceToday >= 60) {
    badge = 'ROUGH'
    advice = '🚫 Swimming not advised due to heavy rain'
  } else if (input.windSpeed >= 35) {
    badge = 'CAUTION'
    advice = '⚠️ Rough conditions expected due to strong wind'
  } else if (input.uvIndex >= 8) {
    badge = 'CAUTION'
    advice = '🧴 High UV — use waterproof sunscreen and limit exposure time'
  } else {
    badge = 'FAVORABLE'
    advice = '✅ Good conditions for swimming'
  }

  // Approximation only: water temperature is not independently measured.
  const waterTemperature = Math.round(Math.max(20, Math.min(32, input.temperature - 3)))

  return {
    badge,
    venue: 'Kolkata Swimming Pool',
    distance: '12km',
    depth: 2.1,
    depthUnit: 'm',
    waterTemperature,
    peakTime: input.peakTime,
    advice,
  }
}
