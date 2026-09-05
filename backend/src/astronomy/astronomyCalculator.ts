import SunCalc from 'suncalc'
import type { DashboardWeatherData } from '../types/dashboard.js'

const TIME_ZONE = 'Asia/Kolkata'

function formatTime(date: Date | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TIME_ZONE })
}

const MOON_PHASES = [
  { max: 0.03, label: 'New Moon' },
  { max: 0.22, label: 'Waxing Crescent' },
  { max: 0.28, label: 'First Quarter' },
  { max: 0.47, label: 'Waxing Gibbous' },
  { max: 0.53, label: 'Full Moon' },
  { max: 0.72, label: 'Waning Gibbous' },
  { max: 0.78, label: 'Last Quarter' },
  { max: 0.97, label: 'Waning Crescent' },
  { max: 1, label: 'New Moon' },
]

function moonPhaseLabel(phase: number): string {
  return MOON_PHASES.find(entry => phase <= entry.max)?.label ?? 'New Moon'
}

export type AstronomyCoordinates = {
  latitude: number
  longitude: number
}

export function calculateAstronomy(date: Date, coordinates: AstronomyCoordinates): DashboardWeatherData['astronomy'] {
  const sunTimes = SunCalc.getTimes(date, coordinates.latitude, coordinates.longitude)
  const moonIllumination = SunCalc.getMoonIllumination(date)
  const moonTimes = SunCalc.getMoonTimes(date, coordinates.latitude, coordinates.longitude)

  return {
    sunrise: formatTime(sunTimes.sunrise),
    sunset: formatTime(sunTimes.sunset),
    solarNoon: formatTime(sunTimes.solarNoon),
    moonPhase: moonPhaseLabel(moonIllumination.phase),
    goldenHour: formatTime(sunTimes.goldenHour),
    moonrise: formatTime(moonTimes.rise),
  }
}
