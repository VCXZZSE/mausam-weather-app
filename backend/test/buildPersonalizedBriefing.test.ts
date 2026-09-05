import { describe, expect, it } from "vitest"
import { buildPersonalizedBriefing } from "../src/briefing/buildPersonalizedBriefing.js"
import { buildBaseWeather, buildHourly } from "./briefingFixtures.js"
import type { BriefingRequest } from "../src/briefing/types.js"

function request(overrides: Partial<BriefingRequest> = {}): BriefingRequest {
  return { persona: "general", ...overrides }
}

describe("buildPersonalizedBriefing — personas (favorable conditions)", () => {
  it("general persona summarizes current conditions favorably", () => {
    const result = buildPersonalizedBriefing(
      buildBaseWeather(),
      request({ persona: "general" }),
    )
    expect(result.risks).toHaveLength(0)
    expect(result.recommendation.toLowerCase()).toContain("favorable")
  })

  it("commuter persona reports favorable commute conditions", () => {
    const result = buildPersonalizedBriefing(
      buildBaseWeather(),
      request({ persona: "commuter" }),
    )
    expect(result.summary.toLowerCase()).toContain("favorable")
  })

  it("outdoor persona recommends outdoor activity", () => {
    const result = buildPersonalizedBriefing(
      buildBaseWeather(),
      request({ persona: "outdoor" }),
    )
    expect(result.recommendation.toLowerCase()).toContain("good day")
  })

  it("student persona reports comfortable conditions", () => {
    const result = buildPersonalizedBriefing(
      buildBaseWeather(),
      request({ persona: "student" }),
    )
    expect(result.summary.toLowerCase()).toContain("comfortable")
  })

  it("health persona reports low weather-related risk", () => {
    const result = buildPersonalizedBriefing(
      buildBaseWeather(),
      request({ persona: "health" }),
    )
    expect(result.summary.toLowerCase()).toContain("low")
  })
})

describe("buildPersonalizedBriefing — rule priority", () => {
  it("thunderstorm takes priority over every other factor, for every persona", () => {
    const weather = buildBaseWeather()
    weather.current.conditionCode = "thunderstorm"
    weather.current.condition = "Thunderstorm"
    weather.uv.index = 9 // would otherwise also be a high-priority risk
    weather.airQuality!.index = 180 // would otherwise also be a high-priority risk

    for (const persona of [
      "general",
      "commuter",
      "outdoor",
      "student",
      "health",
    ] as const) {
      const result = buildPersonalizedBriefing(weather, request({ persona }))
      expect(result.risks[0].type).toBe("thunderstorm")
      expect(result.risks[0].severity).toBe("severe")
      expect(result.title).toContain("Thunderstorms are expected")
    }
  })

  it("heavy rain is flagged as a high-severity risk", () => {
    const weather = buildBaseWeather()
    weather.current.conditionCode = "heavy_rain"
    weather.daily[0].rainChance = 85
    const result = buildPersonalizedBriefing(
      weather,
      request({ persona: "outdoor" }),
    )
    expect(
      result.risks.some((r) => r.type === "rain" && r.severity === "high"),
    ).toBe(true)
  })

  it("high UV is flagged when no more severe risk is present", () => {
    const weather = buildBaseWeather()
    weather.uv.index = 9
    weather.uv.label = "Very High"
    const result = buildPersonalizedBriefing(
      weather,
      request({ persona: "health" }),
    )
    expect(result.risks[0].type).toBe("uv")
    expect(
      result.actions.some(
        (a) =>
          a.toLowerCase().includes("sunscreen") ||
          a.toLowerCase().includes("sun"),
      ),
    ).toBe(true)
  })

  it("high AQI is flagged when no more severe risk is present", () => {
    const weather = buildBaseWeather()
    weather.airQuality!.index = 170
    weather.airQuality!.label = "Unhealthy"
    const result = buildPersonalizedBriefing(
      weather,
      request({ persona: "health" }),
    )
    expect(result.risks[0].type).toBe("aqi")
    expect(result.recommendation.toLowerCase()).toContain("reduce")
  })

  it("extreme heat outranks high UV and high AQI", () => {
    const weather = buildBaseWeather()
    weather.current.feelsLike = 44
    weather.uv.index = 9
    weather.airQuality!.index = 170
    const result = buildPersonalizedBriefing(
      weather,
      request({ persona: "general" }),
    )
    expect(result.risks[0].type).toBe("heat")
    expect(result.risks[0].severity).toBe("severe")
  })

  it("does not report any risks under fully favorable conditions", () => {
    const result = buildPersonalizedBriefing(
      buildBaseWeather(),
      request({ persona: "general" }),
    )
    expect(result.risks).toHaveLength(0)
  })
})

describe("buildPersonalizedBriefing — contradiction prevention", () => {
  it("never recommends outdoor activity while a thunderstorm risk is active", () => {
    const weather = buildBaseWeather()
    weather.current.conditionCode = "thunderstorm"
    const result = buildPersonalizedBriefing(
      weather,
      request({ persona: "outdoor" }),
    )
    const combinedText =
      `${result.summary} ${result.recommendation}`.toLowerCase()
    expect(combinedText).not.toMatch(/good day|favorable|great day/)
    expect(combinedText).toMatch(/avoid|risky/)
  })

  it("never reports favorable commute conditions while heavy rain risk is active", () => {
    const weather = buildBaseWeather()
    weather.current.conditionCode = "heavy_rain"
    weather.daily[0].rainChance = 90
    const result = buildPersonalizedBriefing(
      weather,
      request({ persona: "commuter" }),
    )
    expect(result.summary.toLowerCase()).not.toContain("favorable")
  })
})

describe("buildPersonalizedBriefing — best outdoor window", () => {
  it("selects a contiguous window of favorable hours", () => {
    const weather = buildBaseWeather()
    weather.hourly = buildHourly(10, {
      temperature: 24,
      rainChance: 5,
      conditionCode: "clear",
    })
    const result = buildPersonalizedBriefing(
      weather,
      request({ persona: "general" }),
    )
    expect(result.bestWindow.start).toBe("Now")
    expect(result.bestWindow.reason.length).toBeGreaterThan(0)
  })

  it("only uses times that actually appear in the hourly forecast", () => {
    const weather = buildBaseWeather()
    const result = buildPersonalizedBriefing(
      weather,
      request({ persona: "general" }),
    )
    const hourlyTimes = weather.hourly.map((h) => h.time)
    if (result.bestWindow.start) {
      expect(hourlyTimes).toContain(result.bestWindow.start)
      expect(hourlyTimes).toContain(result.bestWindow.end)
    }
  })

  it("falls back to a clear message when no hour is suitable", () => {
    const weather = buildBaseWeather()
    weather.hourly = buildHourly(10, {
      conditionCode: "thunderstorm",
      rainChance: 95,
      temperature: 30,
    })
    const result = buildPersonalizedBriefing(
      weather,
      request({ persona: "general" }),
    )
    expect(result.bestWindow.start).toBe("")
    expect(result.bestWindow.end).toBe("")
    expect(result.bestWindow.reason).toBe(
      "Conditions are unfavorable for an extended outdoor window today.",
    )
  })
})

describe("buildPersonalizedBriefing — dataContext and structure", () => {
  it("dataContext values come directly from the supplied weather, never invented", () => {
    const weather = buildBaseWeather()
    weather.current.temperature = 33
    weather.daily[0].rainChance = 44
    weather.uv.index = 5
    weather.airQuality!.index = 62
    const result = buildPersonalizedBriefing(
      weather,
      request({ persona: "general" }),
    )
    expect(result.dataContext).toEqual({
      temperature: 33,
      rainChance: 44,
      uvIndex: 5,
      aqi: 62,
    })
  })

  it("reports aqi as null when air quality data is unavailable", () => {
    const weather = buildBaseWeather()
    weather.airQuality = undefined
    const result = buildPersonalizedBriefing(
      weather,
      request({ persona: "general" }),
    )
    expect(result.dataContext.aqi).toBeNull()
  })

  it("sets generatedAt to a valid ISO timestamp", () => {
    const result = buildPersonalizedBriefing(
      buildBaseWeather(),
      request({ persona: "general" }),
    )
    expect(() => new Date(result.generatedAt).toISOString()).not.toThrow()
  })

  it("avoids generic AI-fluff phrasing", () => {
    const result = buildPersonalizedBriefing(
      buildBaseWeather(),
      request({ persona: "general" }),
    )
    const text =
      `${result.title} ${result.summary} ${result.recommendation} ${result.actions.join(" ")}`.toLowerCase()
    expect(text).not.toContain("as an ai")
    expect(text).not.toContain("please note")
    expect(text).not.toContain("based on the data")
  })
})
