import type { WeatherPayload } from "../src/normalizers/toDashboardWeatherData.js"
import type { HourlyForecast } from "../src/types/dashboard.js"

function buildHourly(
  count: number,
  overrides: Partial<HourlyForecast> = {},
): HourlyForecast[] {
  return Array.from({ length: count }, (_, i) => ({
    time: i === 0 ? "Now" : `${i} pm`,
    temperature: 24,
    condition: "Clear sky",
    conditionCode: "clear",
    rainChance: 10,
    ...overrides,
  }))
}

/** A fully favorable, internally consistent baseline WeatherPayload for briefing tests. */
export function buildBaseWeather(): WeatherPayload {
  return {
    updatedAt: "Updated just now",
    current: {
      city: "Kolkata",
      region: "West Bengal",
      temperature: 26,
      feelsLike: 27,
      condition: "Clear sky",
      conditionCode: "clear",
      heroVariant: "sunny",
      high: 29,
      low: 22,
      humidity: 55,
      windSpeed: 12,
      windDirection: "SW",
      windGust: 18,
      visibility: 8,
      pressure: 1010,
      dewPoint: 18,
      heatIndex: 27,
    },
    hourly: buildHourly(10),
    daily: [
      {
        day: "Today",
        high: 29,
        low: 22,
        condition: "Clear sky",
        conditionCode: "clear",
        rainChance: 10,
      },
      {
        day: "Sun",
        high: 30,
        low: 23,
        condition: "Clear sky",
        conditionCode: "clear",
        rainChance: 15,
      },
    ],
    airQuality: {
      index: 35,
      scaleMax: 500,
      scaleLabels: [
        "Good",
        "Moderate",
        "Unhealthy (Sensitive)",
        "Unhealthy",
        "Very Unhealthy",
        "Hazardous",
      ],
      label: "Good",
      updatedLabel: "Updated just now",
      icon: "😊",
      advice: "Air quality is good.",
      pollutants: [
        {
          label: "PM2.5",
          value: 10,
          scaleMax: 100,
          unit: "µg/m³",
          color: "#f59e0b",
        },
        {
          label: "PM10",
          value: 20,
          scaleMax: 150,
          unit: "µg/m³",
          color: "#f97316",
        },
        {
          label: "O₃",
          value: 15,
          scaleMax: 120,
          unit: "µg/m³",
          color: "#60a5fa",
        },
        {
          label: "NO₂",
          value: 8,
          scaleMax: 80,
          unit: "µg/m³",
          color: "#a78bfa",
        },
      ],
    },
    uv: {
      index: 3,
      scaleMax: 11,
      scaleLabels: ["Low", "Moderate", "High", "Very High", "Extreme"],
      label: "Moderate",
      recommendation: "No protection needed for most people",
      peakHours: "Around 12:00 pm",
      burnTime: "~60 min",
      advice: "Light sun protection recommended for extended outdoor time",
    },
    astronomy: {
      sunrise: "5:21 am",
      sunset: "5:52 pm",
      solarNoon: "11:36 am",
      moonPhase: "Waning Crescent",
      goldenHour: "5:22 pm",
      moonrise: "8:00 pm",
    },
    comfort: {
      index: 80,
      label: "Comfortable",
      icon: "🙂",
      advice: "Pleasant conditions.",
      factors: [
        { label: "Temperature", value: "26°C", percent: 58, color: "#f59e0b" },
      ],
    },
    rainfall: {
      chance: 10,
      today: 0,
      unit: "mm",
      periodLabel: "Today",
      monthLabel: "September",
    },
    overview: [
      {
        icon: "♥",
        label: "Health",
        value: "US AQI 35 · UV 3",
        tone: "focus-health",
      },
    ],
    pollen: {
      overall: "Low",
      icon: "🌿",
      advice: "Pollen levels are low.",
      items: [{ type: "Tree", level: "Low", percent: 20, color: "#4ade80" }],
    },
    alerts: [],
    commute: { status: "NORMAL", location: "Kolkata", items: [] },
    swimming: {
      badge: "FAVORABLE",
      venue: "Kolkata Swimming Pool",
      distance: "12km",
      depth: 2.1,
      depthUnit: "m",
      waterTemperature: 24,
      peakTime: "11:36 am",
      advice: "Good conditions for swimming",
    },
    garden: {
      badge: "GOOD",
      title: "Test season",
      soil: "Moist",
      note: "Test note",
    },
    locations: [
      {
        name: "Darjeeling",
        temperature: 11,
        condition: "Clear sky",
        conditionCode: "clear",
        distance: "600 km",
      },
    ],
    packing: { title: "For Kolkata · 5 Sep 2026", items: [] },
    event: {
      sectionLabel: "Event Planner",
      icon: "🌤️",
      title: "Weekend Outdoor Weather Outlook",
      dateRange: "6 Sep–7 Sep",
      daysAway: 1,
      expectedSeason: "Monsoon",
      expectedTemperature: 29,
      rainLabel: "Low Rain",
      rainChance: 10,
      advice: "Favorable weather expected.",
    },
  }
}

export { buildHourly }
