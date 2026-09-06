# Vercel Serverless Function Configuration for Weather API

The `/api` directory contains Vercel serverless functions that provide weather and location data when deployed to Vercel.

## Problem Solved

On localhost, the backend runs at `http://localhost:3000` and provides full weather data transformation. On Vercel deployments, there is no Node.js backend running, so we need serverless functions.

## Current Implementation Status

### ✅ Location APIs (Working)
- `/api/location/reverse` - Reverse geocoding (coordinates → place name)
- `/api/location/search` - Location search (place name/PIN → coordinates)
- Both use Nominatim (OpenStreetMap) - free, no API key required

### ⚠️ Weather API (Partial Implementation)
- `/api/weather` - Returns raw Open-Meteo forecast data
- **Issue**: Frontend expects fully transformed `DashboardWeatherData` format with computed fields
- **Current Status**: Returns simplified structure, NOT compatible with frontend

## What Needs to be Done

To make weather work on Vercel, you need to either:

1. **Full Backend Port** (Complex - not yet done)
   - Copy ALL backend normalizers, calculators, and rules to `/api/weather.ts`
   - Implement astronomical calculations, AQI fetching, derived metrics, etc.
   - This is a massive refactor (1000+ lines of business logic)

2. **Environment-Based Configuration** (Simple - recommended for now)
   - Use demo weather data on Vercel deployments
   - Keep real backend for localhost development
   - Set `VITE_USE_DEMO_WEATHER=true` in Vercel environment variables

3. **Deploy the Full Backend** (Infrastructure change)
   - Deploy the existing backend as a separate service (Railway, Render, etc.)
   - Update Vercel env vars to point to the deployed backend URL
   - Requires managing a separate deployment

## Recommended Next Steps

### For Immediate Vercel Deployment (Demo Data)

In Vercel Project Settings → Environment Variables, add:
```
VITE_WEATHER_API_URL=
VITE_USE_DEMO_WEATHER=true
VITE_LOCATION_SEARCH_API_URL=/api/location/search
VITE_LOCATION_REVERSE_API_URL=/api/location/reverse
```

This will:
- ✅ Location search works (real data)
- ✅ Manual location selection works  
- ⚠️ Weather shows demo Kolkata data (not location-specific)

### For Real Weather on Vercel (Requires Full Backend Port)

Complete the `toDashboardWeatherData` transformation in `/api/weather.ts` by:
1. Copying `backend/src/normalizers/*` logic
2. Implementing astronomy calculations
3. Adding CPCB AQI fetching with your API key
4. Implementing all derived metrics (comfort, rainfall, etc.)
5. Adding rule-based content (commute, swimming, pollen, etc.)

**Estimated effort**: 6-8 hours of development work

## Files Created

- `/api/weather.ts` - Weather data endpoint (incomplete transformation)
- `/api/location/search.ts` - Location search (fully working)
- `/api/location/reverse.ts` - Reverse geocoding (fully working)
