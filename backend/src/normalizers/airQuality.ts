import type { OpenMeteoAirQualityResponse } from "../providers/openMeteoAirQualityClient.js"
import type { DashboardWeatherData } from "../types/dashboard.js"
import { findClosestTimeIndex } from "./timeIndex.js"

// Open-Meteo's `us_aqi` (US EPA scale) is used since it requires no API key.
// This is not India's National AQI (which needs WAQI/CPCB station data) —
// documented limitation, acceptable for a free-tier v0.1.
const US_AQI_CATEGORIES: Array<{ max: number label: string icon: string }> = [
  { max: 50, label: "Good", icon: "😊" },
  { max: 100, label: "Moderate", icon: "🙂" },
  { max: 150, label: "Unhealthy (Sensitive)", icon: "😐" },
  { max: 200, label: "Unhealthy", icon: "😷" },
  { max: 300, label: "Very Unhealthy", icon: "😷" },
  { max: Infinity, label: "Hazardous", icon: "☠️" },
]

function categorize(index: number): { label: string icon: string } {
  return (
    US_AQI_CATEGORIES.find((category) => index <= category.max) ??
    US_AQI_CATEGORIES[US_AQI_CATEGORIES.length - 1]
  )
}

function adviceFor(label: string): string {
  switch (label) {
    case "Good":
      return "✅ Air quality is good — safe for outdoor activity."
    case "Moderate":
      return "💡 Sensitive individuals should consider reducing prolonged outdoor exertion."
    case "Unhealthy (Sensitive)":
      return "💡 Asthma / COPD sufferers: limit outdoor time. Mask recommended near traffic."
    case "Unhealthy":
      return "😷 Wear a mask outdoors; limit prolonged exertion."
    case "Very Unhealthy":
      return "🚫 Avoid outdoor exertion; keep windows closed."
    default:
      return "🚨 Hazardous air quality — stay indoors if possible."
  }
}

export function normalizeAirQuality(
  data: OpenMeteoAirQualityResponse,
  referenceTime: string,
): DashboardWeatherData["airQuality"] {
  const index = findClosestTimeIndex(data.hourly.time, referenceTime)
  const aqi = Math.round(data.hourly.us_aqi[index] ?? 0)
  const { label, icon } = categorize(aqi)

  return {
    index: aqi,
    scaleMax: 500,
    scaleLabels: US_AQI_CATEGORIES.map((category) => category.label),
    label,
    updatedLabel: "Updated just now",
    icon,
    advice: adviceFor(label),
    // v0.2 honesty fields (see backend-v0.2 handoff §8): this is always
    // Open-Meteo's modeled US AQI in the current implementation — CPCB
    // station-based India NAQI integration is deferred (it requires a
    // data.gov.in API key, which conflicts with this project's zero-cost
    // constraint). `standard`/`source` must never be set to the Indian
    // values unless a genuine CPCB reading is actually being returned.
    standard: "US_AQI",
    source: "OPEN_METEO",
    stationName: null,
    stationDistanceKm: null,
    pollutants: [
      {
        label: "PM2.5",
        value: Math.round(data.hourly.pm2_5[index] ?? 0),
        scaleMax: 100,
        unit: "µg/m³",
        color: "#f59e0b",
      },
      {
        label: "PM10",
        value: Math.round(data.hourly.pm10[index] ?? 0),
        scaleMax: 150,
        unit: "µg/m³",
        color: "#f97316",
      },
      {
        label: "O₃",
        value: Math.round(data.hourly.ozone[index] ?? 0),
        scaleMax: 120,
        unit: "µg/m³",
        color: "#60a5fa",
      },
      {
        label: "NO₂",
        value: Math.round(data.hourly.nitrogen_dioxide[index] ?? 0),
        scaleMax: 80,
        unit: "µg/m³",
        color: "#a78bfa",
      },
    ],
  }
}
