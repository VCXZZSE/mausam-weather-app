export type LocationSource = 'device' | 'manual' | 'default'

export type UserLocation = {
  latitude: number
  longitude: number
  accuracyMeters?: number
  locality: string
  region: string
  country: string
  timezone: string
  source: LocationSource
}

/** Rounds to ~3 decimal places (~110m precision) — enough for weather grids. */
export function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function coordinateCacheKey(latitude: number, longitude: number): string {
  return `${roundCoordinate(latitude).toFixed(3)},${roundCoordinate(longitude).toFixed(3)}`
}
