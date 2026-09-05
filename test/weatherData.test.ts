import { afterEach, describe, expect, it, vi } from "vitest"
import {
  DEMO_WEATHER_DATA,
  fetchWeatherDashboard,
  getWeatherHeroVariant,
  resolveWeatherIcon,
} from "../src/weatherData"

const LOCATION = {
  latitude: 22.5726,
  longitude: 88.3639,
  locality: "Kolkata",
  region: "West Bengal",
  country: "India",
  source: "device" as const,
}

function minimalLivePayload(overrides: Record<string, unknown> = {}) {
  return {
    updatedAt: "Updated at 3:45 pm",
    current: {
      city: "Kolkata",
      region: "West Bengal",
      temperature: 29,
      feelsLike: 30,
      condition: "Clear sky",
      conditionCode: "clear",
      humidity: 60,
      windSpeed: 10,
      windDirection: "SW",
      windGust: 15,
      visibility: 8,
      pressure: 1010,
      dewPoint: 18,
      heatIndex: 30,
      high: 32,
      low: 24,
      hydrationAdvice: "Stay hydrated — drink water regularly.",
      isDay: true,
    },
    hourly: [
      {
        time: "Now",
        temperature: 29,
        condition: "Clear sky",
        conditionCode: "clear",
        rainChance: 5,
      },
    ],
    daily: [
      {
        day: "Today",
        high: 32,
        low: 24,
        condition: "Clear sky",
        conditionCode: "clear",
        rainChance: 5,
      },
    ],
    overview: [
      { icon: "♥", label: "Health", value: "UV 3", tone: "focus-health" },
    ],
    uv: {
      index: 3,
      scaleMax: 11,
      scaleLabels: ["Low"],
      label: "Low",
      recommendation: "None",
      peakHours: "noon",
      burnTime: "~60 min",
      advice: "None",
    },
    astronomy: {
      sunrise: "5:20 am",
      sunset: "5:50 pm",
      solarNoon: "11:35 am",
      moonPhase: "Waning Crescent",
      goldenHour: "5:20 pm",
      moonrise: "—",
    },
    comfort: {
      index: 80,
      label: "Comfortable",
      icon: "🙂",
      advice: "Nice.",
      factors: [],
    },
    running: {
      badge: "FITNESS",
      start: "6 am",
      end: "8 am",
      summary: "Good conditions",
    },
    rainfall: {
      chance: 5,
      today: 0,
      unit: "mm",
      periodLabel: "Today",
      monthLabel: "September",
    },
    commute: { status: "NORMAL", location: "Kolkata", items: [] },
    swimming: {
      badge: "FAVORABLE",
      venue: "Kolkata Swimming Pool",
      distance: "12km",
      depth: 2.1,
      depthUnit: "m",
      waterTemperature: 26,
      peakTime: "11 am",
      advice: "Good.",
    },
    garden: {
      badge: "GOOD",
      title: "Season note",
      soil: "Moist",
      note: "Note",
    },
    pollen: { overall: "Low", icon: "🌿", advice: "Low.", items: [] },
    alerts: [],
    locations: [],
    packing: { title: "For Kolkata", items: [] },
    event: {
      sectionLabel: "Event Planner",
      icon: "🌤️",
      title: "Weekend Outdoor Weather Outlook",
      dateRange: "6-7 Sep",
      daysAway: 1,
      expectedSeason: "Monsoon",
      expectedTemperature: 30,
      rainLabel: "Low Rain",
      rainChance: 10,
      advice: "Favorable.",
    },
    ...overrides,
  }
}

describe("fetchWeatherDashboard — demo-data-leak prevention (v0.2 review, Requirement 2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it("returns the live payload with NO fields merged in from DEMO_WEATHER_DATA", async () => {
    vi.stubEnv("VITE_WEATHER_API_URL", "http://localhost:3000/api/weather")
    const live = minimalLivePayload()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => live }),
    )

    const result = await fetchWeatherDashboard(LOCATION)

    // Every distinctive DEMO_WEATHER_DATA value must be absent.
    expect(result.alerts).toHaveLength(0) // demo has 3 alerts
    expect(result.commute.status).toBe("NORMAL") // demo is 'DISRUPTED'
    expect(result.locations).toHaveLength(0) // demo has 4 curated locations
    expect(result.garden.badge).not.toBe(DEMO_WEATHER_DATA.garden.badge)
    expect(result.event.title).not.toBe(DEMO_WEATHER_DATA.event.title)
    expect(result.current.temperature).toBe(29)
  })

  it("does not silently fill a missing required field with a demo value — it fails instead", async () => {
    vi.stubEnv("VITE_WEATHER_API_URL", "http://localhost:3000/api/weather")
    const incomplete = minimalLivePayload()
    // @ts-expect-error deliberately corrupting the fixture for this test
    delete incomplete.current
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => incomplete }),
    )

    await expect(fetchWeatherDashboard(LOCATION)).rejects.toThrow()
  })

  it("rainfall.month/monthlyAverage/history stay absent (Unavailable) rather than being demo-filled", async () => {
    vi.stubEnv("VITE_WEATHER_API_URL", "http://localhost:3000/api/weather")
    const live = minimalLivePayload() // rainfall has no month/monthlyAverage/history
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => live }),
    )

    const result = await fetchWeatherDashboard(LOCATION)
    expect(result.rainfall.month).toBeUndefined()
    expect(result.rainfall.monthlyAverage).toBeUndefined()
    expect(result.rainfall.history).toBeUndefined()
  })

  it("airQuality stays absent (not demo AQI 78) when the backend omits it", async () => {
    vi.stubEnv("VITE_WEATHER_API_URL", "http://localhost:3000/api/weather")
    const live = minimalLivePayload() // no airQuality field at all
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => live }),
    )

    const result = await fetchWeatherDashboard(LOCATION)
    expect(result.airQuality).toBeUndefined()
  })

  it("returns DEMO_WEATHER_DATA wholesale (never partially) when no location is resolved yet", async () => {
    const result = await fetchWeatherDashboard(undefined)
    expect(result).toBe(DEMO_WEATHER_DATA)
  })

  it("returns DEMO_WEATHER_DATA wholesale when VITE_USE_DEMO_WEATHER is explicitly set", async () => {
    vi.stubEnv("VITE_WEATHER_API_URL", "http://localhost:3000/api/weather")
    vi.stubEnv("VITE_USE_DEMO_WEATHER", "true")
    const result = await fetchWeatherDashboard(LOCATION)
    expect(result).toBe(DEMO_WEATHER_DATA)
  })
})

describe("resolveWeatherIcon — is_day handling", () => {
  it("shows the daytime icon for a clear condition when isDay is true", () => {
    expect(resolveWeatherIcon("clear", undefined, true)).toBe("☀️")
  })

  it("shows a moon for a clear condition when isDay is explicitly false", () => {
    expect(resolveWeatherIcon("clear", undefined, false)).toBe("🌙")
  })

  it("defaults to the daytime icon when isDay is omitted (backward compatible with demo/older data)", () => {
    expect(resolveWeatherIcon("clear", undefined, undefined)).toBe("☀️")
  })

  it("does not change non-sun conditions at night (e.g. rain stays rain)", () => {
    expect(resolveWeatherIcon("rain", undefined, false)).toBe("🌧️")
  })

  it("shows a moon with cloud for cloudy nighttime conditions", () => {
    expect(resolveWeatherIcon("partly_cloudy", undefined, false)).toBe("🌙☁️")
    expect(resolveWeatherIcon("cloudy", undefined, false)).toBe("🌙☁️")
    expect(resolveWeatherIcon("overcast", undefined, false)).toBe("🌙☁️")
  })

  it("an explicit icon override always wins regardless of isDay", () => {
    expect(resolveWeatherIcon("clear", "🖼️", false)).toBe("🖼️")
  })
})

describe("getWeatherHeroVariant — day/night presets", () => {
  it("uses the night preset for a dry nighttime condition", () => {
    expect(getWeatherHeroVariant("partly_cloudy", "Partly cloudy", false)).toBe(
      "night",
    )
  })

  it("keeps the rainy preset at night", () => {
    expect(getWeatherHeroVariant("rain", "Moderate rain", false)).toBe("rainy")
  })

  it("uses the sunny preset for a dry daytime condition", () => {
    expect(getWeatherHeroVariant("clear", "Clear sky", true)).toBe("sunny")
  })
})
