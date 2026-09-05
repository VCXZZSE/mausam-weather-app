import type { FastifyInstance } from 'fastify'
import type { Env } from '../config/env.js'
import { fetchOpenMeteoData, type OpenMeteoResponse } from '../providers/openMeteoClient.js'
import { fetchOpenMeteoAirQuality, type OpenMeteoAirQualityResponse } from '../providers/openMeteoAirQualityClient.js'
import { toDashboardWeatherData } from '../normalizers/toDashboardWeatherData.js'
import { MemoryCache } from '../cache/memoryCache.js'

export type WeatherCaches = {
  forecast: MemoryCache<OpenMeteoResponse>
  airQuality: MemoryCache<OpenMeteoAirQualityResponse>
}

export function createWeatherCaches(env: Env): WeatherCaches {
  return {
    forecast: new MemoryCache<OpenMeteoResponse>(env.WEATHER_CACHE_TTL_MS),
    airQuality: new MemoryCache<OpenMeteoAirQualityResponse>(env.AIR_QUALITY_CACHE_TTL_MS),
  }
}

export async function weatherRoute(
  app: FastifyInstance,
  options: { env: Env; caches: WeatherCaches },
): Promise<void> {
  const { env, caches } = options
  const coordinates = { latitude: env.DEFAULT_LATITUDE, longitude: env.DEFAULT_LONGITUDE }

  app.get('/api/weather', async (request, reply) => {
    let forecast: OpenMeteoResponse
    try {
      forecast = await caches.forecast.getOrFetch(() =>
        fetchOpenMeteoData({ baseUrl: env.OPEN_METEO_BASE_URL, coordinates }),
      )
    } catch (error) {
      request.log.error({ err: error }, 'Failed to load core weather data and no cached value is available')
      return reply.status(502).send({ error: 'Weather data is temporarily unavailable' })
    }

    // Air quality is treated as non-critical: any failure (including no
    // cached last-good value) degrades gracefully by omitting the
    // airQuality section, rather than failing the whole request.
    let airQuality: OpenMeteoAirQualityResponse | undefined
    try {
      airQuality = await caches.airQuality.getOrFetch(() =>
        fetchOpenMeteoAirQuality({ baseUrl: env.OPEN_METEO_AIR_QUALITY_URL, coordinates }),
      )
    } catch (error) {
      request.log.warn({ err: error }, 'Air quality data unavailable; omitting airQuality section')
      airQuality = undefined
    }

    const payload = toDashboardWeatherData(forecast, airQuality, {
      city: env.DEFAULT_CITY,
      region: env.DEFAULT_REGION,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    })
    return payload
  })
}
