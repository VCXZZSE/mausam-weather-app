import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Env } from '../config/env.js'
import { fetchReverseGeocode, type ReverseGeocodeResult } from '../providers/nominatimClient.js'
import { fetchLocationSearch, type GeocodingSearchResult } from '../providers/openMeteoGeocodingClient.js'
import { KeyedMemoryCache } from '../cache/keyedMemoryCache.js'
import { coordinateCacheKey } from '../types/location.js'

const reverseQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
})

const searchQuerySchema = z.object({
  query: z.string().trim().min(1).max(100),
})

export type LocationCaches = {
  reverseGeocode: KeyedMemoryCache<ReverseGeocodeResult>
  search: KeyedMemoryCache<GeocodingSearchResult[]>
}

export function createLocationCaches(env: Env): LocationCaches {
  return {
    reverseGeocode: new KeyedMemoryCache<ReverseGeocodeResult>(env.REVERSE_GEOCODE_CACHE_TTL_MS),
    search: new KeyedMemoryCache<GeocodingSearchResult[]>(env.LOCATION_SEARCH_CACHE_TTL_MS),
  }
}

export async function locationRoute(
  app: FastifyInstance,
  options: { env: Env; caches: LocationCaches },
): Promise<void> {
  const { env, caches } = options

  // GET /api/location/reverse?latitude=..&longitude=.. — device coordinates
  // -> a human-readable place name, via Nominatim. Cached per rounded
  // coordinate so repeat lookups (e.g. app reopened at the same spot)
  // never re-hit Nominatim's rate-limited free service.
  app.get('/api/location/reverse', async (request, reply) => {
    const parsed = reverseQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid or missing latitude/longitude' })
    }
    const { latitude, longitude } = parsed.data
    const key = coordinateCacheKey(latitude, longitude)

    try {
      const result = await caches.reverseGeocode.getOrFetch(key, () =>
        fetchReverseGeocode({
          baseUrl: env.NOMINATIM_BASE_URL,
          userAgent: env.NOMINATIM_USER_AGENT,
          minIntervalMs: env.REVERSE_GEOCODE_MIN_INTERVAL_MS,
          coordinates: { latitude, longitude },
        }),
      )
      return { ...result, latitude, longitude, attribution: '© OpenStreetMap contributors' }
    } catch (error) {
      request.log.error({ err: error }, 'Reverse geocoding failed')
      return reply.status(502).send({ error: 'Unable to resolve this location right now' })
    }
  })

  // GET /api/location/search?query=.. — manual place-name/postal-code
  // search, via Open-Meteo's free geocoding API (Nominatim explicitly
  // prohibits this kind of client-facing search use).
  app.get('/api/location/search', async (request, reply) => {
    const parsed = searchQuerySchema.safeParse(request.query)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid or missing query' })
    }
    const { query } = parsed.data
    const key = query.trim().toLowerCase()

    try {
      const results = await caches.search.getOrFetch(key, () =>
        fetchLocationSearch({ baseUrl: env.OPEN_METEO_GEOCODING_URL, query }),
      )
      return { results }
    } catch (error) {
      request.log.error({ err: error }, 'Location search failed')
      return reply.status(502).send({ error: 'Location search is temporarily unavailable' })
    }
  })
}
