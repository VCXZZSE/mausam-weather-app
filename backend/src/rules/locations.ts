// Applies a static curated location list against the current normalized
// weather. No independent per-location forecast is fetched (that would
// require additional network calls out of scope for this project) — most
// locations share Kolkata's live condition as a regional approximation,
// while climatically distinct locations use a curated conditionOverride
// instead (see data/locationsStatic.ts) so a Kolkata thunderstorm is never
// shown 600km away in the Darjeeling hills. Temperature is always
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
    condition: location.conditionOverride?.condition ?? input.condition,
    conditionCode: location.conditionOverride?.conditionCode ?? input.conditionCode,
    distance: location.distance,
  }))
}
