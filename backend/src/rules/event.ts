// Weather suitability for outdoor activity planning — NOT a real festival
// or event listing. Framed generically ("Weekend Outdoor Outlook") rather
// than naming a specific event, since no event calendar/database is used.
import type { DailyForecast, DashboardWeatherData } from '../types/dashboard.js'
import { getIndiaSeason } from '../data/season.js'

export type EventInput = {
  daily: DailyForecast[]
  currentDate: Date
  month: number
}

function nextSaturday(from: Date): { date: Date; daysAway: number } {
  const day = from.getDay() // 0 = Sunday, 6 = Saturday
  const daysAway = (6 - day + 7) % 7
  const date = new Date(from)
  date.setDate(date.getDate() + daysAway)
  return { date, daysAway }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function computeEvent(input: EventInput): DashboardWeatherData['event'] {
  const { date: saturday, daysAway } = nextSaturday(input.currentDate)
  const sunday = new Date(saturday)
  sunday.setDate(sunday.getDate() + 1)

  // Use whichever forecasted days fall within the weekend window (bounded
  // by the 7-day forecast horizon); fall back to the full week's average
  // if the weekend falls outside it.
  const weekendIndices = [daysAway, daysAway + 1].filter(i => i < input.daily.length)
  const relevantDays = weekendIndices.length > 0 ? weekendIndices.map(i => input.daily[i]) : input.daily

  const avgHigh = Math.round(relevantDays.reduce((sum, d) => sum + d.high, 0) / relevantDays.length)
  const avgRainChance = Math.round(relevantDays.reduce((sum, d) => sum + d.rainChance, 0) / relevantDays.length)

  const rainLabel = avgRainChance < 30 ? 'Low Rain' : avgRainChance < 60 ? 'Moderate Rain' : 'High Rain'
  const icon = avgRainChance >= 60 ? '🌧️' : avgRainChance >= 30 ? '⛅' : '🌤️'

  const advice = avgRainChance >= 60
    ? '💡 High rain chance this weekend — plan indoor alternatives or flexible timing.'
    : avgRainChance >= 30
      ? '💡 Some rain possible — keep an eye on the forecast closer to the date.'
      : '💡 Favorable weather expected — good window for outdoor plans.'

  return {
    sectionLabel: 'Event Planner',
    icon,
    title: 'Weekend Outdoor Weather Outlook',
    dateRange: `${formatDate(saturday)}–${formatDate(sunday)}`,
    daysAway,
    expectedSeason: getIndiaSeason(input.month),
    expectedTemperature: avgHigh,
    rainLabel,
    rainChance: avgRainChance,
    advice,
  }
}
