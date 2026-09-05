import type { WeatherPayload } from "../normalizers/toDashboardWeatherData.js"
import type { BriefingRisk } from "./types.js"

const SEVERE_CONDITIONS = new Set(["thunderstorm", "storm"])

/**
 * Detects applicable risks in a FIXED priority order (thunderstorm >
 * extreme heat > heavy rain > high UV > high AQI > strong wind > moderate
 * unfavorable), matching the Phase 4 spec's rule priority exactly. The
 * order of this array IS the priority — risks[0] (if present) is always
 * the single most important factor, and every persona composer gates its
 * top-line advice on it so no persona can contradict a severe risk (e.g.
 * saying conditions are "favorable" while a thunderstorm is active).
 */
export function detectRisks(weather: WeatherPayload): BriefingRisk[] {
  const risks: BriefingRisk[] = []
  const current = weather.current
  const temperature = current.temperature ?? 0
  const feelsLike = current.feelsLike ?? temperature
  const windSpeed = current.windSpeed ?? 0
  const conditionCode = current.conditionCode ?? "clear"
  const rainChance = weather.daily[0]?.rainChance ?? 0
  const uv = weather.uv
  const airQuality = weather.airQuality

  if (SEVERE_CONDITIONS.has(conditionCode)) {
    risks.push({
      type: "thunderstorm",
      severity: "severe",
      message: "Thunderstorms are expected — avoid exposed or open areas.",
    })
  }

  if (feelsLike >= 42) {
    risks.push({
      type: "heat",
      severity: "severe",
      message: `Feels-like temperature is ${Math.round(feelsLike)}°C — heat exposure is dangerous.`,
    })
  } else if (feelsLike >= 38) {
    risks.push({
      type: "heat",
      severity: "high",
      message: `Feels-like temperature is ${Math.round(feelsLike)}°C — limit exertion outdoors.`,
    })
  }

  if (conditionCode === "heavy_rain" || rainChance >= 75) {
    risks.push({
      type: "rain",
      severity: "high",
      message: `Rain chance is ${Math.round(rainChance)}% — expect wet, disruptive conditions.`,
    })
  } else if (rainChance >= 50) {
    risks.push({
      type: "rain",
      severity: "moderate",
      message: `Rain chance is ${Math.round(rainChance)}% later today.`,
    })
  }

  if (uv.index >= 8) {
    risks.push({
      type: "uv",
      severity: "high",
      message: `UV index is ${uv.index} (${uv.label}) — sun protection is important.`,
    })
  } else if (uv.index >= 6) {
    risks.push({
      type: "uv",
      severity: "moderate",
      message: `UV index is ${uv.index} (${uv.label}).`,
    })
  }

  if (airQuality) {
    if (airQuality.index >= 201) {
      risks.push({
        type: "aqi",
        severity: "high",
        message: `India AQI is ${airQuality.index} (${airQuality.label}) — limit prolonged outdoor exposure.`,
      })
    } else if (airQuality.index >= 101) {
      risks.push({
        type: "aqi",
        severity: "moderate",
        message: `India AQI is ${airQuality.index} (${airQuality.label}).`,
      })
    }
  }

  if (windSpeed >= 40) {
    risks.push({
      type: "wind",
      severity: "moderate",
      message: `Winds are near ${Math.round(windSpeed)} km/h — exposed routes may be affected.`,
    })
  }

  return risks
}

export type TopRisk = {
  type: string
  severity: BriefingRisk["severity"]
  label: string
} | null

const TOP_RISK_LABELS: Record<string, string> = {
  thunderstorm: "Thunderstorms are expected",
  heat: "High heat is expected",
  rain: "Rain is likely",
  uv: "UV is high",
  aqi: "Air quality is a concern",
  wind: "Winds are strong",
}

export function getTopRisk(risks: BriefingRisk[]): TopRisk {
  const top = risks[0]
  if (!top) return null
  return {
    type: top.type,
    severity: top.severity,
    label: TOP_RISK_LABELS[top.type] ?? top.message,
  }
}
