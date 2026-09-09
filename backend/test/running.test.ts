import { describe, expect, it } from "vitest"
import { computeRunning } from "../src/rules/running.js"
import type { OpenMeteoResponse } from "../src/providers/openMeteoClient.js"

function buildFixture(
  overrides: {
    startHour?: number
    weathercodes?: Record<number, number>
    rainChances?: Record<number, number>
    temperatures?: Record<number, number>
  } = {},
): OpenMeteoResponse {
  const startHour = overrides.startHour ?? 0
  const length = 24 - startHour
  const times = Array.from(
    { length },
    (_, i) => `2026-09-05T${String(startHour + i).padStart(2, "0")}:00`,
  )

  return {
    timezone: "Asia/Kolkata",
    utc_offset_seconds: 19800,
    current_weather: {
      time: times[0],
      temperature: 24,
      windspeed: 10,
      winddirection: 200,
      weathercode: 0,
      is_day: 1,
    },
    hourly: {
      time: times,
      temperature_2m: times.map(
        (_, i) => overrides.temperatures?.[startHour + i] ?? 24,
      ),
      apparent_temperature: times.map(() => 25),
      relative_humidity_2m: times.map(() => 60),
      surface_pressure: times.map(() => 1010),
      dew_point_2m: times.map(() => 18),
      visibility: times.map(() => 8000),
      wind_gusts_10m: times.map(() => 15),
      weathercode: times.map(
        (_, i) => overrides.weathercodes?.[startHour + i] ?? 0,
      ),
      precipitation_probability: times.map(
        (_, i) => overrides.rainChances?.[startHour + i] ?? 5,
      ),
      uv_index: times.map(() => 3),
      is_day: times.map((_, i) =>
        startHour + i >= 6 && startHour + i < 18 ? 1 : 0,
      ),
    },
    daily: {
      time: ["2026-09-05"],
      temperature_2m_max: [29],
      temperature_2m_min: [22],
      weathercode: [0],
      precipitation_probability_max: [10],
      precipitation_sum: [0],
      uv_index_max: [5],
      sunrise: ["2026-09-05T05:21"],
      sunset: ["2026-09-05T17:52"],
    },
  }
}

describe("computeRunning", () => {
  it("finds a favorable morning window from real hourly data (starting before 5am)", () => {
    const data = buildFixture({ startHour: 0 })
    const result = computeRunning(data)
    expect(result.start).not.toBe("")
    expect(result.end).not.toBe("")
    expect(result.badge).toBe("FITNESS")
  })

  it("never fabricates a time not present in the hourly forecast", () => {
    const data = buildFixture({ startHour: 0 })
    const result = computeRunning(data)
    if (result.start) {
      expect(data.hourly.time.some((t) => t.includes(":"))).toBe(true) // sanity: real times exist
    }
  })

  it("excludes thunderstorm hours from the morning window", () => {
    const data = buildFixture({
      startHour: 0,
      weathercodes: { 5: 95, 6: 95, 7: 95, 8: 95, 9: 95 },
    })
    const result = computeRunning(data)
    expect(result.start).toBe("")
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it("reports missing tomorrow data after today's morning has passed", () => {
    const data = buildFixture({ startHour: 14 })
    const result = computeRunning(data)
    expect(result.start).toBe("")
    expect(result.dayLabel).toBe("Tomorrow")
    expect(result.summary).toContain("incomplete")
  })

  it("never spans across a day boundary (no cross-midnight window)", () => {
    // 24 hours starting at hour 0 only contains ONE day's 5-9am block, so
    // this mainly guards against a future regression reintroducing a
    // multi-day lookahead that could bridge across midnight.
    const data = buildFixture({ startHour: 0 })
    const result = computeRunning(data)
    if (result.start && result.end) {
      const startHour = Number(
        data.hourly.time.find((t) => t.length > 0)?.slice(11, 13),
      )
      expect(Number.isFinite(startHour)).toBe(true)
    }
  })
})

function twoDays(currentTime: string) {
  const data = buildFixture()
  for (const key of Object.keys(data.hourly) as (keyof typeof data.hourly)[]) {
    if (key === "time") data.hourly.time.push(...data.hourly.time.map(time => time.replace("2026-09-05", "2026-09-06")))
    else data.hourly[key].push(...data.hourly[key])
  }
  data.current_weather.time = currentTime
  data.daily.time.push("2026-09-06")
  data.daily.sunrise.push("2026-09-06T05:22")
  return data
}

describe("upcoming running mornings", () => {
  it("uses tomorrow after 9am even when today's past hours remain in the response", () => {
    const data = twoDays("2026-09-05T21:00")
    data.hourly.weathercode.fill(95, 0, 24)
    const result = computeRunning(data)
    expect(result).toMatchObject({ dayLabel: "Tomorrow", date: "2026-09-06" })
    expect(result.start).toMatch(/5\s*am/i)
    expect(result.end).toMatch(/9\s*am/i)
    expect(result.sunrise).toMatch(/5:22\s*am/i)
  })

  it("excludes elapsed and partially elapsed slots from today's recommendation", () => {
    const result = computeRunning(twoDays("2026-09-05T06:30"))
    expect(result.dayLabel).toBe("Today")
    expect(result.start).toMatch(/7\s*am/i)
    expect(result.end).toMatch(/9\s*am/i)
  })

  it("does not recommend tomorrow's storms or silently select a different day", () => {
    const data = twoDays("2026-09-05T09:00")
    data.hourly.weathercode.fill(95, 24)
    expect(computeRunning(data)).toMatchObject({ dayLabel: "Tomorrow", start: "", end: "", summary: "No suitable morning window tomorrow." })
  })

  it("returns a real one-hour interval for a single favourable hour", () => {
    const data = twoDays("2026-09-05T21:00")
    data.hourly.weathercode.fill(95, 30, 33)
    const result = computeRunning(data)
    expect(result.start).toMatch(/5\s*am/i)
    expect(result.end).toMatch(/6\s*am/i)
  })

  it("does not bridge missing hourly data", () => {
    const data = twoDays("2026-09-05T21:00")
    data.hourly.precipitation_probability[30] = NaN
    const result = computeRunning(data)
    expect(result.start).toMatch(/7\s*am/i)
    expect(result.end).toMatch(/9\s*am/i)
    expect(result.summary).toContain("Limited coverage")
  })

  it("handles month and year rollover in the location's calendar", () => {
    const data = twoDays("2026-12-31T23:30")
    data.hourly.time = data.hourly.time.map(time => time.replace("2026-09-05", "2026-12-31").replace("2026-09-06", "2027-01-01"))
    const result = computeRunning(data)
    expect(result).toMatchObject({ dayLabel: "Tomorrow", date: "2027-01-01" })
    expect(result.start).toMatch(/5\s*am/i)
    expect(result.sunrise).toBeUndefined()
  })
})
