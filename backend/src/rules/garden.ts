import type { DashboardWeatherData } from '../types/dashboard.js'
import { getGardenSeasonalInfo } from '../data/gardenSeasonalTable.js'
import { getIndiaSeason } from '../data/season.js'

export type GardenInput = {
  temperature: number
  rainChanceToday: number
  humidity: number
  windSpeed: number
  month: number
}

export function computeGarden(input: GardenInput): DashboardWeatherData['garden'] {
  const season = getIndiaSeason(input.month)
  const { title, note } = getGardenSeasonalInfo(season)

  let badge: string
  if (input.rainChanceToday >= 60) badge = 'RAINY'
  else if (input.temperature >= 38) badge = 'HOT'
  else if (input.windSpeed >= 30) badge = 'WINDY'
  else badge = 'GOOD'

  const soil = input.rainChanceToday >= 60 || input.humidity >= 85
    ? 'Saturated'
    : input.humidity >= 55
      ? 'Moist'
      : 'Dry'

  return { badge, title, soil, note }
}
