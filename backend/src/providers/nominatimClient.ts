import { z } from 'zod'

// Nominatim (OpenStreetMap) reverse geocoding — free, no API key, but its
// usage policy (see backend-v0.2 handoff §3) requires a descriptive
// User-Agent, on-screen attribution (added by the frontend), and at most
// ~1 request/second. This module enforces that rate limit in-process
// since Nominatim itself will start rejecting/blocking a client that
// exceeds it, and the caller (routes/location.ts) additionally caches
// results so repeat lookups for the same coordinates never re-call it.

const addressSchema = z.object({
  neighbourhood: z.string().optional(),
  suburb: z.string().optional(),
  city_district: z.string().optional(),
  town: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
})

const nominatimResponseSchema = z.object({
  address: addressSchema.optional(),
  display_name: z.string().optional(),
})

export type ReverseGeocodeResult = {
  locality: string
  region: string
  country: string
}

const LOCALITY_FIELD_PRIORITY = ['neighbourhood', 'suburb', 'city_district', 'town', 'city'] as const

let lastCallAt = 0

async function throttle(minIntervalMs: number): Promise<void> {
  const elapsed = Date.now() - lastCallAt
  if (elapsed < minIntervalMs) {
    await new Promise(resolve => setTimeout(resolve, minIntervalMs - elapsed))
  }
  lastCallAt = Date.now()
}

export type FetchReverseGeocodeOptions = {
  baseUrl: string
  userAgent: string
  minIntervalMs: number
  coordinates: { latitude: number; longitude: number }
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export async function fetchReverseGeocode(options: FetchReverseGeocodeOptions): Promise<ReverseGeocodeResult> {
  const { baseUrl, userAgent, minIntervalMs, coordinates, timeoutMs = 8000, fetchImpl = fetch } = options

  await throttle(minIntervalMs)

  const url = new URL(baseUrl)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(coordinates.latitude))
  url.searchParams.set('lon', String(coordinates.longitude))
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('zoom', '14')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
      headers: { 'User-Agent': userAgent, Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`Nominatim request failed with status ${response.status}`)
    }
    const body: unknown = await response.json()
    const result = nominatimResponseSchema.safeParse(body)
    if (!result.success) {
      throw new Error('Nominatim response failed validation')
    }

    const address = result.data.address ?? {}
    const locality = LOCALITY_FIELD_PRIORITY.map(field => address[field]).find(Boolean)
      ?? result.data.display_name?.split(',')[0]?.trim()
      ?? 'Unknown area'
    const region = address.state ?? address.county ?? 'Unknown region'
    const country = address.country ?? 'Unknown country'

    return { locality, region, country }
  } finally {
    clearTimeout(timeout)
  }
}
