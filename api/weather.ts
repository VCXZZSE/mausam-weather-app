// Vercel serverless function for weather data.
//
// This mirrors backend/src/routes/weather.ts exactly, reusing the same
// shared transformation pipeline (lib/**, copied from backend/src/**)
// instead of returning the raw Open-Meteo response. See
// api/README.md for the live weather pipeline and deployment configuration.
//
// The shared modules live in lib/ at the project root, NOT under api/:
// Vercel turns every file under api/ into its own Serverless Function, so
// keeping them here made the deployment exceed the Hobby plan's 12-function
// limit (and created entrypoints with no default export). Vercel still
// bundles lib/** into this function by tracing these imports.
import { z } from "zod"
import { loadEnv } from "../lib/config/env.js"
import { fetchOpenMeteoData } from "../lib/providers/openMeteoClient.js"
import { toDashboardWeatherData } from "../lib/normalizers/toDashboardWeatherData.js"
import { KeyedMemoryCache } from "../lib/cache/keyedMemoryCache.js"
import { coordinateCacheKey } from "../lib/types/location.js"
import {
  createAirQualityCaches,
  resolveAirQuality,
} from "../lib/aqi/resolveAirQuality.js"

// Module-level state survives across warm invocations of the same
// serverless instance (not across cold starts or other instances) — the
// same best-effort caching behavior the Fastify backend gets from its own
// long-lived process, just with a shorter effective lifetime.
const env = loadEnv(process.env)
const forecastCache = new KeyedMemoryCache<Awaited<ReturnType<typeof fetchOpenMeteoData>>>(
  env.WEATHER_CACHE_TTL_MS,
)
const airQualityCaches = createAirQualityCaches(env)

const weatherQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  locality: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  source: z.enum(["device", "manual"]).optional(),
})

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {
    const parsedQuery = weatherQuerySchema.safeParse(req.query)
    if (!parsedQuery.success) {
      return res.status(400).json({ error: "Invalid latitude/longitude" })
    }
    const query = parsedQuery.data

    const hasExplicitCoordinates =
      query.latitude !== undefined && query.longitude !== undefined
    if (!hasExplicitCoordinates && !env.ALLOW_DEFAULT_LOCATION) {
      return res.status(400).json({ error: "latitude and longitude are required" })
    }

    const coordinates = hasExplicitCoordinates
      ? { latitude: query.latitude!, longitude: query.longitude! }
      : { latitude: env.DEFAULT_LATITUDE, longitude: env.DEFAULT_LONGITUDE }
    const locationSource = hasExplicitCoordinates
      ? (query.source ?? "manual")
      : "default"
    const cacheKey = coordinateCacheKey(coordinates.latitude, coordinates.longitude)

    // Same rationale as the Fastify route: the forecast and CPCB station
    // feed are independent providers, started together so AQI latency is
    // never added on top of weather latency.
    const forecastPromise = forecastCache.getOrFetch(cacheKey, () =>
      fetchOpenMeteoData({ baseUrl: env.OPEN_METEO_BASE_URL, coordinates }),
    )
    const airQualityPromise = resolveAirQuality(
      env,
      airQualityCaches,
      coordinates,
      { warn: (obj: unknown, msg?: string) => console.warn(msg ?? "", obj) },
    )

    let forecast
    try {
      forecast = await forecastPromise
    } catch (error) {
      console.error("Failed to load core weather data:", error)
      return res.status(502).json({ error: "Weather data is temporarily unavailable" })
    }

    // AQI is non-critical: any CPCB failure degrades gracefully by omitting
    // the section — never by substituting a different country's standard.
    const airQuality = await airQualityPromise

    const payload = toDashboardWeatherData(forecast, airQuality, {
      city:
        query.locality ??
        (hasExplicitCoordinates ? "Selected location" : env.DEFAULT_CITY),
      region: query.region ?? (hasExplicitCoordinates ? "" : env.DEFAULT_REGION),
      country: query.country ?? "",
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      source: locationSource,
    })

    return res.status(200).json(payload)
  } catch (error) {
    console.error("Weather API handler error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
}
