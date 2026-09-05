import type { HourlyForecast } from '../types/dashboard.js'
import type { BestWindow } from './types.js'

const SEVERE_CONDITIONS = new Set(['thunderstorm', 'storm'])
const HEAVY_RAIN_CONDITIONS = new Set(['heavy_rain', 'rain'])
const LIGHT_RAIN_CONDITIONS = new Set(['showers', 'drizzle'])

// Only fields actually present on each hourly entry (temperature,
// condition/conditionCode, rainChance) are used — the hourly forecast
// contract does not carry per-hour wind or UV, only a single current-hour
// snapshot for those, so they cannot be factored in here without
// fabricating data that was never fetched per hour.
function scoreHour(hour: HourlyForecast): number {
  if (SEVERE_CONDITIONS.has(hour.conditionCode)) return -Infinity

  let score = 100
  score -= hour.rainChance
  score -= Math.abs(hour.temperature - 24) * 2
  if (HEAVY_RAIN_CONDITIONS.has(hour.conditionCode)) score -= 20
  else if (LIGHT_RAIN_CONDITIONS.has(hour.conditionCode)) score -= 10

  return score
}

const GOOD_THRESHOLD = 40

/**
 * Finds the best contiguous run of upcoming hours (from the real hourly
 * forecast — never a fabricated time) using only fields present per hour.
 * Prefers the run with the highest average score, tie-broken by length.
 * Returns a fallback reason (no start/end) when nothing qualifies.
 */
export function computeBestWindow(hourly: HourlyForecast[]): BestWindow {
  const scored = hourly.map(hour => ({ hour, score: scoreHour(hour) }))

  let bestRun: typeof scored = []
  let currentRun: typeof scored = []

  const average = (run: typeof scored) => run.reduce((sum, entry) => sum + entry.score, 0) / run.length

  const flush = () => {
    if (currentRun.length === 0) return
    if (bestRun.length === 0 || average(currentRun) > average(bestRun)
      || (average(currentRun) === average(bestRun) && currentRun.length > bestRun.length)) {
      bestRun = currentRun
    }
  }

  for (const entry of scored) {
    if (entry.score >= GOOD_THRESHOLD) {
      currentRun = [...currentRun, entry]
    } else {
      flush()
      currentRun = []
    }
  }
  flush()

  if (bestRun.length === 0) {
    return { start: '', end: '', reason: 'Conditions are unfavorable for an extended outdoor window today.' }
  }

  const start = bestRun[0].hour.time
  const end = bestRun[bestRun.length - 1].hour.time
  const reason = bestRun.length === 1
    ? `${start} looks like the most favorable hour available today.`
    : `${start}–${end} offers the most favorable stretch of conditions today.`

  return { start, end, reason }
}
