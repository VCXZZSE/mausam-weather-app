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

// An unconfigured key is a deployment mistake, not a runtime condition, so
// it is reported once per process instead of on every weather request.
let warnedMissingKey = false

/** Exposed for tests; resets the once-per-process warning latch. */
export function resetAirQualityWarnings(): void {
  warnedMissingKey = false
}

/** Error text with any `api-key=…` value masked, safe to log. */
export function redactApiKey(error: unknown): string {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return message.replace(/([?&]api-key=)[^&\s"']+/gi, "$1[REDACTED]")
}

export async function resolveAirQuality(
  env: Env,
  caches: AirQualityCaches,
  coordinates: { latitude: number; longitude: number },
  log: MinimalLogger,
  options: { force?: boolean } = {},
): Promise<DashboardWeatherData["airQuality"] | undefined> {
  if (!env.DATA_GOV_IN_API_KEY) {
    // Previously a silent return, which made a missing key indistinguishable
    // from "no station nearby" — the AQI section just never appeared.
    if (!warnedMissingKey) {
      warnedMissingKey = true
      log.warn(
        { provider: "CPCB", setting: "DATA_GOV_IN_API_KEY" },
        "DATA_GOV_IN_API_KEY is not set, so the AQI section is omitted from every response. Add a free data.gov.in key to backend/.env (see backend/.env.example).",
      )
    }
    return undefined
  }

  try {
    const records = await caches.cpcbBulk.getOrFetch(
      () =>
        fetchCpcbRecords({
          baseUrl: env.DATA_GOV_IN_BASE_URL,
          apiKey: env.DATA_GOV_IN_API_KEY,
        }),
      options,
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
    // Provider errors can contain request URLs carrying the government API
    // key, so the reason is redacted rather than dropped — without it a
    // 403, a schema change and a timeout all looked identical.
    log.warn(
      { provider: "CPCB", reason: redactApiKey(error) },
      "CPCB National AQI is unavailable; omitting airQuality rather than substituting US AQI",
    )
    return undefined
  }
}
