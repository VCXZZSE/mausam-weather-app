import type { FastifyInstance } from 'fastify'
import type { Env } from '../config/env.js'
import { fetchOpenMeteoData } from '../providers/openMeteoClient.js'
import { toDashboardWeatherData, type Phase1WeatherPayload } from '../normalizers/toDashboardWeatherData.js'
import { MemoryCache } from '../cache/memoryCache.js'

export function createWeatherCache(env: Env): MemoryCache<Phase1WeatherPayload> {
  return new MemoryCache<Phase1WeatherPayload>(env.WEATHER_CACHE_TTL_MS)
}

export async function weatherRoute(
  app: FastifyInstance,
  options: { env: Env; cache: MemoryCache<Phase1WeatherPayload> },
): Promise<void> {
  const { env, cache } = options

  app.get('/api/weather', async (request, reply) => {
    try {
      const payload = await cache.getOrFetch(async () => {
        const raw = await fetchOpenMeteoData({
          baseUrl: env.OPEN_METEO_BASE_URL,
          coordinates: { latitude: env.DEFAULT_LATITUDE, longitude: env.DEFAULT_LONGITUDE },
        })
        return toDashboardWeatherData(raw, { city: env.DEFAULT_CITY, region: env.DEFAULT_REGION })
      })
      return payload
    } catch (error) {
      request.log.error({ err: error }, 'Failed to load weather data and no cached value is available')
      return reply.status(502).send({ error: 'Weather data is temporarily unavailable' })
    }
  })
}
