import { useState, useEffect } from 'react'
import { WeatherData, fetchWeather } from '../lib/weather'

const DEFAULT: WeatherData = {
  temp: 0, feelsLike: 0, city: '…', condition: '', conditionKey: 'unknown',
  nextHours: 2, loading: true, error: false,
}

export function useWeather(): WeatherData {
  const [data, setData] = useState<WeatherData>(DEFAULT)

  useEffect(() => {
    const load = (lat: number, lon: number, city: string) =>
      fetchWeather(lat, lon, city)
        .then(d => setData(prev => ({ ...prev, ...d, loading: false, error: false })))
        .catch(() => setData(prev => ({ ...prev, loading: false, error: true })))

    if (!('geolocation' in navigator)) {
      load(40.7128, -74.006, 'New York')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lon } = pos.coords
        try {
          const geo  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
          ).then(r => r.json())
          const city = geo.address?.city || geo.address?.town || geo.address?.village || 'Your City'
          load(lat, lon, city)
        } catch {
          load(lat, lon, 'Your City')
        }
      },
      () => load(40.7128, -74.006, 'New York'),
      { timeout: 7000 }
    )
  }, [])

  return data
}
