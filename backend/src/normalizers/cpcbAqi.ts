import type { CpcbRecord } from "../providers/cpcbClient.js"
import type { DashboardWeatherData } from "../types/dashboard.js"

// CPCB National Air Quality Index sub-index breakpoints, per CPCB's
// published methodology ("National Air Quality Index", CPCB, 2014).
// Concentrations: µg/m³ for PM2.5/PM10/NO2/SO2/O3 (24h avg, 8h for O3),
// mg/m³ for CO (8h avg). Each pollutant's measured concentration is
// linearly interpolated within the breakpoint range it falls into to
// produce a 0-500 sub-index; the overall AQI is the MAX sub-index across
// all pollutants actually reported by the nearest station.
type Breakpoint = {
  concLow: number
  concHigh: number
  indexLow: number
  indexHigh: number
}

const BREAKPOINTS: Record<string, Breakpoint[]> = {
  "PM2.5": [
    { concLow: 0, concHigh: 30, indexLow: 0, indexHigh: 50 },
    { concLow: 31, concHigh: 60, indexLow: 51, indexHigh: 100 },
    { concLow: 61, concHigh: 90, indexLow: 101, indexHigh: 200 },
    { concLow: 91, concHigh: 120, indexLow: 201, indexHigh: 300 },
    { concLow: 121, concHigh: 250, indexLow: 301, indexHigh: 400 },
    { concLow: 251, concHigh: 380, indexLow: 401, indexHigh: 500 },
  ],
  PM10: [
    { concLow: 0, concHigh: 50, indexLow: 0, indexHigh: 50 },
    { concLow: 51, concHigh: 100, indexLow: 51, indexHigh: 100 },
    { concLow: 101, concHigh: 250, indexLow: 101, indexHigh: 200 },
    { concLow: 251, concHigh: 350, indexLow: 201, indexHigh: 300 },
    { concLow: 351, concHigh: 430, indexLow: 301, indexHigh: 400 },
    { concLow: 431, concHigh: 510, indexLow: 401, indexHigh: 500 },
  ],
  NO2: [
    { concLow: 0, concHigh: 40, indexLow: 0, indexHigh: 50 },
    { concLow: 41, concHigh: 80, indexLow: 51, indexHigh: 100 },
    { concLow: 81, concHigh: 180, indexLow: 101, indexHigh: 200 },
    { concLow: 181, concHigh: 280, indexLow: 201, indexHigh: 300 },
    { concLow: 281, concHigh: 400, indexLow: 301, indexHigh: 400 },
    { concLow: 401, concHigh: 500, indexLow: 401, indexHigh: 500 },
  ],
  SO2: [
    { concLow: 0, concHigh: 40, indexLow: 0, indexHigh: 50 },
    { concLow: 41, concHigh: 80, indexLow: 51, indexHigh: 100 },
    { concLow: 81, concHigh: 380, indexLow: 101, indexHigh: 200 },
    { concLow: 381, concHigh: 800, indexLow: 201, indexHigh: 300 },
    { concLow: 801, concHigh: 1600, indexLow: 301, indexHigh: 400 },
    { concLow: 1601, concHigh: 2100, indexLow: 401, indexHigh: 500 },
  ],
  CO: [
    { concLow: 0, concHigh: 1.0, indexLow: 0, indexHigh: 50 },
    { concLow: 1.1, concHigh: 2.0, indexLow: 51, indexHigh: 100 },
    { concLow: 2.1, concHigh: 10, indexLow: 101, indexHigh: 200 },
    { concLow: 10.1, concHigh: 17, indexLow: 201, indexHigh: 300 },
    { concLow: 17.1, concHigh: 34, indexLow: 301, indexHigh: 400 },
    { concLow: 34.1, concHigh: 50, indexLow: 401, indexHigh: 500 },
  ],
  OZONE: [
    { concLow: 0, concHigh: 50, indexLow: 0, indexHigh: 50 },
    { concLow: 51, concHigh: 100, indexLow: 51, indexHigh: 100 },
    { concLow: 101, concHigh: 168, indexLow: 101, indexHigh: 200 },
    { concLow: 169, concHigh: 208, indexLow: 201, indexHigh: 300 },
    { concLow: 209, concHigh: 748, indexLow: 301, indexHigh: 400 },
    { concLow: 749, concHigh: 939, indexLow: 401, indexHigh: 500 },
  ],
}

const IN_NAQI_CATEGORIES: Array<{ max: number label: string icon: string }> = [
  { max: 50, label: "Good", icon: "😊" },
  { max: 100, label: "Satisfactory", icon: "🙂" },
  { max: 200, label: "Moderate", icon: "😐" },
  { max: 300, label: "Poor", icon: "😷" },
  { max: 400, label: "Very Poor", icon: "🚫" },
  { max: Infinity, label: "Severe", icon: "☠️" },
]

function categorize(index: number) {
  return (
    IN_NAQI_CATEGORIES.find((category) => index <= category.max) ??
    IN_NAQI_CATEGORIES[IN_NAQI_CATEGORIES.length - 1]
  )
}

function subIndex(
  pollutantId: string,
  concentration: number,
): number | undefined {
  const table = BREAKPOINTS[pollutantId]
  if (!table) return undefined
  const range = table.find(
    (bp) => concentration >= bp.concLow && concentration <= bp.concHigh,
  )
  if (!range) {
    // Above the highest published breakpoint: clamp to the top of the
    // last band rather than extrapolating indefinitely.
    if (concentration > table[table.length - 1].concHigh) return 500
    return undefined
  }
  const { concLow, concHigh, indexLow, indexHigh } = range
  return Math.round(
    ((indexHigh - indexLow) / (concHigh - concLow)) *
      (concentration - concLow) +
      indexLow,
  )
}

// Haversine distance in kilometers.
function distanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const POLLUTANT_DISPLAY: Record<string, {
  label: string
  unit: string
  scaleMax: number
  color: string
}> = {
  "PM2.5": { label: "PM2.5", unit: "µg/m³", scaleMax: 380, color: "#f59e0b" },
  PM10: { label: "PM10", unit: "µg/m³", scaleMax: 510, color: "#f97316" },
  OZONE: { label: "O₃", unit: "µg/m³", scaleMax: 400, color: "#60a5fa" },
  NO2: { label: "NO₂", unit: "µg/m³", scaleMax: 500, color: "#a78bfa" },
  SO2: { label: "SO₂", unit: "µg/m³", scaleMax: 800, color: "#34d399" },
  CO: { label: "CO", unit: "mg/m³", scaleMax: 17, color: "#f472b6" },
}

export type NearestStationResult = DashboardWeatherData["airQuality"] | undefined

/**
 * Groups raw CPCB records by station, finds the nearest station to the
 * requested coordinates within maxDistanceKm, computes each reported
 * pollutant's CPCB sub-index, and returns the overall AQI as the maximum
 * sub-index — CPCB's own published methodology, not an invented formula.
 * Returns undefined ("no usable station/data") when no station is within
 * range or no pollutant on the nearest station parses into a valid
 * sub-index. Callers omit AQI when no genuine CPCB reading is available.
 */
export function normalizeCpcbAirQuality(
  records: CpcbRecord[],
  target: { latitude: number longitude: number },
  maxDistanceKm: number,
): NearestStationResult {
  const stations = new Map<string, {
    latitude: number
    longitude: number
    records: CpcbRecord[]
  }>()
  for (const record of records) {
    const lat = Number(record.latitude)
    const lon = Number(record.longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    const key = record.station ?? `${lat},${lon}`
    const existing = stations.get(key)
    if (existing) existing.records.push(record)
    else stations.set(key, { latitude: lat, longitude: lon, records: [record] })
  }

  let nearest: {
    name: string
    latitude: number
    longitude: number
    records: CpcbRecord[]
    distance: number
  } | undefined
  for (const [name, station] of stations) {
    const distance = distanceKm(
      target.latitude,
      target.longitude,
      station.latitude,
      station.longitude,
    )
    if (distance > maxDistanceKm) continue
    if (!nearest || distance < nearest.distance) {
      nearest = {
        name,
        latitude: station.latitude,
        longitude: station.longitude,
        records: station.records,
        distance,
      }
    }
  }

  if (!nearest) return undefined

  const pollutants: NonNullable<DashboardWeatherData["airQuality"]>["pollutants"] =
    []
  let maxSubIndex = 0
  let subIndexCount = 0

  for (const record of nearest.records) {
    const display = POLLUTANT_DISPLAY[record.pollutant_id]
    const concentration = Number(record.pollutant_avg)
    if (!display || !Number.isFinite(concentration)) continue

    const index = subIndex(record.pollutant_id, concentration)
    if (index !== undefined) {
      maxSubIndex = Math.max(maxSubIndex, index)
      subIndexCount += 1
    }

    pollutants.push({
      label: display.label,
      value: Math.round(concentration),
      scaleMax: display.scaleMax,
      unit: display.unit,
      color: display.color,
    })
  }

  if (pollutants.length === 0 || subIndexCount === 0) return undefined

  const { label, icon } = categorize(maxSubIndex)

  return {
    index: maxSubIndex,
    scaleMax: 500,
    scaleLabels: IN_NAQI_CATEGORIES.map((category) => category.label),
    label,
    updatedLabel: nearest.records[0]?.last_update
      ? `Station update: ${nearest.records[0].last_update}`
      : "Updated just now",
    icon,
    advice: adviceForNaqi(label),
    standard: "IN_NAQI",
    source: "CPCB",
    stationName: nearest.name,
    stationDistanceKm: Math.round(nearest.distance * 10) / 10,
    pollutants,
  }
}

function adviceForNaqi(label: string): string {
  switch (label) {
    case "Good":
      return "✅ Air quality is good — safe for outdoor activity."
    case "Satisfactory":
      return "🙂 Air quality is acceptable for most people."
    case "Moderate":
      return "💡 Sensitive groups should reduce prolonged outdoor exertion."
    case "Poor":
      return "😷 Limit prolonged outdoor exertion; consider a mask."
    case "Very Poor":
      return "🚫 Avoid outdoor exertion; keep windows closed."
    default:
      return "🚨 Severe air quality — stay indoors if possible."
  }
}
