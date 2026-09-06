import type { VercelRequest, VercelResponse } from '@vercel/node'

// Minimal serverless weather endpoint for Vercel deployments
// Fetches real weather data from Open-Meteo (free, no API key needed)
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { latitude, longitude, locality, region, country, source } = req.query

    const lat = latitude ? parseFloat(latitude as string) : undefined
    const lon = longitude ? parseFloat(longitude as string) : undefined

    if (lat === undefined || lon === undefined) {
      return res.status(400).json({ error: 'latitude and longitude are required' })
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Invalid latitude/longitude' })
    }

    // Fetch from Open-Meteo (free weather API, no key needed)
    const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast')
    forecastUrl.searchParams.set('latitude', lat.toString())
    forecastUrl.searchParams.set('longitude', lon.toString())
    forecastUrl.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,dew_point_2m')
    forecastUrl.searchParams.set('hourly', 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,is_day,surface_pressure,dew_point_2m')
    forecastUrl.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant')
    forecastUrl.searchParams.set('timezone', 'auto')
    forecastUrl.searchParams.set('current_weather', 'true')
    forecastUrl.searchParams.set('forecast_days', '7')

    const response = await fetch(forecastUrl.toString(), {
      headers: { 'Accept': 'application/json' }
    })
    
    if (!response.ok) {
      console.error('Open-Meteo API error:', response.status, response.statusText)
      return res.status(502).json({ error: 'Weather data is temporarily unavailable' })
    }

    const data = await response.json()

    // Return the raw Open-Meteo response
    // The frontend already knows how to handle this format
    return res.status(200).json({
      data,
      metadata: {
        locality: locality || 'Selected location',
        region: region || '',
        country: country || '',
        latitude: lat,
        longitude: lon,
        source: source || 'manual'
      }
    })
  } catch (error) {
    console.error('Weather API handler error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
