import type { WeatherPayload } from '../normalizers/toDashboardWeatherData.js'
import type { BriefingRequest, BriefingResponse, Persona } from './types.js'
import { detectRisks, getTopRisk } from './riskDetection.js'
import { computeBestWindow } from './bestWindow.js'
import { composePersonaBriefing } from './personaComposers.js'

const PERSONA_TITLES: Record<Persona, string> = {
  commuter: 'Commute Outlook',
  student: 'Student Day Outlook',
  outdoor: 'Outdoor Outlook',
  health: 'Health Outlook',
  general: "Today's Outlook",
}

/**
 * Deterministic, rule-based personalized briefing. Every number in the
 * response is read from the already-normalized `weather` payload — nothing
 * here invents a weather value. This is the sole source of briefing logic;
 * DeterministicBriefingGenerator is a thin wrapper around it.
 */
export function buildPersonalizedBriefing(weather: WeatherPayload, request: BriefingRequest): BriefingResponse {
  const risks = detectRisks(weather)
  const topRisk = getTopRisk(risks)
  const { summary, recommendation, actions } = composePersonaBriefing(weather, request.persona, topRisk)
  const bestWindow = computeBestWindow(weather.hourly)

  const title = topRisk
    ? `${PERSONA_TITLES[request.persona]} — ${topRisk.label}`
    : PERSONA_TITLES[request.persona]

  return {
    title,
    summary,
    recommendation,
    bestWindow,
    risks,
    actions,
    dataContext: {
      temperature: weather.current.temperature ?? 0,
      rainChance: weather.daily[0]?.rainChance ?? 0,
      uvIndex: weather.uv.index,
      aqi: weather.airQuality?.index ?? null,
    },
    generatedAt: new Date().toISOString(),
  }
}
