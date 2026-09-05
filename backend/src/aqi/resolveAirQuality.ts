import type { Env } from '../config/env.js'
import { MemoryCache } from '../cache/memoryCache.js'
import { KeyedMemoryCache } from '../cache/keyedMemoryCache.js'
import { fetchCpcbRecords, type CpcbRecord } from '../providers/cpcbClient.js'
import { normalizeCpcbAirQuality } from '../normalizers/cpcbAqi.js'
import { fetchOpenMeteoAirQuality, type OpenMeteoAirQualityResponse } from '../providers/openMeteoAirQualityClient.js'
import { normalizeAirQuality } from '../normalizers/airQuality.js'
import type { DashboardWeatherData } from '../types/dashboard.js'
import { coordinateCacheKey } from '../types/location.js'

// Single orchestration point for "which AQI source do we actually use" —
// reused by both GET /api/weather and POST /api/personalized-briefing so
// the logic (and its caches) exist in exactly one place (backend-v0.2
// handoff: "reuse the existing AQI architecture rather than duplicating
// it"). CPCB is tried first (only if a key is configured); any failure —
// missing key, network error, no station within range, unparseable data —
// falls back to the existing Open-Meteo path, which is left completely
// unmodified.
export type AirQualityCaches = {
  cpcbBulk: MemoryCache<CpcbRecord[]>
  openMeteo: KeyedMemoryCache<OpenMeteoAirQualityResponse>
}

export function createAirQualityCaches(env: Env): AirQualityCaches {
  return {
    cpcbBulk: new MemoryCache<CpcbRecord[]>(env.CPCB_CACHE_TTL_MS),
    openMeteo: new KeyedMemoryCache<OpenMeteoAirQualityResponse>(env.AIR_QUALITY_CACHE_TTL_MS),
  }
}

export type MinimalLogger = {
  warn: (obj: unknown, msg?: string) => void
}

export async function resolveAirQuality(
  env: Env,
  caches: AirQualityCaches,
  coordinates: { latitude: number; longitude: number },
  referenceTime: string,
  log: MinimalLogger,
): Promise<DashboardWeatherData['airQuality'] | undefined> {
  if (env.DATA_GOV_IN_API_KEY) {
    try {
      const records = await caches.cpcbBulk.getOrFetch(() =>
        fetchCpcbRecords({ baseUrl: env.DATA_GOV_IN_BASE_URL, apiKey: env.DATA_GOV_IN_API_KEY }),
      )
      const cpcbResult = normalizeCpcbAirQuality(records, coordinates, env.CPCB_MAX_STATION_DISTANCE_KM)
      if (cpcbResult) return cpcbResult
      log.warn({ coordinates }, 'No CPCB station within range for these coordinates; falling back to Open-Meteo AQI')
    } catch (error) {
      log.warn({ err: error }, 'CPCB (data.gov.in) AQI unavailable; falling back to Open-Meteo AQI')
    }
  }

  try {
    const cacheKey = coordinateCacheKey(coordinates.latitude, coordinates.longitude)
    const raw = await caches.openMeteo.getOrFetch(cacheKey, () =>
      fetchOpenMeteoAirQuality({ baseUrl: env.OPEN_METEO_AIR_QUALITY_URL, coordinates }),
    )
    return normalizeAirQuality(raw, referenceTime)
  } catch (error) {
    log.warn({ err: error }, 'Air quality data unavailable from all sources; omitting airQuality section')
    return undefined
  }
}
