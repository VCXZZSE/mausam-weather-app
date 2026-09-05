import type { FastifyInstance } from "fastify"
import type { Env } from "../config/env.js"
import {
  fetchOpenMeteoData,
  type OpenMeteoResponse,
} from "../providers/openMeteoClient.js"
import { toDashboardWeatherData } from "../normalizers/toDashboardWeatherData.js"
import type { WeatherCaches } from "./weather.js"
import { validateBriefingRequest } from "../briefing/validateBriefingRequest.js"
import { validateBriefingResponse } from "../briefing/validateBriefingResponse.js"
import { DeterministicBriefingGenerator } from "../briefing/DeterministicBriefingGenerator.js"
import type { BriefingGenerator } from "../briefing/BriefingGenerator.js"
import { coordinateCacheKey } from "../types/location.js"
import { resolveAirQuality } from "../aqi/resolveAirQuality.js"

const generator: BriefingGenerator = new DeterministicBriefingGenerator()

export async function personalizedBriefingRoute(
  app: FastifyInstance,
  options: { env: Env caches: WeatherCaches },
): Promise<void> {
  const { env, caches } = options

  app.post("/api/personalized-briefing", async (request, reply) => {
    let briefingRequest
    try {
      briefingRequest = validateBriefingRequest(request.body)
    } catch {
      return reply.status(400).send({ error: "Invalid request body" })
    }

    // Per backend-v0.2 handoff §11, the briefing must reason over the
    // SAME coordinates the caller's weather view is showing. When the
    // request supplies explicit latitude/longitude, those are used (and
    // the same coordinate-keyed cache as GET /api/weather is reused —
    // no duplicate Open-Meteo calls for the same location). Falling back
    // to the configured default location is only allowed when
    // ALLOW_DEFAULT_LOCATION is enabled, exactly like the weather route.
    const hasExplicitCoordinates =
      briefingRequest.latitude !== undefined &&
      briefingRequest.longitude !== undefined
    if (!hasExplicitCoordinates && !env.ALLOW_DEFAULT_LOCATION) {
      return reply
        .status(400)
        .send({ error: "latitude and longitude are required" })
    }
    const coordinates = hasExplicitCoordinates
      ? {
          latitude: briefingRequest.latitude!,
          longitude: briefingRequest.longitude!,
        }
      : { latitude: env.DEFAULT_LATITUDE, longitude: env.DEFAULT_LONGITUDE }
    const cacheKey = coordinateCacheKey(
      coordinates.latitude,
      coordinates.longitude,
    )

    const forecastPromise = caches.forecast.getOrFetch(cacheKey, () =>
      fetchOpenMeteoData({ baseUrl: env.OPEN_METEO_BASE_URL, coordinates }),
    )
    const airQualityPromise = resolveAirQuality(
      env,
      caches.airQuality,
      coordinates,
      request.log,
    )

    let forecast: OpenMeteoResponse
    try {
      forecast = await forecastPromise
    } catch (error) {
      request.log.error(
        { err: error },
        "Failed to load weather data for personalized briefing",
      )
      return reply
        .status(502)
        .send({ error: "Weather data is temporarily unavailable" })
    }

    const airQuality = await airQualityPromise

    const weather = toDashboardWeatherData(forecast, airQuality, {
      city:
        briefingRequest.location ??
        (hasExplicitCoordinates ? "Selected location" : env.DEFAULT_CITY),
      region: hasExplicitCoordinates ? "" : env.DEFAULT_REGION,
      country: "",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      source: hasExplicitCoordinates ? "manual" : "default",
    })

    try {
      const briefing = generator.generate(weather, briefingRequest)
      return validateBriefingResponse(briefing)
    } catch (error) {
      request.log.error(
        { err: error },
        "Failed to generate personalized briefing",
      )
      return reply
        .status(500)
        .send({ error: "Unable to generate personalized briefing" })
    }
  })
}
