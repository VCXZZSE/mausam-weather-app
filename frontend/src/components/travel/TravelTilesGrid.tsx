import React, { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "@/i18n/LanguageContext"
import { type UserLocation } from "@/services/locationService"
import { resolveWeatherIcon } from "@/services/weatherData"
import { Icon } from "@/components/icons/Icon"
import { useSettings, convertTemperature } from "@/services/settingsStore"
import {
  SpotlightLocationSearch,
  type SelectedLocationData,
  computeDistanceKm,
} from "./SpotlightLocationSearch"
import "./TravelTilesGrid.css"

const STORAGE_KEY = "mausam_custom_travel_locations"
const TOTAL_SLOTS = 4

export interface TravelLocationSlot {
  name: string
  region: string
  latitude: number
  longitude: number
  temperature: number
  condition: string
  conditionCode: string
  icon?: string
  isDay?: boolean
  distance?: string
  lastUpdated?: number
}

interface TravelTilesGridProps {
  userLocation: UserLocation | null
  theme?: "dark" | "light"
}

const WMO_MAP: Record<
  number,
  { label: string; code: string; icon: string }
> = {
  0: { label: "Clear", code: "sunny", icon: "sun" },
  1: { label: "Mainly Clear", code: "sunny", icon: "sun" },
  2: { label: "Partly Cloudy", code: "partly_cloudy", icon: "partly-cloudy" },
  3: { label: "Overcast", code: "cloudy", icon: "cloud" },
  45: { label: "Foggy", code: "fog", icon: "fog" },
  48: { label: "Depositing Rime Fog", code: "fog", icon: "fog" },
  51: { label: "Light Drizzle", code: "drizzle", icon: "drizzle" },
  53: { label: "Moderate Drizzle", code: "drizzle", icon: "drizzle" },
  55: { label: "Dense Drizzle", code: "drizzle", icon: "drizzle" },
  61: { label: "Slight Rain", code: "rain", icon: "rain-cloud" },
  63: { label: "Moderate Rain", code: "rain", icon: "rain-cloud" },
  65: { label: "Heavy Rain", code: "heavy_rain", icon: "rain-cloud" },
  71: { label: "Slight Snow", code: "snow", icon: "snow" },
  73: { label: "Moderate Snow", code: "snow", icon: "snow" },
  75: { label: "Heavy Snow", code: "snow", icon: "snow" },
  80: { label: "Showers", code: "showers", icon: "rain-cloud" },
  81: { label: "Moderate Showers", code: "showers", icon: "rain-cloud" },
  82: { label: "Violent Showers", code: "showers", icon: "rain-cloud" },
  95: { label: "Thunderstorm", code: "storm", icon: "thunderstorms-rain" },
  96: { label: "Thunderstorm with Hail", code: "storm", icon: "thunderstorms-rain" },
  99: { label: "Severe Thunderstorm", code: "storm", icon: "thunderstorms-rain" },
}

function decodeWmoWeather(code: number, isDay: boolean = true) {
  const match = WMO_MAP[code] || {
    label: "Scattered Clouds",
    code: "cloudy",
    icon: isDay ? "sun" : "moon",
  }
  let icon = match.icon
  if (!isDay && (match.code === "sunny" || match.code === "clear")) {
    icon = "moon"
  }
  return {
    condition: match.label,
    conditionCode: match.code,
    icon,
  }
}

interface SlotWeatherData {
  temperature: number
  condition: string
  conditionCode: string
  icon?: string
  isDay?: boolean
}

const slotWeatherCache = new Map<string, { data: SlotWeatherData; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function fetchSlotWeather(
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<SlotWeatherData> {
  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`
  const cached = slotWeatherCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,is_day&timezone=auto`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error("Failed to fetch weather for location")
  const data = await res.json()
  const current = data.current || {}
  const temp = Math.round(Number(current.temperature_2m ?? 28))
  const isDay = current.is_day === 1 || current.is_day === undefined
  const wmo = decodeWmoWeather(Number(current.weather_code ?? 0), isDay)

  const result: SlotWeatherData = {
    temperature: temp,
    condition: wmo.condition,
    conditionCode: wmo.conditionCode,
    icon: wmo.icon,
    isDay,
  }
  slotWeatherCache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
}

export const TravelTilesGrid: React.FC<TravelTilesGridProps> = ({
  userLocation,
  theme = "light",
}) => {
  const { t, td, nu } = useTranslation()
  const [settings] = useSettings()
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Initialize 4 slots from localStorage or empty
  const [slots, setSlots] = useState<(TravelLocationSlot | null)[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          const filled = Array.from({ length: TOTAL_SLOTS }, (_, i) => parsed[i] || null)
          return filled
        }
      }
    } catch {
      /* ignore */
    }
    return Array.from({ length: TOTAL_SLOTS }, () => null)
  })

  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null)
  const [updatingSlot, setUpdatingSlot] = useState<number | null>(null)

  // Save to localStorage when slots change
  const saveSlots = (newSlots: (TravelLocationSlot | null)[]) => {
    setSlots(newSlots)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSlots))
    } catch {
      /* ignore */
    }
  }

  // Refresh weather for filled slots concurrently in parallel
  const refreshSlotsWeather = useCallback(async () => {
    const nextSlots = [...slots]
    const filledIndices = nextSlots
      .map((slot, index) => (slot ? index : -1))
      .filter((index) => index !== -1)

    if (filledIndices.length === 0) return

    const fetchPromises = filledIndices.map(async (i) => {
      const slot = nextSlots[i]!
      try {
        const fresh = await fetchSlotWeather(slot.latitude, slot.longitude)
        let distStr = slot.distance
        if (userLocation) {
          const d = computeDistanceKm(
            userLocation.latitude,
            userLocation.longitude,
            slot.latitude,
            slot.longitude,
          )
          distStr = d > 0 ? `${d} km` : slot.distance
        }
        return {
          index: i,
          updated: {
            ...slot,
            temperature: fresh.temperature,
            condition: fresh.condition,
            conditionCode: fresh.conditionCode,
            icon: fresh.icon,
            isDay: fresh.isDay,
            distance: distStr,
            lastUpdated: Date.now(),
          },
        }
      } catch {
        return null
      }
    })

    const results = await Promise.allSettled(fetchPromises)
    if (!isMountedRef.current) return

    let changed = false
    results.forEach((res) => {
      if (res.status === "fulfilled" && res.value) {
        nextSlots[res.value.index] = res.value.updated
        changed = true
      }
    })

    if (changed && isMountedRef.current) {
      saveSlots(nextSlots)
    }
  }, [slots, userLocation])

  useEffect(() => {
    const hasFilled = slots.some((s) => s !== null)
    if (hasFilled) {
      void refreshSlotsWeather()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation?.latitude, userLocation?.longitude])

  const handleOpenSearch = (index: number) => {
    setActiveSlotIndex(index)
  }

  const handleSelectLocation = async (locData: SelectedLocationData) => {
    if (activeSlotIndex === null) return
    const index = activeSlotIndex

    setUpdatingSlot(index)
    try {
      const weather = await fetchSlotWeather(locData.latitude, locData.longitude)
      let distStr = locData.distance
      if (!distStr && userLocation) {
        const d = computeDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          locData.latitude,
          locData.longitude,
        )
        distStr = `${d} km`
      }

      const newSlot: TravelLocationSlot = {
        name: locData.name,
        region: locData.region,
        latitude: locData.latitude,
        longitude: locData.longitude,
        temperature: weather.temperature,
        condition: weather.condition,
        conditionCode: weather.conditionCode,
        icon: weather.icon,
        isDay: weather.isDay,
        distance: distStr,
        lastUpdated: Date.now(),
      }

      const nextSlots = [...slots]
      nextSlots[index] = newSlot
      saveSlots(nextSlots)
    } catch {
      // Fallback with demo values if offline
      let distStr = locData.distance
      if (!distStr && userLocation) {
        const d = computeDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          locData.latitude,
          locData.longitude,
        )
        distStr = `${d} km`
      }
      const fallbackSlot: TravelLocationSlot = {
        name: locData.name,
        region: locData.region,
        latitude: locData.latitude,
        longitude: locData.longitude,
        temperature: 28,
        condition: "Scattered Clouds",
        conditionCode: "cloudy",
        icon: "cloud",
        isDay: true,
        distance: distStr,
        lastUpdated: Date.now(),
      }
      const nextSlots = [...slots]
      nextSlots[index] = fallbackSlot
      saveSlots(nextSlots)
    } finally {
      setUpdatingSlot(null)
      setActiveSlotIndex(null)
    }
  }

  const handleRemoveSlot = (e: React.MouseEvent, index: number) => {
    e.stopPropagation()
    const nextSlots = [...slots]
    nextSlots[index] = null
    saveSlots(nextSlots)
  }

  return (
    <>
      <div
        className={`travel-tiles-grid ${theme ? `theme-${theme}` : ""}`}
        data-theme={theme}
      >
        {slots.map((slot, index) => {
          if (!slot) {
            return (
              <div
                key={`empty-slot-${index}`}
                className="travel-tile travel-tile-empty"
                onClick={() => handleOpenSearch(index)}
                role="button"
                tabIndex={0}
                aria-label={t("alerts.addLocation")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    handleOpenSearch(index)
                  }
                }}
              >
                <div className="travel-tile-plus-icon">
                  <Icon name="plus" />
                </div>
                <div className="travel-tile-empty-label">{t("alerts.addLocation")}</div>
              </div>
            )
          }

          // Calculate fresh distance if userLocation is available
          const currentDistance =
            userLocation &&
            computeDistanceKm(
              userLocation.latitude,
              userLocation.longitude,
              slot.latitude,
              slot.longitude,
            )
          const displayDistance =
            currentDistance !== null && currentDistance !== undefined
              ? `${currentDistance} km`
              : slot.distance

          const iconName = resolveWeatherIcon(
            slot.conditionCode,
            slot.icon,
            slot.isDay,
          )

          return (
            <div
              key={`filled-slot-${index}-${slot.name}`}
              className="travel-tile travel-tile-filled"
              onClick={() => handleOpenSearch(index)}
            >
              <div className="travel-tile-top">
                <div className="travel-tile-icon-box">
                  <Icon name={iconName} label={td(slot.condition)} />
                </div>
                <div className="travel-tile-badges">
                  {displayDistance && (
                    <div className="travel-tile-distance">
                      <span data-i18n-ignore>{td(displayDistance)}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    className="travel-tile-remove-btn"
                    onClick={(e) => handleRemoveSlot(e, index)}
                    aria-label={t("alerts.remove")}
                    title={t("alerts.remove")}
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="travel-tile-mid">
                <div className="travel-tile-name">
                  <span data-i18n-ignore>{td(slot.name)}</span>
                </div>
                <div className="travel-tile-condition">{td(slot.condition)}</div>
              </div>

              <div className="travel-tile-bottom">
                <div className="travel-tile-temp">
                  {nu(convertTemperature(slot.temperature, settings.temperatureUnit), "unit.degree")}
                </div>
                {updatingSlot === index && (
                  <div className="travel-tile-updating">{t("alerts.searching")}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <SpotlightLocationSearch
        isOpen={activeSlotIndex !== null}
        onClose={() => setActiveSlotIndex(null)}
        onSelectLocation={handleSelectLocation}
        userLocation={userLocation}
        theme={theme}
      />
    </>
  )
}
