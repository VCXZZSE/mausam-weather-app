<div align="center">

# MAUSAM

### Weather Intelligence for a Safer, Better Tomorrow

**Real Weather. Real Impact.**

A mobile-first weather intelligence platform built for India, combining live weather, government-backed air-quality data, practical forecasts, and decision-ready daily guidance in one focused interface.

<br>

[**Live Application**](https://mausam-roan.vercel.app) · [**API & Deployment Guide**](api/README.md)

<br>

**290+ automated tests completed successfully**

</div>

---
<img width="1672" height="941" alt="ChatGPT Image Sep 10, 2026, 10_52_20 AM" src="https://github.com/user-attachments/assets/4ae25156-4e11-4f82-833f-340b675d9cc2" />

---

## 1. Overview

**Mausam** translates weather data into actionable information for everyday life.

The platform is designed around a simple principle:

> **Weather information should help people make better decisions, not simply display numbers.**

Mausam combines location-specific forecasts, current atmospheric conditions, Indian air-quality information, astronomy and comfort metrics, and rule-based activity guidance into a single mobile-first experience.

The interface follows a restrained, premium visual language with frosted-glass surfaces, responsive layouts, animated weather elements, and light/dark themes.

---

## 2. Core Capabilities

| Capability | Description |
|---|---|
| **Location Intelligence** | Detect location through device coordinates or search by place/PIN. |
| **Current Conditions** | Temperature, feels-like temperature, precipitation conditions, humidity, wind, and visibility. |
| **Hourly Forecast** | Short-term forecast with precipitation probability and evolving conditions. |
| **7-Day Forecast** | Extended outlook for planning across the week. |
| **Indian AQI** | Nearest qualifying CPCB station, National AQI category, pollutant sub-indices, station distance, and reporting time. |
| **Comfort & Astronomy** | UV, sun/moon information, and derived comfort and environmental metrics. |
| **Activity Guidance** | Weather-aware recommendations for commuting, running, swimming, gardening, packing, and other daily activities. |
| **Personalised Briefing** | Profile-aware weather summary with relevant metrics and suggested activity windows. |
| **Profile & Preferences** | Local profile, confirmed location, theme, and onboarding preferences. |
| **Responsive Experience** | Mobile-first interface with desktop support, reduced-motion handling, and light/dark themes. |
| **Android Application** | Capacitor-based Android wrapper for the web application. |

---

## 3. Data & Intelligence Architecture

Mausam separates external data acquisition from transformation and presentation.

```text
User / Selected Location
          │
          ▼
Latitude + Longitude
          │
          ▼
     /api/weather
          │
     ┌────┴────┐
     ▼         ▼
Open-Meteo   CPCB
 Weather    Station Data
     │         │
     └────┬────┘
          ▼
 Normalisation & Validation
          │
          ▼
 Astronomy · Comfort · Derived Metrics
          │
          ▼
 Activity & Planning Rules
          │
          ▼
 Location-Specific Dashboard
