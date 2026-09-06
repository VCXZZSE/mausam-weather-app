import { XMLParser, XMLValidator } from "fast-xml-parser"
import { z } from "zod"
import { fetchReverseGeocode } from "../providers/nominatimClient.js"
import type { AdvisoryResponse, OfficialAlert } from "./types.js"

const ROOT = "https://sachet.ndma.gov.in/cap_public_website/"
const parser = new XMLParser({ removeNSPrefix: true, parseTagValue: false, ignoreAttributes: true })
const queryNumber = (min: number, max: number) => z.preprocess(
  value => typeof value === "string" && value.trim() ? Number(value) : value,
  z.number().finite().min(min).max(max),
)
export const advisoryQuerySchema = z.object({
  latitude: queryNumber(-90, 90), longitude: queryNumber(-180, 180),
  postalCode: z.string().regex(/^[1-9]\d{5}$/).optional(),
})
type Query = z.infer<typeof advisoryQuerySchema>
const indexSchema = z.array(z.object({
  identifier: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]).transform(String),
  area_description: z.string(),
})).max(2000)

// Bounded, coalesced caches. Never serve a stale successful result on failure.
const cache = new Map<string, { until: number; value: unknown }>()
const pending = new Map<string, Promise<unknown>>()
async function cached<T>(key: string, ttl: number, read: () => Promise<T>): Promise<T> {
  const entry = cache.get(key)
  if (entry && entry.until > Date.now()) return entry.value as T
  if (pending.has(key)) return pending.get(key) as Promise<T>
  const task = read().then(value => {
    if (cache.size >= 512) cache.delete(cache.keys().next().value!)
    cache.set(key, { until: Date.now() + ttl, value })
    return value
  }).finally(() => pending.delete(key))
  pending.set(key, task)
  return task
}
async function governmentText(url: string): Promise<string> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000), redirect: "error",
    headers: { Accept: "application/xml, application/json, text/xml" },
  })
  if (!response.ok) throw new Error("Official feed unavailable")
  const text = await response.text()
  if (text.length > 4_000_000) throw new Error("Official feed too large")
  return text
}
function xml(text: string): any {
  if (/<!DOCTYPE|<!ENTITY/i.test(text) || XMLValidator.validate(text) !== true) {
    throw new Error("Invalid CAP document")
  }
  return parser.parse(text)
}
const list = (value: any): any[] => value === undefined ? [] : Array.isArray(value) ? value : [value]
const normalize = (value: string) => value.toLowerCase().replace(/\bdistrict\b/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim()

/** Deliberately strict: an issuing office's name is never a location match.
 * Unknown geography returns null, so incomplete coverage cannot become all-clear.
 */
export function matchArea(description: string, district: string | undefined, state: string): boolean | null {
  const parts = description.split(/\s+districts?\s+of\s+/i)
  if (parts.length === 2) {
    if (normalize(parts[1]) !== normalize(state)) return false
    if (!district) return null
    return parts[0].split(/,|\s+and\s+/i).some(name => normalize(name) === normalize(district))
  }
  if (normalize(description) === normalize(state)) return true
  // A bare district name without its state is ambiguous across India.
  return null
}

export function parseOfficialCap(text: string, url: string, district: string | undefined, state: string, now = Date.now()): OfficialAlert | null {
  const alert = xml(text).alert
  if (!alert || typeof alert.identifier !== "string") throw new Error("Invalid CAP alert")
  if (alert.status !== "Actual" || alert.scope !== "Public" || alert.msgType === "Cancel") return null
  if (!["Alert", "Update"].includes(alert.msgType)) return null
  const infos = list(alert.info)
  const info = infos.find(item => /^en(?:-|$)/i.test(item.language ?? "")) ?? infos[0]
  if (!info) throw new Error("Missing CAP information")
  const issued = Date.parse(alert.sent), expires = Date.parse(info.expires)
  const effective = Date.parse(info.effective || alert.sent)
  if (![issued, expires, effective].every(Number.isFinite)) throw new Error("Missing CAP validity")
  if (expires <= now || effective > now || issued > now) return null
  const areas = list(info.area)
  const area = areas.find(item => typeof item.areaDesc === "string" && matchArea(item.areaDesc, district, state) === true)
  if (!area) return null
  if (typeof info.event !== "string" || typeof info.headline !== "string") throw new Error("Missing CAP message")
  return {
    id: alert.identifier, title: info.event,
    description: info.description || info.headline,
    instruction: typeof info.instruction === "string" ? info.instruction : undefined,
    area: area.areaDesc, source: info.senderName || alert.sender || "NDMA Sachet",
    url, issuedAt: new Date(issued).toISOString(), expiresAt: new Date(expires).toISOString(),
    severity: info.severity || "Unknown",
  }
}

export function unavailableAdvisories(): AdvisoryResponse {
  return { checkedAt: null, categories: {
    general: { status: "unavailable", alerts: [] },
    farming: { status: "unavailable", alerts: [] },
    fishing: { status: "unavailable", alerts: [] },
  } }
}

export async function getOfficialAdvisories(query: Query): Promise<AdvisoryResponse> {
  const result = unavailableAdvisories()
  try {
    const [place, index] = await Promise.all([
      cached(`place:${query.latitude},${query.longitude}`, 86_400_000, () => fetchReverseGeocode({
        baseUrl: "https://nominatim.openstreetmap.org/reverse",
        userAgent: "MausamWeatherApp/1.0 (official advisory location resolver)",
        minIntervalMs: 1000, coordinates: query,
      })),
      cached("index", 180_000, async () => ({
        rows: indexSchema.parse(JSON.parse(await governmentText(`${ROOT}FetchAllAlertDetails`))),
        checkedAt: new Date().toISOString(),
      })),
    ])
    if (place.country.toLowerCase() !== "india") return result
    let complete = index.rows.length > 0
    const candidates = index.rows.filter(row => {
      const match = matchArea(row.area_description, place.district, place.region)
      if (match === null) complete = false
      return match === true
    })
    // Avoid a burst to the authority when a large number of warnings is issued.
    if (candidates.length > 20) complete = false
    for (let i = 0; i < Math.min(candidates.length, 20); i += 4) {
      const responses = await Promise.allSettled(candidates.slice(i, Math.min(i + 4, 20)).map(async row => {
        const url = `${ROOT}FetchXMLFile?identifier=${encodeURIComponent(row.identifier)}`
        const text = await cached(`cap:${row.identifier}`, 180_000, () => governmentText(url))
        return parseOfficialCap(text, url, place.district, place.region)
      }))
      for (const response of responses) {
        if (response.status === "rejected") { complete = false; continue }
        const alert = response.value
        if (!alert) continue
        // Categorise only explicit advisory topics, never incidental words in instructions.
        const category = /fisher|fishing|marine/i.test(alert.title) ? "fishing"
          : /agromet|agricultur|farming|crop advisory/i.test(alert.title) ? "farming" : "general"
        if (!result.categories[category].alerts.some(existing => existing.id === alert.id)) {
          result.categories[category].alerts.push(alert)
        }
      }
    }
    const rank: Record<string, number> = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1 }
    for (const category of Object.values(result.categories)) {
      category.alerts.sort((a, b) => (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0) || Date.parse(b.issuedAt) - Date.parse(a.issuedAt))
    }
    result.checkedAt = index.checkedAt
    result.categories.general.status = complete ? "available" : "unavailable"
    // CAP is not a complete farming/marine bulletin service. Until their dedicated
    // official feeds are verified, an empty CAP subset must not mean no advisory.
    return result
  } catch {
    return result
  }
}
