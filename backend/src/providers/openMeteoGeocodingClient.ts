import { z } from 'zod'

// Open-Meteo's Geocoding API — free, no API key. Used for manual location
// search (place name / postal code -> coordinates), per backend-v0.2
// handoff §3. Nominatim explicitly prohibits client-side/autocomplete use
// for this purpose, so it is not used here.

const geocodingResultSchema = z.object({
  id: z.number(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  country: z.string().optional(),
  admin1: z.string().optional(),
  timezone: z.string().optional(),
})

const geocodingResponseSchema = z.object({
  results: z.array(geocodingResultSchema).optional(),
})

export type GeocodingSearchResult = {
  name: string
  region: string
  country: string
  latitude: number
  longitude: number
  timezone: string
}

export type FetchLocationSearchOptions = {
  baseUrl: string
  query: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

export async function fetchLocationSearch(options: FetchLocationSearchOptions): Promise<GeocodingSearchResult[]> {
  const { baseUrl, query, timeoutMs = 8000, fetchImpl = fetch } = options

  const url = new URL(baseUrl)
  url.searchParams.set('name', query)
  url.searchParams.set('count', '5')
  url.searchParams.set('language', 'en')
  url.searchParams.set('format', 'json')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url.toString(), { signal: controller.signal })
    if (!response.ok) {
      throw new Error(`Open-Meteo geocoding request failed with status ${response.status}`)
    }
    const body: unknown = await response.json()
    const result = geocodingResponseSchema.safeParse(body)
    if (!result.success) {
      throw new Error('Open-Meteo geocoding response failed validation')
    }

    return (result.data.results ?? []).map(item => ({
      name: item.name,
      region: item.admin1 ?? '',
      country: item.country ?? '',
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone ?? 'auto',
    }))
  } finally {
    clearTimeout(timeout)
  }
}
