// Applies a static curated location list against the current normalized
// weather. Each location shares the current condition (no independent
// per-location forecast is fetched — that would require additional
// network calls out of scope for this phase); only temperature is
// adjusted using a curated, approximate regional offset.
import type { DashboardWeatherData } from '../types/dashboard.js'
import { STATIC_LOCATIONS } from '../data/locationsStatic.js'

export type LocationsInput = {
  temperature: number
  condition: string
  conditionCode: string
}

export function computeLocations(input: LocationsInput): DashboardWeatherData['locations'] {
  return STATIC_LOCATIONS.map(location => ({
    name: location.name,
    temperature: Math.round(input.temperature + location.temperatureOffset),
    condition: input.condition,
    conditionCode: input.conditionCode,
    distance: location.distance,
  }))
}
