// CURATED / DEMO-ORIENTED DATA — NOT LIVE MEASUREMENTS.
//
// There is no free pollen API with reliable India/Kolkata coverage (see
// BACKEND_HANDOFF_LOCAL.md and Phase 2/3 provider research). This table is
// a deterministic, month-indexed approximation of typical Kolkata/West
// Bengal pollen behavior (tree bloom in late winter/summer, monsoon rain
// suppressing airborne pollen, post-monsoon weed pollen). It must never be
// presented to users as a live/measured reading.
import type { DashboardWeatherData } from "../types/dashboard.js"

type PollenLevels = { tree: number grass: number weed: number }

// Percent (0-100) values per month index (0 = January).
const POLLEN_BY_MONTH: PollenLevels[] = [
  { tree: 35, grass: 15, weed: 20 }, // Jan
  { tree: 55, grass: 20, weed: 20 }, // Feb
  { tree: 70, grass: 30, weed: 25 }, // Mar
  { tree: 65, grass: 35, weed: 30 }, // Apr
  { tree: 50, grass: 40, weed: 30 }, // May
  { tree: 25, grass: 30, weed: 20 }, // Jun (monsoon onset — rain suppresses pollen)
  { tree: 15, grass: 20, weed: 15 }, // Jul
  { tree: 15, grass: 20, weed: 15 }, // Aug
  { tree: 20, grass: 25, weed: 25 }, // Sep
  { tree: 25, grass: 35, weed: 68 }, // Oct (post-monsoon weed pollen rises)
  { tree: 30, grass: 30, weed: 72 }, // Nov
  { tree: 30, grass: 20, weed: 30 }, // Dec
]

function levelFor(percent: number): string {
  if (percent < 34) return "Low"
  if (percent < 67) return "Moderate"
  return "High"
}

function colorFor(level: string): string {
  switch (level) {
    case "Low":
      return "#4ade80"
    case "Moderate":
      return "#eab308"
    default:
      return "#f97316"
  }
}

/** Deterministic: same month always produces the same output. */
export function computePollen(month: number): DashboardWeatherData["pollen"] {
  const levels = POLLEN_BY_MONTH[((month % 12) + 12) % 12]
  const items = [
    {
      type: "Tree",
      level: levelFor(levels.tree),
      percent: levels.tree,
      color: colorFor(levelFor(levels.tree)),
    },
    {
      type: "Grass",
      level: levelFor(levels.grass),
      percent: levels.grass,
      color: colorFor(levelFor(levels.grass)),
    },
    {
      type: "Weed",
      level: levelFor(levels.weed),
      percent: levels.weed,
      color: colorFor(levelFor(levels.weed)),
    },
  ]

  const overallPercent = Math.round(
    (levels.tree + levels.grass + levels.weed) / 3,
  )
  const overall = levelFor(overallPercent)

  return {
    overall,
    icon: "🌿",
    advice:
      overall === "High"
        ? "🤧 Keep windows closed during peak hours · Antihistamine recommended if allergy-prone"
        : overall === "Moderate"
          ? "🌿 Sensitive individuals should monitor symptoms outdoors"
          : "🌿 Pollen levels are low — minimal precaution needed",
    items,
  }
}
