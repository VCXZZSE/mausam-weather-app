import type { Env } from "../config/env.js"
import { MemoryCache } from "../cache/memoryCache.js"
import { fetchCpcbRecords, type CpcbRecord } from "../providers/cpcbClient.js"
import { normalizeCpcbAirQuality } from "../normalizers/cpcbAqi.js"
import type { DashboardWeatherData } from "../types/dashboard.js"

// Single orchestration point for India's CPCB National AQI —
// reused by both GET /api/weather and POST /api/personalized-briefing so
// the logic and cache exist in exactly one place. US AQI is deliberately
// not used as a fallback: mixing two national standards would make the
// category, bar and health advice misleading. Missing CPCB data is shown
// honestly as unavailable by the frontend.
export type AirQualityCaches = {
  cpcbBulk: MemoryCache<CpcbRecord[]>
}

export function createAirQualityCaches(env: Env): AirQualityCaches {
  return {
    cpcbBulk: new MemoryCache<CpcbRecord[]>(env.CPCB_CACHE_TTL_MS),
  }
}

export type MinimalLogger = {
  warn: (obj: unknown, msg?: string) => void
}

export async function resolveAirQuality(
  env: Env,
  caches: AirQualityCaches,
  coordinates: { latitude: number longitude: number },
  log: MinimalLogger,
): Promise<DashboardWeatherData["airQuality"] | undefined> {
  if (!env.DATA_GOV_IN_API_KEY) return undefined

  try {
    const records = await caches.cpcbBulk.getOrFetch(() =>
      fetchCpcbRecords({
        baseUrl: env.DATA_GOV_IN_BASE_URL,
        apiKey: env.DATA_GOV_IN_API_KEY,
      }),
    )
    const result = normalizeCpcbAirQuality(
      records,
      coordinates,
      env.CPCB_MAX_STATION_DISTANCE_KM,
    )
    if (!result)
      log.warn(
        { coordinates },
        "No usable CPCB station reading is available near these coordinates",
      )
    return result
  } catch (error) {
    log.warn(
      { err: error },
      "CPCB National AQI is unavailable; omitting airQuality rather than substituting US AQI",
    )
    return undefined
  }
}
