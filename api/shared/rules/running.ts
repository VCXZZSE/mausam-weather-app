import type { OpenMeteoResponse } from "../providers/openMeteoClient.js"
import type {
  DashboardWeatherData,
  HourlyForecast,
} from "../types/dashboard.js"
import { resolveCondition } from "../normalizers/conditionCode.js"
import { parseLocalCalendarDate } from "../utils/locationTime.js"
import { computeBestWindow } from "../briefing/bestWindow.js"

function formatHour(date: Date, timeZone: string): string {
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: undefined,
    hour12: true,
    timeZone,
  })
}

const MORNING_START_HOUR = 5
const MORNING_END_HOUR = 9

/**
 * Finds the best early-morning (5am-9am) running window from TODAY's real
 * hourly forecast only, reusing the same scoring/contiguous-run logic as
 * the personalized briefing's best-window calculation (see
 * briefing/bestWindow.ts). Deliberately does not look into tomorrow: that
 * would require a day-boundary marker so computeBestWindow's
 * contiguous-run assumption doesn't wrongly bridge across midnight (e.g.
 * treating today-9am and tomorrow-5am as one continuous "window"). If
 * today's morning has already passed, an honest fallback is returned
 * rather than reaching into tomorrow. Never fabricates a time not present
 * in the provider's hourly data.
 */
export function computeRunning(
  data: OpenMeteoResponse,
): DashboardWeatherData["running"] {
  const candidates: HourlyForecast[] = []
  const today = parseLocalCalendarDate(data.hourly.time[0])
  const todayDateNumber =
    today.getUTCFullYear() * 10000 +
    (today.getUTCMonth() + 1) * 100 +
    today.getUTCDate()

  for (let i = 0; i < data.hourly.time.length; i++) {
    const calendarDate = parseLocalCalendarDate(data.hourly.time[i])
    const dateNumber =
      calendarDate.getUTCFullYear() * 10000 +
      (calendarDate.getUTCMonth() + 1) * 100 +
      calendarDate.getUTCDate()
    if (dateNumber !== todayDateNumber) break // stop at the first hour that belongs to a later day

    const hour = calendarDate.getUTCHours()
    if (hour < MORNING_START_HOUR || hour > MORNING_END_HOUR) continue

    const info = resolveCondition(data.hourly.weathercode[i])
    candidates.push({
      time: formatHour(calendarDate, "UTC"),
      temperature: Math.round(data.hourly.temperature_2m[i]),
      condition: info.condition,
      conditionCode: info.conditionCode,
      rainChance: Math.round(data.hourly.precipitation_probability[i] ?? 0),
    })
  }

  if (candidates.length === 0) {
    return {
      badge: "FITNESS",
      start: "",
      end: "",
      summary: "Today's early-morning window has already passed.",
    }
  }

  const window = computeBestWindow(candidates)
  if (!window.start) {
    return { badge: "FITNESS", start: "", end: "", summary: window.reason }
  }

  return {
    badge: "FITNESS",
    start: window.start,
    end: window.end,
    summary: `Good conditions ${window.start}–${window.end}`,
  }
}
