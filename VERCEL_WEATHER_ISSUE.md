# IMPORTANT: Vercel Deployment - Weather Data Issue

## Problem
Manual location search works on Vercel, but weather data still shows hardcoded demo data instead of real data for the selected location.

## Root Cause
The backend with full weather transformation logic (`toDashboardWeatherData`, astronomy calculations, AQI, derived metrics) only runs on localhost. Vercel deployments don't include the backend.

## What I've Done

### ✅ Created Vercel Serverless Functions
1. `/api/location/search.ts` - Location search (WORKS)
2. `/api/location/reverse.ts` - Reverse geocoding (WORKS)
3. `/api/weather.ts` - Weather API (INCOMPLETE - returns raw Open-Meteo data)

### ⚠️ The Weather API Problem
The `/api/weather.ts` function returns simplified Open-Meteo data, but the frontend expects a complex `DashboardWeatherData` structure with:
- Computed comfort indices
- Astronomical calculations (sunrise, sunset, moon phase)
- Rule-based recommendations (commute, swimming, packing, etc.)
- Curated alerts and pollen data
- Derived metrics (hydration advice, heat index, etc.)
- CPCB AQI integration (requires your government API key)

**This would require porting 2000+ lines of backend logic to the serverless function.**

## Options to Fix This

### Option 1: Use Demo Weather on Vercel (Quick Fix - 2 minutes)
Set these in Vercel dashboard → Your Project → Settings → Environment Variables:

```
VITE_USE_DEMO_WEATHER=true
VITE_LOCATION_SEARCH_API_URL=/api/location/search
VITE_LOCATION_REVERSE_API_URL=/api/location/reverse
```

**Result:**
- ✅ Location search works with real data
- ⚠️ Weather shows demo Kolkata data (not specific to selected location)

### Option 2: Complete Backend Port to Vercel Serverless (Complex - 6-8 hours)
Port all backend transformation logic to `/api/weather.ts`:
1. Copy normalizers (conditionCode, uv, timeIndex, etc.)
2. Copy astronomical calculator
3. Copy derived metrics (comfort, rainfall, overview)
4. Copy rule-based systems (commute, swimming, pollen, etc.)
5. Add CPCB AQI integration with API key as Vercel secret

**Result:**
- ✅ Full feature parity with localhost
- ✅ Real weather data for any location

### Option 3: Deploy Backend Separately (Infrastructure Change)
Deploy the existing backend to Railway/Render/Fly.io and update Vercel env vars:

```
VITE_WEATHER_API_URL=https://your-backend.railway.app/api/weather
VITE_LOCATION_SEARCH_API_URL=https://your-backend.railway.app/api/location/search
VITE_LOCATION_REVERSE_API_URL=https://your-backend.railway.app/api/location/reverse
```

**Result:**
- ✅ Full feature parity
- ⚠️ Need to manage separate backend deployment

## My Recommendation

**For immediate deployment**: Use Option 1 (demo weather)
**For production**: Use Option 3 (deploy backend separately) or complete Option 2

## What to Tell Users

If using Option 1:
> "Weather data is currently showing demo information. Location selection works correctly - this determines which area name appears, but the weather metrics shown are sample data for demonstration purposes."

## Files Modified
- `src/location.ts` - Added hostname check to use Nominatim directly on non-localhost
- `src/weatherData.ts` - Added hostname check to return demo data on non-localhost  
- `/api/*` - Created Vercel serverless functions for location APIs

## Next Steps

Choose one of the three options above and I'll help you implement it.
