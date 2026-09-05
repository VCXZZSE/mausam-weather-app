import type { FastifyInstance } from 'fastify'
import type { Env } from '../config/env.js'
import { fetchOpenMeteoData, type OpenMeteoResponse } from '../providers/openMeteoClient.js'
import { fetchOpenMeteoAirQuality, type OpenMeteoAirQualityResponse } from '../providers/openMeteoAirQualityClient.js'
import { toDashboardWeatherData } from '../normalizers/toDashboardWeatherData.js'
import type { WeatherCaches } from './weather.js'
import { validateBriefingRequest } from '../briefing/validateBriefingRequest.js'
import { validateBriefingResponse } from '../briefing/validateBriefingResponse.js'
import { DeterministicBriefingGenerator } from '../briefing/DeterministicBriefingGenerator.js'
import type { BriefingGenerator } from '../briefing/BriefingGenerator.js'

const generator: BriefingGenerator = new DeterministicBriefingGenerator()

export async function personalizedBriefingRoute(
  app: FastifyInstance,
  options: { env: Env; caches: WeatherCaches },
): Promise<void> {
  const { env, caches } = options
  const coordinates = { latitude: env.DEFAULT_LATITUDE, longitude: env.DEFAULT_LONGITUDE }

  app.post('/api/personalized-briefing', async (request, reply) => {
    let briefingRequest
    try {
      briefingRequest = validateBriefingRequest(request.body)
    } catch {
      return reply.status(400).send({ error: 'Invalid request body' })
    }

    // Reuses the same weather/AQI caches as GET /api/weather — no extra
    // Open-Meteo calls are made for this endpoint. `location` is accepted
    // in the request for forward-compatibility but not yet used to change
    // which coordinates are queried (v0.1 only serves the configured
    // default city) — see class limitations in the Phase 4 report.
    let forecast: OpenMeteoResponse
    try {
      forecast = await caches.forecast.getOrFetch(() =>
        fetchOpenMeteoData({ baseUrl: env.OPEN_METEO_BASE_URL, coordinates }),
      )
    } catch (error) {
      request.log.error({ err: error }, 'Failed to load weather data for personalized briefing')
      return reply.status(502).send({ error: 'Weather data is temporarily unavailable' })
    }

    let airQuality: OpenMeteoAirQualityResponse | undefined
    try {
      airQuality = await caches.airQuality.getOrFetch(() =>
        fetchOpenMeteoAirQuality({ baseUrl: env.OPEN_METEO_AIR_QUALITY_URL, coordinates }),
      )
    } catch (error) {
      request.log.warn({ err: error }, 'Air quality unavailable for personalized briefing')
      airQuality = undefined
    }

    const weather = toDashboardWeatherData(forecast, airQuality, {
      city: env.DEFAULT_CITY,
      region: env.DEFAULT_REGION,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    })

    try {
      const briefing = generator.generate(weather, briefingRequest)
      return validateBriefingResponse(briefing)
    } catch (error) {
      request.log.error({ err: error }, 'Failed to generate personalized briefing')
      return reply.status(500).send({ error: 'Unable to generate personalized briefing' })
    }
  })
}
