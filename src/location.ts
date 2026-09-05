// Location-first architecture (backend-v0.2 handoff): the app must resolve
// a real user location — device GPS (reverse-geocoded) or manual search —
// before its first live weather request, rather than silently using a
// fixed default city. See §1-3 of the handoff for the full flow this
// module implements the client side of.

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

const LOCATION_STORAGE_KEY = 'mausam-location'

export function loadStoredLocation(): UserLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<UserLocation>
    if (typeof value.latitude !== 'number' || typeof value.longitude !== 'number') return null
    if (typeof value.locality !== 'string' || typeof value.source !== 'string') return null
    return value as UserLocation
  } catch {
    return null
  }
}

export function saveLocation(location: UserLocation): void {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location))
  } catch {
    // Storage can legitimately be unavailable (private browsing, quota) —
    // the location still works for the current session, it just won't
    // persist across reloads.
  }
}

export function clearStoredLocation(): void {
  try {
    localStorage.removeItem(LOCATION_STORAGE_KEY)
  } catch {
    // ignore
  }
}

/** Rounds to ~3 decimal places (~110m) — matches the backend's rounding. */
function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000
}

export type GeolocationFailureReason = 'unsupported' | 'permission-denied' | 'position-unavailable' | 'timeout'

export class GeolocationError extends Error {
  reason: GeolocationFailureReason
  constructor(reason: GeolocationFailureReason, message: string) {
    super(message)
    this.reason = reason
  }
}

const DEFAULT_GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 12_000,
  maximumAge: 300_000,
}

/**
 * Wraps navigator.geolocation.getCurrentPosition in a Promise with typed
 * failure reasons. Must be called from a user gesture (the location
 * button) per the W3C Geolocation spec and browser permission-prompt
 * requirements — never triggered automatically on page load.
 */
export function requestDeviceLocation(options: PositionOptions = DEFAULT_GEOLOCATION_OPTIONS): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeolocationError('unsupported', 'Geolocation is not supported on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      error => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new GeolocationError('permission-denied', 'Location permission was denied.'))
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          reject(new GeolocationError('position-unavailable', 'Location is currently unavailable.'))
        } else {
          reject(new GeolocationError('timeout', 'Location request timed out.'))
        }
      },
      options,
    )
  })
}

type ReverseGeocodeResponse = { locality: string; region: string; country: string; latitude: number; longitude: number }

/**
 * Resolves device coordinates into a place name via the backend's
 * reverse-geocoding endpoint (which proxies Nominatim server-side, with
 * rate limiting and caching — never called directly from the browser,
 * consistent with Nominatim's usage policy).
 */
export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<{ locality: string; region: string; country: string }> {
  const endpoint = import.meta.env.VITE_LOCATION_REVERSE_API_URL?.trim()
  if (!endpoint) throw new Error('Reverse geocoding endpoint is not configured')

  const url = new URL(endpoint)
  url.searchParams.set('latitude', String(latitude))
  url.searchParams.set('longitude', String(longitude))

  const response = await fetch(url.toString(), { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Reverse geocoding failed with status ${response.status}`)

  const body = (await response.json()) as ReverseGeocodeResponse
  return { locality: body.locality, region: body.region, country: body.country }
}

export type LocationSearchResult = {
  name: string
  region: string
  country: string
  latitude: number
  longitude: number
  timezone: string
}

/** Manual place-name/postal-code search via the backend's Open-Meteo geocoding proxy. */
export async function searchLocations(query: string, signal?: AbortSignal): Promise<LocationSearchResult[]> {
  const endpoint = import.meta.env.VITE_LOCATION_SEARCH_API_URL?.trim()
  if (!endpoint || !query.trim()) return []

  const url = new URL(endpoint)
  url.searchParams.set('query', query.trim())

  const response = await fetch(url.toString(), { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Location search failed with status ${response.status}`)

  const body = (await response.json()) as { results: LocationSearchResult[] }
  return body.results ?? []
}

/** Full device-location flow: permission -> coordinates -> reverse geocode -> UserLocation. */
export async function resolveDeviceLocation(signal?: AbortSignal): Promise<UserLocation> {
  const position = await requestDeviceLocation()
  const latitude = roundCoordinate(position.coords.latitude)
  const longitude = roundCoordinate(position.coords.longitude)

  try {
    const place = await reverseGeocodeCoordinates(latitude, longitude, signal)
    return {
      latitude,
      longitude,
      accuracyMeters: position.coords.accuracy,
      locality: place.locality,
      region: place.region,
      country: place.country,
      timezone: '', // filled in from the weather response's resolved timezone
      source: 'device',
    }
  } catch {
    // Reverse geocoding failing should not block using the coordinates —
    // the weather endpoint only needs latitude/longitude to work.
    return {
      latitude,
      longitude,
      accuracyMeters: position.coords.accuracy,
      locality: 'Current location',
      region: '',
      country: '',
      timezone: '',
      source: 'device',
    }
  }
}

export function fromSearchResult(result: LocationSearchResult): UserLocation {
  return {
    latitude: roundCoordinate(result.latitude),
    longitude: roundCoordinate(result.longitude),
    locality: result.name,
    region: result.region,
    country: result.country,
    timezone: result.timezone,
    source: 'manual',
  }
}

/** The explicitly-labelled demo location — only used when a user deliberately picks it. */
export function defaultDemoLocation(): UserLocation {
  return {
    latitude: 22.5726,
    longitude: 88.3639,
    locality: 'Kolkata',
    region: 'West Bengal',
    country: 'India',
    timezone: 'Asia/Kolkata',
    source: 'default',
  }
}
