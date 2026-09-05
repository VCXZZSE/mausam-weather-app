import { z } from 'zod'

// CPCB (Central Pollution Control Board) real-time station air-quality
// data, via the Government of India's open data portal (data.gov.in).
// Free registration required for an API key — see backend/.env.example.
//
// IMPORTANT VERIFICATION NOTE: this client's field mapping is based on the
// publicly documented schema of data.gov.in resource
// 3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69 ("Real time Air Quality Index from
// various locations"), which is the commonly referenced CPCB real-time AQI
// dataset on the portal. The endpoint itself was confirmed reachable in
// development (it returns a structured `{"error":"Key not authorised"}`
// for an invalid key, rather than a network failure), but the actual
// success-path response shape has NOT been verified against a live
// authorized response, because no valid DATA_GOV_IN_API_KEY was available
// in the development environment. Treat this integration as implemented
// but NOT live-verified until exercised with a real key — see the Phase
// report for details.
//
// Each record in this dataset is one pollutant reading at one monitoring
// station (not a pre-aggregated AQI) — the AQI itself is computed from
// these readings using CPCB's own published sub-index methodology, see
// normalizers/cpcbAqi.ts.

const cpcbRecordSchema = z.object({
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  station: z.string().optional(),
  last_update: z.string().optional(),
  pollutant_id: z.string(),
  pollutant_avg: z.string().optional(),
  pollutant_min: z.string().optional(),
  pollutant_max: z.string().optional(),
  latitude: z.string(),
  longitude: z.string(),
})

const cpcbResponseSchema = z.object({
  records: z.array(cpcbRecordSchema),
})

export type CpcbRecord = z.infer<typeof cpcbRecordSchema>

export type FetchCpcbOptions = {
  baseUrl: string
  apiKey: string
  limit?: number
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

/**
 * Fetches a bulk page of current CPCB station readings (across many
 * cities — the API has no lat/lon query parameter, so nearest-station
 * matching happens client-side, see normalizers/cpcbAqi.ts). Throws on
 * any failure (missing key, HTTP error, invalid shape) — the caller
 * treats this as "CPCB unavailable" and falls back to Open-Meteo.
 */
export async function fetchCpcbRecords(options: FetchCpcbOptions): Promise<CpcbRecord[]> {
  const { baseUrl, apiKey, limit = 2000, timeoutMs = 8000, fetchImpl = fetch } = options
  if (!apiKey) {
    throw new Error('CPCB (data.gov.in) API key is not configured')
  }

  const url = new URL(baseUrl)
  url.searchParams.set('api-key', apiKey)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', String(limit))

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url.toString(), { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!response.ok) {
      throw new Error(`CPCB (data.gov.in) request failed with status ${response.status}`)
    }
    const body: unknown = await response.json()
    const result = cpcbResponseSchema.safeParse(body)
    if (!result.success) {
      throw new Error('CPCB (data.gov.in) response failed validation')
    }
    return result.data.records
  } finally {
    clearTimeout(timeout)
  }
}
