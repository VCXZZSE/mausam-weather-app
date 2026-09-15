import SunCalc from "suncalc"
import type { DashboardWeatherData } from "../types/dashboard.js"

function formatTime(date: Date | undefined, timeZone: string): string {
  if (!date || Number.isNaN(date.getTime())) return "—"
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  })
}

const MOON_PHASES = [
  { max: 0.03, label: "New Moon" },
  { max: 0.22, label: "Waxing Crescent" },
  { max: 0.28, label: "First Quarter" },
  { max: 0.47, label: "Waxing Gibbous" },
  { max: 0.53, label: "Full Moon" },
  { max: 0.72, label: "Waning Gibbous" },
  { max: 0.78, label: "Last Quarter" },
  { max: 0.97, label: "Waning Crescent" },
  { max: 1, label: "New Moon" },
]

function moonPhaseLabel(phase: number): string {
  return MOON_PHASES.find((entry) => phase <= entry.max)?.label ?? "New Moon"
}

export type AstronomyCoordinates = {
  latitude: number
  longitude: number
}

/**
 * Sunrise/sunset are preferred directly from Open-Meteo's own daily
 * fields (see toDashboardWeatherData.ts) rather than recalculated here —
 * per backend-v0.2 handoff §7. suncalc is retained only for solar noon,
 * golden hour, and moon phase/moonrise, none of which Open-Meteo
 * provides. `timeZone` must be the IANA timezone Open-Meteo returned for
 * the requested coordinates (e.g. "Asia/Kolkata", "America/Chicago") —
 * this function no longer assumes any specific location.
 */
export function calculateAstronomy(
  date: Date,
  coordinates: AstronomyCoordinates,
  timeZone: string,
): DashboardWeatherData["astronomy"] {
  const sunTimes = SunCalc.getTimes(
    date,
    coordinates.latitude,
    coordinates.longitude,
  )
  const moonIllumination = SunCalc.getMoonIllumination(date)
  const moonTimes = SunCalc.getMoonTimes(
    date,
    coordinates.latitude,
    coordinates.longitude,
  )

  return {
    sunrise: formatTime(sunTimes.sunrise, timeZone),
    sunset: formatTime(sunTimes.sunset, timeZone),
    solarNoon: formatTime(sunTimes.solarNoon, timeZone),
    moonPhase: moonPhaseLabel(moonIllumination.phase),
    goldenHour: formatTime(sunTimes.goldenHour, timeZone),
    moonrise: formatTime(moonTimes.rise, timeZone),
  }
}
