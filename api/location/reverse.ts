// Vercel serverless function for reverse geocoding
// Uses Nominatim (OpenStreetMap) - free, no API key

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { latitude, longitude } = req.query

    const lat = latitude ? parseFloat(latitude as string) : undefined
    const lon = longitude ? parseFloat(longitude as string) : undefined

    if (lat === undefined || lon === undefined || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Invalid or missing latitude/longitude' })
    }

    // Use Nominatim for reverse geocoding
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/reverse')
    nominatimUrl.searchParams.set('lat', lat.toString())
    nominatimUrl.searchParams.set('lon', lon.toString())
    nominatimUrl.searchParams.set('format', 'jsonv2')
    nominatimUrl.searchParams.set('addressdetails', '1')
    nominatimUrl.searchParams.set('zoom', '14')

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'MausamWeatherApp/1.0 (Vercel Deployment)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Nominatim reverse geocode failed:', response.status)
      return res.status(502).json({ error: 'Unable to resolve this location right now' })
    }

    const data = await response.json()

    // Extract location information
    const addr = data.address || {}
    const result = {
      locality: addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village || '',
      region: addr.state || '',
      country: addr.country || '',
      countryCode: addr.country_code?.toUpperCase() || '',
      latitude: lat,
      longitude: lon,
      attribution: '© OpenStreetMap contributors'
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
