import type { DashboardWeatherData } from "../types/dashboard.js"

export type PackingInput = {
  temperature: number
  rainChanceToday: number
  uvIndex: number
  windSpeed: number
  conditionCode: string
  aqiIndex?: number
  city: string
  dateLabel: string
}

const RAINY_CONDITIONS = new Set([
  "drizzle",
  "showers",
  "rain",
  "heavy_rain",
  "thunderstorm",
  "storm",
])

export function computePacking(
  input: PackingInput,
): DashboardWeatherData["packing"] {
  const items: DashboardWeatherData["packing"]["items"] = []

  if (
    input.rainChanceToday >= 40 ||
    RAINY_CONDITIONS.has(input.conditionCode)
  ) {
    items.push({
      icon: "☂️",
      item: "Umbrella / rain protection",
      reason: `${Math.round(input.rainChanceToday)}% rain chance`,
    })
  }
  if (input.rainChanceToday >= 70) {
    items.push({
      icon: "👟",
      item: "Waterproof footwear",
      reason: "High rain chance today",
    })
  }
  if (input.uvIndex >= 6) {
    items.push({
      icon: "🧴",
      item: "Sunscreen SPF 30+",
      reason: `UV Index ${input.uvIndex}`,
    })
  }
  if (input.uvIndex >= 8) {
    items.push({
      icon: "😎",
      item: "Sunglasses",
      reason: `UV Index ${input.uvIndex} (Very High/Extreme)`,
    })
  }
  if (input.temperature <= 20) {
    items.push({
      icon: "🧥",
      item: "Light jacket / layer",
      reason: `Cooler temperatures (${Math.round(input.temperature)}°C)`,
    })
  }
  if (input.temperature >= 34) {
    items.push({
      icon: "💧",
      item: "Water bottle (1L+)",
      reason: `High temperature (${Math.round(input.temperature)}°C)`,
    })
  }
  if (input.windSpeed >= 30) {
    items.push({
      icon: "🧣",
      item: "Windproof outer layer",
      reason: `Strong wind (${Math.round(input.windSpeed)} km/h)`,
    })
  }
  if (input.aqiIndex !== undefined && input.aqiIndex >= 101) {
    items.push({
      icon: "😷",
      item: "N95 mask",
      reason: `India AQI ${input.aqiIndex}`,
    })
  }

  return {
    title: `For ${input.city} · ${input.dateLabel}`,
    items,
  }
}
