import React, { useState, useEffect, useRef } from "react"
import { searchLocations, type LocationSearchResult, type UserLocation } from "@/services/locationService"
import { useTranslation } from "@/i18n/LanguageContext"
import { Icon } from "@/components/icons/Icon"
import "./SpotlightLocationSearch.css"

export interface SelectedLocationData {
  name: string
  region: string
  latitude: number
  longitude: number
  distance?: string
}

interface SpotlightLocationSearchProps {
  isOpen: boolean
  onClose: () => void
  onSelectLocation: (loc: SelectedLocationData) => void
  userLocation: UserLocation | null
  theme?: "dark" | "light"
}

const POPULAR_SUGGESTIONS: Array<{ name: string; region: string; lat: number; lon: number }> = [
  { name: "Digha Beach", region: "West Bengal", lat: 21.6266, lon: 87.5074 },
  { name: "Darjeeling", region: "West Bengal", lat: 27.041, lon: 88.2663 },
  { name: "Sundarbans", region: "West Bengal", lat: 21.9497, lon: 88.9004 },
  { name: "Puri", region: "Odisha", lat: 19.8135, lon: 85.8312 },
]

export function computeDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export const SpotlightLocationSearch: React.FC<SpotlightLocationSearchProps> = ({
  isOpen,
  onClose,
  onSelectLocation,
  userLocation,
  theme = "light",
}) => {
  const { t, td } = useTranslation()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<LocationSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prevOverflow
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setQuery("")
      setResults([])
      setSelectedIndex(0)
      const timer = setTimeout(() => {
        inputRef.current?.focus({ preventScroll: true })
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (!isOpen) return
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const searchRes = await searchLocations(trimmed, controller.signal)
        setResults(searchRes)
        setSelectedIndex(0)
      } catch (err) {
        if (!controller.signal.aborted) {
          setResults([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }, 280)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) =>
          results.length > 0 ? (prev - 1 + results.length) % results.length : 0,
        )
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (results.length > 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, results, selectedIndex])

  if (!isOpen) return null

  const handleSelect = (item: {
    name: string
    region?: string
    latitude: number
    longitude: number
  }) => {
    let distStr: string | undefined
    if (userLocation) {
      const d = computeDistanceKm(
        userLocation.latitude,
        userLocation.longitude,
        item.latitude,
        item.longitude,
      )
      distStr = `${d} km`
    }
    onSelectLocation({
      name: item.name,
      region: item.region || "",
      latitude: item.latitude,
      longitude: item.longitude,
      distance: distStr,
    })
    onClose()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  return (
    <div
      className={`spotlight-backdrop ${theme ? `theme-${theme}` : ""}`}
      data-theme={theme}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={t("alerts.searchPlaceholder")}
    >
      <div className="spotlight-container" ref={containerRef}>
        {/* Spotlight Search Bar */}
        <div className="spotlight-bar">
          <div className="spotlight-search-icon">
            <Icon name="search" />
          </div>
          <input
            ref={inputRef}
            type="text"
            className="spotlight-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("alerts.searchPlaceholder")}
            autoComplete="off"
            spellCheck="false"
          />
          <div className="spotlight-actions">
            {query && (
              <button
                type="button"
                className="spotlight-clear-btn"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="spotlight-status">
            <div className="spotlight-spinner" />
            <span>{t("alerts.searching")}</span>
          </div>
        )}

        {/* Search Results */}
        {!loading && query.trim() && results.length > 0 && (
          <div className="spotlight-results">
            {results.map((item, idx) => {
              const dist =
                userLocation &&
                computeDistanceKm(
                  userLocation.latitude,
                  userLocation.longitude,
                  item.latitude,
                  item.longitude,
                )
              return (
                <button
                  key={`${item.name}-${item.latitude}-${item.longitude}-${idx}`}
                  type="button"
                  className={`spotlight-result-item ${idx === selectedIndex ? "selected" : ""}`}
                  onClick={() => handleSelect(item)}
                >
                  <div className="spotlight-result-main">
                    <div className="spotlight-pin-icon">
                      <Icon name="pin" />
                    </div>
                    <div className="spotlight-text-block">
                      <div className="spotlight-place-name">
                        <span data-i18n-ignore>{td(item.name)}</span>
                      </div>
                      <div className="spotlight-place-meta">
                        <span data-i18n-ignore>
                          {item.region ? td(item.region) : item.country}
                          {item.postalCode ? ` · ${item.postalCode}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  {dist !== null && dist !== undefined && (
                    <div className="spotlight-distance-pill">
                      <span data-i18n-ignore>{dist} km</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* No Results Found */}
        {!loading && query.trim() && results.length === 0 && (
          <div className="spotlight-status">
            <span>{t("alerts.noResults")}</span>
          </div>
        )}

        {/* Quick Suggestions when empty */}
        {!query.trim() && (
          <div className="spotlight-suggestions">
            <div className="spotlight-section-title">{t("alerts.popularPlaces")}</div>
            <div className="spotlight-chips">
              {POPULAR_SUGGESTIONS.map((item) => {
                const dist =
                  userLocation &&
                  computeDistanceKm(
                    userLocation.latitude,
                    userLocation.longitude,
                    item.lat,
                    item.lon,
                  )
                return (
                  <button
                    key={item.name}
                    type="button"
                    className="spotlight-chip"
                    onClick={() =>
                      handleSelect({
                        name: item.name,
                        region: item.region,
                        latitude: item.lat,
                        longitude: item.lon,
                      })
                    }
                  >
                    <Icon name="pin" />
                    <span data-i18n-ignore>{td(item.name)}</span>
                    {dist !== null && dist !== undefined && (
                      <span
                        data-i18n-ignore
                        style={{ opacity: 0.5, fontSize: 10, marginLeft: 2 }}
                      >
                        · {dist}km
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
