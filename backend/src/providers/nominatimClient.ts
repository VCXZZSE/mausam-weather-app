import { z } from "zod"

// Nominatim (OpenStreetMap) reverse geocoding — free, no API key, but its
// usage policy (see backend-v0.2 handoff §3) requires a descriptive
// User-Agent, on-screen attribution (added by the frontend), and at most
// ~1 request/second. This module enforces that rate limit in-process
// since Nominatim itself will start rejecting/blocking a client that
// exceeds it, and the caller (routes/location.ts) additionally caches
// results so repeat lookups for the same coordinates never re-call it.

const addressSchema = z.object({
  neighbourhood: z.string().optional(),
  quarter: z.string().optional(),
  suburb: z.string().optional(),
  city_district: z.string().optional(),
  hamlet: z.string().optional(),
  village: z.string().optional(),
  town: z.string().optional(),
  city: z.string().optional(),
  municipality: z.string().optional(),
  county: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  country_code: z.string().optional(),
  postcode: z.string().optional(),
})

const nominatimResponseSchema = z.object({
  address: addressSchema.optional(),
  display_name: z.string().optional(),
})

export type ReverseGeocodeResult = {
  locality: string
  region: string
  country: string
  postalCode?: string
}

export type IndiaLocationSearchResult = {
  name: string
  region: string
  country: "India"
  postalCode?: string
  latitude: number
  longitude: number
  timezone: "Asia/Kolkata"
}

const nominatimSearchItemSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  name: z.string().optional(),
  display_name: z.string().optional(),
  address: addressSchema.optional(),
})

const nominatimSearchResponseSchema = z.array(nominatimSearchItemSchema)

// Prefer the smallest useful named area before the parent city. This makes
// device coordinates show Kadamtala/Ballygunge/etc. instead of collapsing
// every Kolkata Metropolitan Area result to "Kolkata".
const LOCALITY_FIELD_PRIORITY = [
  "neighbourhood",
  "quarter",
  "suburb",
  "hamlet",
  "village",
  "town",
  "city_district",
  "city",
  "municipality",
] as const

let lastCallAt = 0

async function throttle(minIntervalMs: number): Promise<void> {
  const elapsed = Date.now() - lastCallAt
  if (elapsed < minIntervalMs) {
    await new Promise((resolve) => setTimeout(resolve, minIntervalMs - elapsed))
  }
  lastCallAt = Date.now()
}

export type FetchReverseGeocodeOptions = {
  baseUrl: string
  userAgent: string
  minIntervalMs: number
  coordinates: { latitude: number longitude: number }
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

function resolveLocality(
  address: z.infer<typeof addressSchema>,
  fallback?: string,
): string {
  return (
    LOCALITY_FIELD_PRIORITY.map((field) => address[field]).find(Boolean) ??
    fallback?.split(",")[0]?.trim() ??
    "Unknown area"
  )
}

export async function fetchReverseGeocode(
  options: FetchReverseGeocodeOptions,
): Promise<ReverseGeocodeResult> {
  const {
    baseUrl,
    userAgent,
    minIntervalMs,
    coordinates,
    timeoutMs = 8000,
    fetchImpl = fetch,
  } = options

  await throttle(minIntervalMs)

  const url = new URL(baseUrl)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("lat", String(coordinates.latitude))
  url.searchParams.set("lon", String(coordinates.longitude))
  url.searchParams.set("addressdetails", "1")
  // Zoom 18 returns the address hierarchy around the actual coordinate;
  // we still deliberately display the first neighbourhood-like field,
  // never a house number or exact street address.
  url.searchParams.set("zoom", "18")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": userAgent, Accept: "application/json" },
    })
    if (!response.ok) {
      throw new Error(`Nominatim request failed with status ${response.status}`)
    }
    const body: unknown = await response.json()
    const result = nominatimResponseSchema.safeParse(body)
    if (!result.success) {
      throw new Error("Nominatim response failed validation")
    }

    const address = result.data.address ?? {}
    const locality = resolveLocality(address, result.data.display_name)
    const region = address.state ?? address.county ?? "Unknown region"
    const country = address.country ?? "Unknown country"

    return { locality, region, country, postalCode: address.postcode }
  } finally {
    clearTimeout(timeout)
  }
}

export type FetchIndiaLocationSearchOptions = {
  baseUrl: string
  userAgent: string
  minIntervalMs: number
  query: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

/**
 * Explicit, user-submitted India-only location lookup. This is intentionally
 * not used for type-ahead/autocomplete: the public Nominatim service forbids
 * client autocomplete. It supports both named localities and six-digit PINs.
 */
export async function fetchIndiaLocationSearch(
  options: FetchIndiaLocationSearchOptions,
): Promise<IndiaLocationSearchResult[]> {
  const {
    baseUrl,
    userAgent,
    minIntervalMs,
    query,
    timeoutMs = 8000,
    fetchImpl = fetch,
  } = options
  const normalizedQuery = query.trim()
  const isPinCode = /^[1-9]\d{5}$/.test(normalizedQuery)

  await throttle(minIntervalMs)

  const url = new URL(baseUrl)
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("addressdetails", "1")
  url.searchParams.set("countrycodes", "in")
  url.searchParams.set("accept-language", "en")
  url.searchParams.set("limit", "8")
  if (isPinCode) {
    url.searchParams.set("postalcode", normalizedQuery)
    url.searchParams.set("country", "India")
  } else {
    url.searchParams.set("q", `${normalizedQuery}, India`)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url.toString(), {
      signal: controller.signal,
      headers: { "User-Agent": userAgent, Accept: "application/json" },
    })
    if (!response.ok)
      throw new Error(`Nominatim search failed with status ${response.status}`)

    const body: unknown = await response.json()
    const parsed = nominatimSearchResponseSchema.safeParse(body)
    if (!parsed.success)
      throw new Error("Nominatim search response failed validation")

    const seen = new Set<string>()
    return parsed.data.flatMap((item) => {
      const address = item.address ?? {}
      const belongsToIndia =
        address.country_code?.toLowerCase() === "in" ||
        address.country?.trim().toLowerCase() === "india"
      const latitude = Number(item.lat)
      const longitude = Number(item.lon)
      if (
        !belongsToIndia ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      )
        return []

      const locality = resolveLocality(address, item.name ?? item.display_name)
      const postalCode =
        address.postcode ?? (isPinCode ? normalizedQuery : undefined)
      const dedupeKey = `${locality.toLowerCase()}|${postalCode ?? ""}|${latitude.toFixed(4)},${longitude.toFixed(4)}`
      if (seen.has(dedupeKey)) return []
      seen.add(dedupeKey)

      return [
        {
          name: locality,
          region: address.state ?? address.county ?? "",
          country: "India" as const,
          postalCode,
          latitude,
          longitude,
          timezone: "Asia/Kolkata" as const,
        },
      ]
    })
  } finally {
    clearTimeout(timeout)
  }
}
