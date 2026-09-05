import type { WeatherPayload } from '../normalizers/toDashboardWeatherData.js'
import type { Persona } from './types.js'
import type { TopRisk } from './riskDetection.js'

export type ComposedBriefing = {
  summary: string
  recommendation: string
  actions: string[]
}

export type PersonaContext = {
  temperature: number
  feelsLike: number
  windSpeed: number
  rainChance: number
  city: string
  condition: string
  uvIndex: number
  uvLabel: string
  aqiIndex: number | null
  aqiLabel: string | null
}

function buildContext(weather: WeatherPayload): PersonaContext {
  const current = weather.current
  const temperature = current.temperature ?? 0
  return {
    temperature,
    feelsLike: current.feelsLike ?? temperature,
    windSpeed: current.windSpeed ?? 0,
    rainChance: weather.daily[0]?.rainChance ?? 0,
    city: current.city ?? 'your area',
    condition: current.condition ?? 'clear conditions',
    uvIndex: weather.uv.index,
    uvLabel: weather.uv.label,
    aqiIndex: weather.airQuality?.index ?? null,
    aqiLabel: weather.airQuality?.label ?? null,
  }
}

// Every composer below is gated on the SAME topRisk (see riskDetection.ts)
// in the same fixed priority order, so no persona can ever produce advice
// that contradicts the most severe active risk (e.g. "great day outside"
// while a thunderstorm risk is active) — the favorable-conditions branch
// is only reachable when topRisk is null.

function commuter(ctx: PersonaContext, topRisk: TopRisk): ComposedBriefing {
  switch (topRisk?.type) {
    case 'thunderstorm':
      return {
        summary: 'Thunderstorms are expected, which can disrupt travel and pose safety risks.',
        recommendation: 'Allow extra travel time and avoid exposed routes until storms pass.',
        actions: ['Avoid open or exposed routes during thunderstorms', 'Allow extra travel time today'],
      }
    case 'heat':
      return {
        summary: `It will feel like ${Math.round(ctx.feelsLike)}°C, which can make commuting uncomfortable.`,
        recommendation: 'Stay hydrated and avoid unnecessary time outdoors while commuting.',
        actions: ['Carry water during your commute', 'Avoid waiting outdoors longer than necessary'],
      }
    case 'rain':
      return {
        summary: `Rain chance is ${Math.round(ctx.rainChance)}% — commutes may take longer than usual.`,
        recommendation: 'Allow extra travel time and carry rain protection.',
        actions: ['Allow extra travel time', 'Carry an umbrella or rain jacket'],
      }
    case 'wind':
      return {
        summary: `Winds are near ${Math.round(ctx.windSpeed)} km/h — exposed routes may be affected.`,
        recommendation: 'Use caution on exposed roads or bridges during your commute.',
        actions: ['Use caution on exposed routes', 'Secure loose belongings while traveling'],
      }
    case 'uv':
      return {
        summary: `UV is ${ctx.uvLabel.toLowerCase()} today.`,
        recommendation: 'Commute conditions are otherwise favorable; use sun protection if walking.',
        actions: ['Wear sun protection if walking or waiting outdoors'],
      }
    default:
      return {
        summary: 'Commute conditions look favorable today.',
        recommendation: 'No significant weather disruption expected for your commute.',
        actions: ['No special precautions needed for your commute today'],
      }
  }
}

function outdoor(ctx: PersonaContext, topRisk: TopRisk): ComposedBriefing {
  switch (topRisk?.type) {
    case 'thunderstorm':
      return {
        summary: 'Thunderstorms are expected, which makes outdoor plans risky today.',
        recommendation: 'Avoid outdoor activity until thunderstorms clear.',
        actions: ['Postpone outdoor plans while thunderstorms are active', 'Move activity indoors if possible'],
      }
    case 'heat':
      return {
        summary: `It will feel like ${Math.round(ctx.feelsLike)}°C, which is uncomfortable for extended outdoor activity.`,
        recommendation: 'Shift outdoor plans to early morning or evening.',
        actions: ['Avoid outdoor activity during peak afternoon heat', 'Carry water if you go outside'],
      }
    case 'rain':
      return {
        summary: `Rain chance is ${Math.round(ctx.rainChance)}%, so outdoor plans carry some risk today.`,
        recommendation: 'Aim for an earlier window and carry rain protection.',
        actions: ['Check conditions again before heading out', 'Carry an umbrella or rain jacket'],
      }
    case 'uv':
      return {
        summary: `UV is ${ctx.uvLabel.toLowerCase()} today (index ${ctx.uvIndex}).`,
        recommendation: 'Outdoor activity is fine with sun protection.',
        actions: ['Wear sunscreen and sunglasses if outside', 'Avoid extended midday sun exposure'],
      }
    case 'wind':
      return {
        summary: `Winds are near ${Math.round(ctx.windSpeed)} km/h today.`,
        recommendation: 'Outdoor activity is fine, but avoid exposed high ground.',
        actions: ['Avoid exposed or elevated areas in strong wind'],
      }
    default:
      return {
        summary: 'Conditions look favorable for outdoor activity today.',
        recommendation: 'This is a good day to be outside.',
        actions: ['Enjoy outdoor activity — conditions are favorable today'],
      }
  }
}

function student(ctx: PersonaContext, topRisk: TopRisk): ComposedBriefing {
  switch (topRisk?.type) {
    case 'thunderstorm':
      return {
        summary: 'Thunderstorms are expected, so travel to and from school/college carries risk.',
        recommendation: 'Avoid exposed travel while thunderstorms are active.',
        actions: ['Avoid exposed travel during thunderstorms', 'Keep a rain layer or shelter plan ready'],
      }
    case 'heat':
      return {
        summary: `It will feel like ${Math.round(ctx.feelsLike)}°C — that's tiring for a full day out.`,
        recommendation: 'Stay hydrated and rest when possible during peak heat.',
        actions: ['Carry water through the day', 'Rest indoors during peak afternoon heat'],
      }
    case 'rain':
      return {
        summary: `Rain chance is ${Math.round(ctx.rainChance)}% — plan for a wetter commute.`,
        recommendation: 'Carry rain protection and allow extra travel time.',
        actions: ['Carry an umbrella or rain jacket', 'Allow extra travel time'],
      }
    default:
      return {
        summary: 'Conditions look comfortable for commuting and studying outdoors between classes.',
        recommendation: 'No special precautions needed today.',
        actions: ['Conditions are favorable for your normal routine'],
      }
  }
}

function health(ctx: PersonaContext, topRisk: TopRisk): ComposedBriefing {
  switch (topRisk?.type) {
    case 'thunderstorm':
      return {
        summary: 'Thunderstorms are expected, which is a safety concern for anyone outdoors.',
        recommendation: 'Stay indoors while thunderstorms are active.',
        actions: ['Stay indoors during thunderstorms', 'Avoid open areas and tall isolated structures'],
      }
    case 'aqi':
      return {
        summary: `US AQI is ${ctx.aqiIndex} (${ctx.aqiLabel ?? 'elevated'}) — this can affect sensitive individuals.`,
        recommendation: 'Reduce prolonged outdoor exposure, especially with respiratory sensitivities.',
        actions: ['Limit prolonged outdoor exertion', 'Consider a mask outdoors if sensitive to air quality'],
      }
    case 'heat':
      return {
        summary: `It will feel like ${Math.round(ctx.feelsLike)}°C — heat stress risk is elevated.`,
        recommendation: 'Prioritize hydration and cooling; avoid peak-heat exertion.',
        actions: ['Drink water regularly through the day', 'Avoid strenuous activity during peak heat'],
      }
    case 'uv':
      return {
        summary: `UV index is ${ctx.uvIndex} (${ctx.uvLabel}).`,
        recommendation: 'Use sun protection for any outdoor time.',
        actions: ['Apply sunscreen before going outside', 'Wear sunglasses and a hat if outdoors'],
      }
    case 'rain':
      return {
        summary: `Rain chance is ${Math.round(ctx.rainChance)}% — wet conditions can increase slip/fall risk.`,
        recommendation: 'Take care on wet surfaces and carry rain protection.',
        actions: ['Wear appropriate footwear for wet conditions', 'Carry rain protection'],
      }
    default:
      return {
        summary: 'Weather-related health risk is low today.',
        recommendation: 'No specific precautions needed based on current conditions.',
        actions: ['Conditions are favorable — no specific weather precautions needed'],
      }
  }
}

function general(ctx: PersonaContext, topRisk: TopRisk): ComposedBriefing {
  if (topRisk) {
    return {
      summary: `${topRisk.label} today, which is the main thing to plan around.`,
      recommendation: topRisk.type === 'thunderstorm'
        ? 'Avoid outdoor exposure until conditions clear.'
        : 'Plan around this factor when deciding your day.',
      actions: [`Keep an eye on ${topRisk.type} conditions today`],
    }
  }
  return {
    summary: `It's ${Math.round(ctx.temperature)}°C and ${ctx.condition.toLowerCase()} in ${ctx.city} today.`,
    recommendation: 'Conditions are generally favorable today.',
    actions: ['No significant weather concerns today'],
  }
}

const COMPOSERS: Record<Persona, (ctx: PersonaContext, topRisk: TopRisk) => ComposedBriefing> = {
  commuter,
  outdoor,
  student,
  health,
  general,
}

export function composePersonaBriefing(weather: WeatherPayload, persona: Persona, topRisk: TopRisk): ComposedBriefing {
  const ctx = buildContext(weather)
  return COMPOSERS[persona](ctx, topRisk)
}
