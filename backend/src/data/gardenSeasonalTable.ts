// CURATED regional agricultural/seasonal reference data for West Bengal.
// This reflects general, well-known seasonal crop calendars and local
// seasonal notes (e.g. monsoon Hilsa fishing season) — static curated
// knowledge, not a live agricultural data feed.
import type { IndiaSeason } from "./season.js"

export type GardenSeasonalInfo = { title: string note: string }

const GARDEN_SEASONAL: Record<IndiaSeason, GardenSeasonalInfo> = {
  Monsoon: {
    title: "Aman rice transplanting season",
    note: "🐟 Hilsa season active!",
  },
  "Post-Monsoon": {
    title: "Aman rice harvesting season",
    note: "🌾 Harvest season for local paddy fields",
  },
  Winter: {
    title: "Boro rice & winter vegetable season",
    note: "🥦 Good season for leafy greens and winter vegetables",
  },
  Summer: {
    title: "Pre-monsoon planting preparation",
    note: "🌱 Prepare soil ahead of monsoon sowing",
  },
}

export function getGardenSeasonalInfo(season: IndiaSeason): GardenSeasonalInfo {
  return GARDEN_SEASONAL[season]
}
