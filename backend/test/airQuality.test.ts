import { describe, expect, it } from "vitest"
import { normalizeAirQuality } from "../src/normalizers/airQuality.js"
import type { OpenMeteoAirQualityResponse } from "../src/providers/openMeteoAirQualityClient.js"

function buildFixture(usAqi: number): OpenMeteoAirQualityResponse {
  const times = ["2026-08-28T04:00", "2026-08-28T05:00", "2026-08-28T06:00"]
  return {
    hourly: {
      time: times,
      pm2_5: [40, 42, 44],
      pm10: [65, 68, 70],
      ozone: [36, 38, 40],
      nitrogen_dioxide: [20, 22, 24],
      us_aqi: [usAqi, usAqi, usAqi],
    },
  }
}

describe("normalizeAirQuality", () => {
  it("finds the closest hour to the reference time and reads its values", () => {
    const result = normalizeAirQuality(buildFixture(78), "2026-08-28T05:00")
    expect(result.index).toBe(78)
    expect(result.pollutants.find((p) => p.label === "PM2.5")?.value).toBe(42)
  })

  it("categorizes US AQI into the expected label bands", () => {
    expect(
      normalizeAirQuality(buildFixture(20), "2026-08-28T05:00").label,
    ).toBe("Good")
    expect(
      normalizeAirQuality(buildFixture(75), "2026-08-28T05:00").label,
    ).toBe("Moderate")
    expect(
      normalizeAirQuality(buildFixture(120), "2026-08-28T05:00").label,
    ).toBe("Unhealthy (Sensitive)")
    expect(
      normalizeAirQuality(buildFixture(400), "2026-08-28T05:00").label,
    ).toBe("Hazardous")
  })

  it("always returns exactly 4 pollutant entries with scaleMax and unit set", () => {
    const result = normalizeAirQuality(buildFixture(50), "2026-08-28T05:00")
    expect(result.pollutants).toHaveLength(4)
    result.pollutants.forEach((pollutant) => {
      expect(pollutant.scaleMax).toBeGreaterThan(0)
      expect(pollutant.unit).toBe("µg/m³")
    })
  })
})
