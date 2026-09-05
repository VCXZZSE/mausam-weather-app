import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import type { Env } from '../config/env.js'
import { fetchOpenMeteoData, type OpenMeteoResponse } from '../providers/openMeteoClient.js'
import { toDashboardWeatherData } from '../normalizers/toDashboardWeatherData.js'
import { KeyedMemoryCache } from '../cache/keyedMemoryCache.js'
import { coordinateCacheKey, type LocationSource } from '../types/location.js'
import { createAirQualityCaches, resolveAirQuality, type AirQualityCaches } from '../aqi/resolveAirQuality.js'

export type WeatherCaches = {
  forecast: KeyedMemoryCache<OpenMeteoResponse>
  airQuality: AirQualityCaches
}

export function createWeatherCaches(env: Env): WeatherCaches {
  return {
    forecast: new KeyedMemoryCache<OpenMeteoResponse>(env.WEATHER_CACHE_TTL_MS),
    airQuality: createAirQualityCaches(env),
  }
}

// Coordinates are optional ONLY so the app stays usable for local
// development/curl/tests without a location already resolved — see
// backend-v0.2 handoff §4 ("Only use environment defaults when an
// explicit development/demo flag is enabled") and env.ALLOW_DEFAULT_LOCATION.
// A frontend request that has a real device/manual location MUST always
// pass latitude/longitude explicitly.
const weatherQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  locality: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  source: z.enum(['device', 'manual']).optional(),
})

export async function weatherRoute(
  app: FastifyInstance,
  options: { env: Env; caches: WeatherCaches },
): Promise<void> {
  const { env, caches } = options

  app.get('/api/weather', async (request, reply) => {
    const parsedQuery = weatherQuerySchema.safeParse(request.query)
    if (!parsedQuery.success) {
      return reply.status(400).send({ error: 'Invalid latitude/longitude' })
    }
    const query = parsedQuery.data

    const hasExplicitCoordinates = query.latitude !== undefined && query.longitude !== undefined
    if (!hasExplicitCoordinates && !env.ALLOW_DEFAULT_LOCATION) {
      return reply.status(400).send({ error: 'latitude and longitude are required' })
    }

    const coordinates = hasExplicitCoordinates
      ? { latitude: query.latitude!, longitude: query.longitude! }
      : { latitude: env.DEFAULT_LATITUDE, longitude: env.DEFAULT_LONGITUDE }
    const locationSource: LocationSource = hasExplicitCoordinates ? (query.source ?? 'manual') : 'default'
    const cacheKey = coordinateCacheKey(coordinates.latitude, coordinates.longitude)

    let forecast: OpenMeteoResponse
    try {
      forecast = await caches.forecast.getOrFetch(cacheKey, () =>
        fetchOpenMeteoData({ baseUrl: env.OPEN_METEO_BASE_URL, coordinates }),
      )
    } catch (error) {
      request.log.error({ err: error }, 'Failed to load core weather data and no cached value is available')
      return reply.status(502).send({ error: 'Weather data is temporarily unavailable' })
    }

    // AQI resolution (CPCB first if configured, else Open-Meteo) is
    // treated as non-critical: any failure degrades gracefully by
    // omitting the airQuality section entirely — see aqi/resolveAirQuality.ts.
    const airQuality = await resolveAirQuality(env, caches.airQuality, coordinates, forecast.current_weather.time, request.log)

    const payload = toDashboardWeatherData(forecast, airQuality, {
      city: query.locality ?? (hasExplicitCoordinates ? 'Selected location' : env.DEFAULT_CITY),
      region: query.region ?? (hasExplicitCoordinates ? '' : env.DEFAULT_REGION),
      country: query.country ?? '',
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      source: locationSource,
    })
    return payload
  })
}
