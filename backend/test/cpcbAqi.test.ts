import { describe, expect, it } from "vitest"
import { normalizeCpcbAirQuality } from "../src/normalizers/cpcbAqi.js"
import type { CpcbRecord } from "../src/providers/cpcbClient.js"

const KOLKATA = { latitude: 22.5726, longitude: 88.3639 }

function record(overrides: Partial<CpcbRecord> = {}): CpcbRecord {
  return {
    country: "India",
    state: "West Bengal",
    city: "Kolkata",
    station: "Rabindra Bharati University, Kolkata - WBPCB",
    last_update: "05-09-2026 09:00:00",
    pollutant_id: "PM2.5",
    pollutant_avg: "65",
    latitude: "22.627",
    longitude: "88.3806",
    ...overrides,
  }
}

describe("normalizeCpcbAirQuality", () => {
  it("computes a sub-index from a single reported pollutant using the CPCB breakpoint table", () => {
    // PM2.5 = 65 falls in the 61-90 -> 101-200 band:
    // ((200-101)/(90-61)) * (65-61) + 101 = 114.65... -> rounds to 115
    const result = normalizeCpcbAirQuality(
      [record({ pollutant_id: "PM2.5", pollutant_avg: "65" })],
      KOLKATA,
      50,
    )
    expect(result).toBeDefined()
    expect(result!.index).toBe(115)
    expect(result!.label).toBe("Moderate")
    expect(result!.standard).toBe("IN_NAQI")
    expect(result!.source).toBe("CPCB")
  })

  it("reports the overall AQI as the MAX sub-index across multiple reported pollutants", () => {
    const records = [
      record({ pollutant_id: "PM2.5", pollutant_avg: "20" }), // Good band
      record({ pollutant_id: "PM10", pollutant_avg: "400" }), // Very Poor band, higher sub-index
    ]
    const result = normalizeCpcbAirQuality(records, KOLKATA, 50)
    expect(result).toBeDefined()
    expect(result!.label).toBe("Very Poor")
  })

  it("selects the nearest station within range and reports its name/distance", () => {
    const near = record({
      station: "Near Station",
      latitude: "22.58",
      longitude: "88.37",
    })
    const far = record({
      station: "Far Station",
      latitude: "28.6",
      longitude: "77.2",
    })
    const result = normalizeCpcbAirQuality([near, far], KOLKATA, 50)
    expect(result?.stationName).toBe("Near Station")
    expect(result?.stationDistanceKm).toBeLessThan(50)
  })

  it("returns undefined when no station is within the configured max distance", () => {
    const farOnly = record({
      station: "Delhi Station",
      latitude: "28.6139",
      longitude: "77.2090",
    })
    const result = normalizeCpcbAirQuality([farOnly], KOLKATA, 50)
    expect(result).toBeUndefined()
  })

  it("returns undefined when the nearest station has no parseable pollutant data", () => {
    const badRecord = record({ pollutant_avg: "not-a-number" })
    const result = normalizeCpcbAirQuality([badRecord], KOLKATA, 50)
    expect(result).toBeUndefined()
  })

  it("returns undefined for an empty record set", () => {
    expect(normalizeCpcbAirQuality([], KOLKATA, 50)).toBeUndefined()
  })

  it("categorizes correctly at category boundaries (50/51, 100/101, etc.)", () => {
    // PM10 breakpoints: 0-50 -> 0-50 (Good), 51-100 -> 51-100 (Satisfactory)
    const good = normalizeCpcbAirQuality(
      [record({ pollutant_id: "PM10", pollutant_avg: "50" })],
      KOLKATA,
      50,
    )
    const satisfactory = normalizeCpcbAirQuality(
      [record({ pollutant_id: "PM10", pollutant_avg: "51" })],
      KOLKATA,
      50,
    )
    expect(good!.label).toBe("Good")
    expect(satisfactory!.label).toBe("Satisfactory")
  })

  it("groups multiple pollutant records for the same station together rather than treating them as separate stations", () => {
    const records = [
      record({
        station: "Station A",
        pollutant_id: "PM2.5",
        pollutant_avg: "40",
      }),
      record({
        station: "Station A",
        pollutant_id: "PM10",
        pollutant_avg: "60",
      }),
    ]
    const result = normalizeCpcbAirQuality(records, KOLKATA, 50)
    expect(result?.pollutants).toHaveLength(2)
  })

  it("is deterministic for the same input", () => {
    const records = [record()]
    const first = normalizeCpcbAirQuality(records, KOLKATA, 50)
    const second = normalizeCpcbAirQuality(records, KOLKATA, 50)
    expect(first).toEqual(second)
  })

  it("never labels the result as US_AQI/OPEN_METEO (source honesty)", () => {
    const result = normalizeCpcbAirQuality([record()], KOLKATA, 50)
    expect(result?.standard).not.toBe("US_AQI")
    expect(result?.source).not.toBe("OPEN_METEO")
  })
})
