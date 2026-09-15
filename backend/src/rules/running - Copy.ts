import type { OpenMeteoResponse } from "../providers/openMeteoClient.js"
import type { DashboardWeatherData, HourlyForecast } from "../types/dashboard.js"
import { resolveCondition } from "../normalizers/conditionCode.js"
import { parseLocalCalendarDate } from "../utils/locationTime.js"
import { computeBestWindow } from "../briefing/bestWindow.js"

const HOUR = 3_600_000
const formatHour = (date: Date) => date.toLocaleTimeString("en-IN", {
  hour: "numeric", hour12: true, timeZone: "UTC",
})

/** Evaluate full upcoming hours in one local morning, never across days.
 * Calendar dates use UTC getters only, preserving the provider's local time.
 */
export function computeRunning(data: OpenMeteoResponse): DashboardWeatherData["running"] {
  const current = parseLocalCalendarDate(data.current_weather.time)
  const nextHour = Math.ceil(current.getTime() / HOUR) * HOUR
  const target = new Date(current)
  target.setUTCHours(0, 0, 0, 0)
  const tomorrow = nextHour >= target.getTime() + 9 * HOUR
  if (tomorrow) target.setUTCDate(target.getUTCDate() + 1)
  const date = target.toISOString().slice(0, 10)
  const dayLabel = tomorrow ? "Tomorrow" : "Today"
  const dayIndex = data.daily.time.indexOf(date)
  const sunriseValue = data.daily.sunrise[dayIndex]
  const sunrise = sunriseValue ? parseLocalCalendarDate(sunriseValue).toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC",
  }) : undefined
  const base = { badge: "FITNESS", dayLabel, date, sunrise } as const
  const candidates: HourlyForecast[] = []
  const starts: Date[] = []
  let missing = false
  for (let hour = 5; hour < 9; hour++) {
    const start = new Date(target.getTime() + hour * HOUR)
    if (start.getTime() < nextHour) continue
    const timestamp = `${date}T${String(hour).padStart(2, "0")}:00`
    const index = data.hourly.time.indexOf(timestamp)
    const temperature = data.hourly.temperature_2m[index]
    const rainChance = data.hourly.precipitation_probability[index]
    const code = data.hourly.weathercode[index]
    const valid = index >= 0 && [temperature, rainChance, code].every(Number.isFinite)
    missing ||= !valid
    // Missing hours must break a continuous window.
    const info = valid ? resolveCondition(code) : { condition: "Unavailable", conditionCode: "storm" }
    starts.push(start)
    candidates.push({ time: formatHour(start), temperature: valid ? temperature : 0,
      rainChance: valid ? rainChance : 100, ...info })
  }
  const window = computeBestWindow(candidates)
  if (!window.start) return { ...base, start: "", end: "",
    summary: missing ? `${dayLabel}'s morning forecast is incomplete.` : `No suitable morning window ${dayLabel.toLowerCase()}.` }
  const last = candidates.findIndex(hour => hour.time === window.end)
  // Each forecast hour is a one-hour slot: a lone 5am slot ends at 6am.
  const end = formatHour(new Date(starts[last].getTime() + HOUR))
  return { ...base, start: window.start, end,
    summary: `Favourable forecast ${dayLabel.toLowerCase()}${missing ? " · Limited coverage" : ""}` }
}
