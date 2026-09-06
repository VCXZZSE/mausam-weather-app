import { z } from "zod"

// CPCB (Central Pollution Control Board) real-time station air-quality
// data, via the Government of India's open data portal (data.gov.in).
// Free registration required for an API key — see backend/.env.example.
//
// Official dataset: https://www.data.gov.in/catalog/real-time-air-quality-index
// Records contain pollutant-wise AQI values. Live verification requires a
// personal data.gov.in key; mock fixtures do not establish live availability.
const numericText=z.union([z.string(),z.number()]).transform(String)

const cpcbRecordSchema=z.object({
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  station: z.string().optional(),
  last_update: z.string().optional(),
  pollutant_id: z.string(),
  pollutant_avg: numericText.nullish(),
  avg_value: numericText.nullish(),

  latitude: numericText,
  longitude: numericText,
}).transform(({ avg_value,pollutant_avg,...record }) => ({
  ...record,
  // The current OGD schema uses avg_value; older exports use pollutant_avg.
  pollutant_avg: avg_value??pollutant_avg??undefined,
}))

const cpcbResponseSchema=z.object({
  records: z.array(cpcbRecordSchema),
  total: z.coerce.number().int().nonnegative().optional(),
})

export type CpcbRecord=z.infer<typeof cpcbRecordSchema>

export type FetchCpcbOptions={
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
 * treats this as "CPCB unavailable" and omits the AQI section.
 */
export async function fetchCpcbRecords(
  options: FetchCpcbOptions,
): Promise<CpcbRecord[]> {
  const {
    baseUrl,
    apiKey,
    limit=5000,
    timeoutMs=5000,
    fetchImpl=fetch,
  }=options
  if(!apiKey) {
    throw new Error("CPCB (data.gov.in) API key is not configured")
  }

  const url=new URL(baseUrl)
  url.searchParams.set("api-key",apiKey)
  url.searchParams.set("format","json")
  url.searchParams.set("limit",String(limit))

  const controller=new AbortController()
  const timeout=setTimeout(() => controller.abort(),timeoutMs)

  try {
    const records: CpcbRecord[]=[]
    // Read all pages: a single truncated bulk page can omit nearby stations.
    for(let page=0;page<100;page+=1) {
      url.searchParams.set("offset",String(records.length))
      const response=await fetchImpl(url.toString(),{
        signal: controller.signal,
        headers: { Accept: "application/json" },
      })
      if(!response.ok) throw new Error(`CPCB request failed with status ${response.status}`)
      const result=cpcbResponseSchema.safeParse(await response.json())
      if(!result.success) throw new Error("CPCB response failed validation")
      const body=result.data
      records.push(...body.records)
      if(body.total!==undefined? records.length>=body.total:body.records.length<limit) return records
      if(body.records.length===0) throw new Error("CPCB response ended before all records were received")
    }
    throw new Error("CPCB pagination limit exceeded")
  } finally {
    clearTimeout(timeout)
  }
}
