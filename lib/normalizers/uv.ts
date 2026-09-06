import type { DashboardWeatherData } from "../types/dashboard.js"

const UV_CATEGORIES: Array<{
  max: number
  label: string
  recommendation: string
}> = [
  {
    max: 2,
    label: "Low",
    recommendation: "No protection needed for most people",
  },
  {
    max: 5,
    label: "Moderate",
    recommendation: "Use SPF 30+ if outdoors for long periods",
  },
  { max: 7, label: "High", recommendation: "Use SPF 30+" },
  {
    max: 10,
    label: "Very High",
    recommendation: "Use SPF 50+ · Seek shade at midday",
  },
  {
    max: Infinity,
    label: "Extreme",
    recommendation: "Avoid midday sun · SPF 50+ mandatory",
  },
]

function categorize(index: number) {
  return (
    UV_CATEGORIES.find((category) => index <= category.max) ??
    UV_CATEGORIES[UV_CATEGORIES.length - 1]
  )
}

export type UvSourceData = {
  currentUvIndex: number
  solarNoon?: string
}

// Peak UV hour is reported as solar noon itself (not a ± window — UV
// typically peaks close to solar noon, but this is a simple approximation,
// not a modeled UV-vs-time curve). Burn time is a rough heuristic, not
// medical/dermatological guidance.
export function normalizeUv(source: UvSourceData): DashboardWeatherData["uv"] {
  const index = Math.max(0, Math.round(source.currentUvIndex))
  const { label, recommendation } = categorize(index)

  const burnMinutes = Math.max(5, Math.round(200 / Math.max(index, 1)))

  return {
    index,
    scaleMax: 11,
    scaleLabels: ["Low", "Moderate", "High", "Very High", "Extreme"],
    label,
    recommendation,
    peakHours: source.solarNoon ? `Around ${source.solarNoon}` : "11 AM–2 PM",
    burnTime: `~${burnMinutes} min`,
    advice:
      index >= 6
        ? "☂️ Carry umbrella · 😎 Wear sunglasses · 🧴 Reapply SPF every 2h"
        : "🧴 Light sun protection recommended for extended outdoor time",
  }
}
