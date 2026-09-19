import { useSyncExternalStore } from "react"

export type TemperatureUnit = "C" | "F"
export type RainUnit = "mm" | "in"
export type TimeFormat = "12h" | "24h"

export interface AppSettings {
  temperatureUnit: TemperatureUnit
  rainUnit: RainUnit
  timeFormat: TimeFormat
}

export const DEFAULT_SETTINGS: AppSettings = {
  temperatureUnit: "C",
  rainUnit: "mm",
  timeFormat: "12h",
}

export const SETTINGS_STORAGE_KEY = "mausam-settings"

function readStoredSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AppSettings>
      return {
        temperatureUnit: parsed.temperatureUnit === "F" ? "F" : "C",
        rainUnit: parsed.rainUnit === "in" ? "in" : "mm",
        timeFormat: parsed.timeFormat === "24h" ? "24h" : "12h",
      }
    }
  } catch {
    /* ignore and use default */
  }
  return DEFAULT_SETTINGS
}

let currentSettings: AppSettings = readStoredSettings()
const listeners = new Set<() => void>()

export function getSettings(): AppSettings {
  return currentSettings
}

export function subscribeSettings(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function updateSettings(partial: Partial<AppSettings>): void {
  currentSettings = { ...currentSettings, ...partial }
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(currentSettings))
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function useSettings(): [AppSettings, (partial: Partial<AppSettings>) => void] {
  const settings = useSyncExternalStore(subscribeSettings, getSettings, () => DEFAULT_SETTINGS)
  return [settings, updateSettings]
}

// ── Conversion Utilities ──────────────────────────────────────────────────────

/**
 * Converts a temperature in Celsius to the active unit (°C or °F).
 */
export function convertTemperature(
  celsius: number | null | undefined,
  unit: TemperatureUnit,
): number {
  if (celsius === null || celsius === undefined || !Number.isFinite(celsius)) return 0
  if (unit === "F") {
    return Math.round((celsius * 9) / 5 + 32)
  }
  return Math.round(celsius)
}

/**
 * Converts rainfall in mm to the active unit (mm or in).
 */
export function convertRain(
  mm: number | null | undefined,
  unit: RainUnit,
): { value: number; unit: string } {
  if (mm === null || mm === undefined || !Number.isFinite(mm)) {
    return { value: 0, unit: unit === "in" ? "in" : "mm" }
  }
  if (unit === "in") {
    // 1 mm = 0.0393701 inches
    const inches = Number((mm * 0.0393701).toFixed(2))
    return { value: inches, unit: "in" }
  }
  return { value: mm, unit: "mm" }
}

/**
 * Converts a 12-hour formatted time string (e.g. "5:21 AM", "11 AM", "6:14 PM")
 * to 24-hour format ("05:21", "11:00", "18:14") if format is "24h".
 */
export function formatClockTimeStr(timeStr: string | undefined, format: TimeFormat): string {
  if (!timeStr) return ""
  if (format === "12h") return timeStr

  const trimmed = timeStr.trim()
  if (trimmed.toLowerCase() === "now") return trimmed

  // Match e.g. "5:21 AM", "05:21 AM", "5:21 PM", "12:30 AM"
  const matchWithMinutes = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (matchWithMinutes) {
    let hours = parseInt(matchWithMinutes[1], 10)
    const minutes = matchWithMinutes[2]
    const meridiem = matchWithMinutes[3].toUpperCase()

    if (meridiem === "PM" && hours < 12) hours += 12
    if (meridiem === "AM" && hours === 12) hours = 0

    const paddedH = hours.toString().padStart(2, "0")
    return `${paddedH}:${minutes}`
  }

  // Match e.g. "11 AM", "2 PM", "12 AM"
  const matchHoursOnly = trimmed.match(/^(\d{1,2})\s*(AM|PM)$/i)
  if (matchHoursOnly) {
    let hours = parseInt(matchHoursOnly[1], 10)
    const meridiem = matchHoursOnly[2].toUpperCase()

    if (meridiem === "PM" && hours < 12) hours += 12
    if (meridiem === "AM" && hours === 12) hours = 0

    const paddedH = hours.toString().padStart(2, "0")
    return `${paddedH}:00`
  }

  return timeStr
}
