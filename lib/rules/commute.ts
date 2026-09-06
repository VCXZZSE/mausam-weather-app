// RULE-BASED, weather-only commute guidance. Does not calculate actual
// traffic, routing, or travel time — no maps/routing API is used. Items
// describe generic categories (transit, roads, visibility), not claims
// about specific live incidents.
import type { DashboardWeatherData } from "../types/dashboard.js"

export type CommuteInput = {
  conditionCode: string
  rainChanceToday: number
  windSpeed: number
  visibilityKm: number
  city: string
}

const DISRUPTIVE_CONDITIONS = new Set(["thunderstorm", "storm", "heavy_rain"])

export function computeCommute(
  input: CommuteInput,
): DashboardWeatherData["commute"] {
  const disrupted =
    DISRUPTIVE_CONDITIONS.has(input.conditionCode) ||
    input.rainChanceToday >= 75
  const caution =
    !disrupted &&
    (input.rainChanceToday >= 40 ||
      input.windSpeed >= 30 ||
      input.visibilityKm < 4)

  const status = disrupted ? "DISRUPTED" : caution ? "CAUTION" : "NORMAL"

  const transitValue = disrupted
    ? "Possible delays"
    : caution
      ? "Minor delays possible"
      : "Normal service"
  const roadValue = disrupted
    ? "Poor conditions"
    : caution
      ? "Drive with caution"
      : "Clear conditions"
  const visibilityDetail =
    input.visibilityKm < 4 ? "Reduced visibility" : "Good visibility"

  return {
    status,
    location: input.city,
    items: [
      {
        icon: "🚇",
        name: "Metro / Rail",
        value: transitValue,
        detail: disrupted
          ? "Weather-related delays possible"
          : "No known disruption",
      },
      {
        icon: "🚗",
        name: "Roads",
        value: roadValue,
        detail: disrupted
          ? "Waterlogging possible in low-lying areas"
          : "Standard driving conditions",
      },
      {
        icon: "👁️",
        name: "Visibility",
        value: `${input.visibilityKm.toFixed(1)} km`,
        detail: visibilityDetail,
      },
    ],
  }
}
