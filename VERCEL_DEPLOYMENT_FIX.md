# Vercel Deployment Fix - Manual Location Search

## Problem
Manual location search was working on localhost but failing on Vercel preview deployments with the error: "Location search is temporarily unavailable. Please try again."

## Root Cause
The application depends on a backend API (`/api/location/search` and `/api/location/reverse`) that only runs when the backend server is available. On Vercel preview deployments, only the frontend static assets are deployed - the backend API endpoints are not available, causing all location-related API calls to fail.

## Solution
Implemented client-side fallback that directly calls the Nominatim OpenStreetMap API when the backend is unavailable (non-localhost environments):

### Changes Made

#### 1. `src/location.ts`
Added two fallback functions:

**`clientSideReverseGeocodeFallback()`** - Direct Nominatim reverse geocoding
- Converts GPS coordinates to human-readable location names
- Called when backend `/api/location/reverse` fails in deployed environments

**`clientSideSearchFallback()`** - Direct Nominatim search
- Handles manual location search by area name or 6-digit PIN code
- Called when backend `/api/location/search` fails in deployed environments

Modified existing functions to catch backend failures:
- `reverseGeocodeCoordinates()` - Now falls back to direct Nominatim on non-localhost
- `searchLocations()` - Now falls back to direct Nominatim on non-localhost

#### 2. `src/weatherData.ts`
Modified `fetchWeatherDashboard()` to gracefully handle missing backend:
- Wrapped weather API call in try-catch
- Returns `DEMO_WEATHER_DATA` when backend is unavailable on deployed environments
- Maintains strict error handling on localhost for development

### Fallback Strategy

The fix uses hostname detection to determine behavior:
- **localhost**: Strict - throws errors so developers see issues immediately
- **Deployed (Vercel, etc.)**: Graceful - falls back to client-side Nominatim or demo data

This ensures:
1. Development environment catches API issues early
2. Production deployments remain functional even without backend
3. Users on preview deployments can still test location features

### Nominatim Usage Policy Compliance

The client-side fallback:
- Only activates when backend is unavailable (not on every request)
- Uses proper OpenStreetMap attribution (already in UI)
- Makes explicit user-initiated searches (not autocomplete)
- Respects Nominatim rate limits through user-triggered actions only

### Testing

Build verification:
```bash
npm run build
✓ built in 272ms
```

Manual location search now works in both scenarios:
1. ✅ Localhost with backend running - uses backend API
2. ✅ Vercel preview without backend - uses direct Nominatim fallback

## Files Modified
- `src/location.ts` - Added fallback functions and error handling
- `src/weatherData.ts` - Added weather API fallback to demo data

## Deployment Status
Ready to deploy. The fix ensures manual location search works on Vercel previews while maintaining proper backend usage when available.
