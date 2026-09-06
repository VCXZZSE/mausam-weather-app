import type { VercelRequest, VercelResponse } from '@vercel/node'

// Location search using Nominatim (OpenStreetMap) - free, no API key
export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { query } = req.query

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid or missing query' })
    }

    const searchQuery = query.trim()

    // Validate PIN code format if it's all digits
    if (/^\d+$/.test(searchQuery) && !/^[1-9]\d{5}$/.test(searchQuery)) {
      return res.status(400).json({ error: 'Indian PIN codes must contain exactly 6 digits' })
    }

    const isPinCode = /^[1-9]\d{5}$/.test(searchQuery)

    // Use Nominatim for search
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search')
    
    if (isPinCode) {
      nominatimUrl.searchParams.set('postalcode', searchQuery)
      nominatimUrl.searchParams.set('country', 'India')
    } else {
      nominatimUrl.searchParams.set('q', `${searchQuery}, India`)
    }
    
    nominatimUrl.searchParams.set('format', 'jsonv2')
    nominatimUrl.searchParams.set('addressdetails', '1')
    nominatimUrl.searchParams.set('limit', '10')

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'MausamWeatherApp/1.0 (Vercel Deployment)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      console.error('Nominatim search failed:', response.status)
      return res.status(502).json({ error: 'Search is temporarily unavailable' })
    }

    const rawData = await response.json()

    // Transform to expected format
    const results = rawData.map((item: any) => {
      const addr = item.address || {}
      return {
        locality: addr.suburb || addr.neighbourhood || addr.city || addr.town || addr.village || item.name || '',
        region: addr.state || '',
        country: addr.country || 'India',
        countryCode: 'IN',
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        displayName: item.display_name
      }
    })

    return res.status(200).json(results)
  } catch (error) {
    console.error('Location search error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
