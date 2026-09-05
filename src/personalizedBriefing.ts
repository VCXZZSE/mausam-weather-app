import type { Profile, PersonalizedFactor, PersonalizedIcon, PersonalizedRecommendation, PersonalizedTile, PersonalizedTone, PersonalizedWeather } from './App'

export type Persona = 'commuter' | 'student' | 'outdoor' | 'health' | 'general'
export type Sensitivity = 'low' | 'normal' | 'high'

export type BriefingRequest = {
  persona: Persona
  activity?: string
  sensitivity?: Sensitivity
  location?: string
}

export type BriefingRisk = {
  type: string
  severity: 'moderate' | 'high' | 'severe'
  message: string
}

export type BriefingResponse = {
  title: string
  summary: string
  recommendation: string
  bestWindow: { start: string; end: string; reason: string }
  risks: BriefingRisk[]
  actions: string[]
  dataContext: { temperature: number; rainChance: number; uvIndex: number; aqi: number | null }
  generatedAt: string
}

/**
 * Backend has no age/height/weight and only supports one configured city
 * today, so this is a coarse best-effort mapping from the existing
 * onboarding profile to the backend's 5-persona model — not a precise
 * translation. "student" has no equivalent source field and is never
 * produced here.
 */
export function mapProfileToPersona(profile: Profile): Persona {
  const activeConcerns = profile.concerns.filter(item => item !== 'None of these')
  if (activeConcerns.length > 0) return 'health'
  if (profile.goals.includes('Travel')) return 'commuter'
  if (profile.goals.includes('Outdoor plans') || profile.goals.includes('Fitness')) return 'outdoor'
  return 'general'
}

export function mapProfileToSensitivity(profile: Profile): Sensitivity {
  if (profile.sensitivities.length >= 3) return 'high'
  if (profile.sensitivities.length >= 1) return 'normal'
  return 'low'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isValidBriefingResponse(value: unknown): value is BriefingResponse {
  if (!isRecord(value)) return false
  const bestWindow = value.bestWindow
  const dataContext = value.dataContext
  return (
    typeof value.title === 'string'
    && typeof value.summary === 'string'
    && typeof value.recommendation === 'string'
    && isRecord(bestWindow) && typeof bestWindow.start === 'string' && typeof bestWindow.end === 'string' && typeof bestWindow.reason === 'string'
    && Array.isArray(value.risks)
    && Array.isArray(value.actions)
    && isRecord(dataContext) && typeof dataContext.temperature === 'number' && typeof dataContext.rainChance === 'number' && typeof dataContext.uvIndex === 'number'
    && typeof value.generatedAt === 'string'
  )
}

// Session-lifetime cache only (cleared on full page reload) — matches the
// "short client-side cache is sufficient" guidance; no Redis/persistence.
const briefingCache = new Map<string, BriefingResponse>()

/**
 * Calls the backend's deterministic personalized-briefing endpoint.
 * Throws on any failure (unconfigured endpoint, network error, invalid
 * response) — callers should catch and fall back to the existing local
 * getPersonalizedWeather() logic, exactly as fetchWeatherDashboard's
 * callers already do for the main weather feed.
 */
export async function fetchPersonalizedBriefing(request: BriefingRequest, signal?: AbortSignal): Promise<BriefingResponse> {
  const endpoint = import.meta.env.VITE_PERSONALIZED_BRIEFING_API_URL?.trim()
  if (!endpoint) throw new Error('Personalized briefing endpoint is not configured')

  const cacheKey = JSON.stringify(request)
  const cached = briefingCache.get(cacheKey)
  if (cached) return cached

  const response = await fetch(endpoint, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error(`Personalized briefing request failed with status ${response.status}`)

  const responseBody: unknown = await response.json()
  const payload = isRecord(responseBody) && 'data' in responseBody ? responseBody.data : responseBody

  if (!isValidBriefingResponse(payload)) {
    throw new Error('Personalized briefing response does not match the expected contract')
  }

  briefingCache.set(cacheKey, payload)
  return payload
}

const RISK_ICONS: Record<string, PersonalizedIcon> = {
  thunderstorm: 'rain',
  heat: 'temperature',
  rain: 'rain',
  uv: 'sun',
  aqi: 'air',
  wind: 'wind',
}

function toneForSeverity(severity: BriefingRisk['severity']): PersonalizedTone {
  if (severity === 'severe') return 'rose'
  if (severity === 'high') return 'amber'
  return 'blue'
}

function capitalize(value: string): string {
  return value.length ? value[0].toUpperCase() + value.slice(1) : value
}

function buildTiles(briefing: BriefingResponse): PersonalizedTile[] {
  const riskTiles: PersonalizedTile[] = briefing.risks.slice(0, 4).map(risk => ({
    icon: RISK_ICONS[risk.type] ?? 'comfort',
    title: capitalize(risk.type),
    value: capitalize(risk.severity),
    detail: risk.message,
    tone: toneForSeverity(risk.severity),
  }))

  if (riskTiles.length >= 4) return riskTiles

  const infoTiles: PersonalizedTile[] = [
    { icon: 'temperature', title: 'Temperature', value: `${briefing.dataContext.temperature}°C`, detail: 'Current reading', tone: 'amber' },
    { icon: 'sun', title: 'UV', value: `${briefing.dataContext.uvIndex}`, detail: 'Current UV index', tone: 'violet' },
    { icon: 'rain', title: 'Rain', value: `${briefing.dataContext.rainChance}%`, detail: 'Chance today', tone: 'blue' },
    ...(briefing.dataContext.aqi !== null
      ? [{ icon: 'air' as const, title: 'Air quality', value: `US AQI ${briefing.dataContext.aqi}`, detail: 'Current reading', tone: 'green' as const }]
      : []),
  ]

  return [...riskTiles, ...infoTiles].slice(0, 4)
}

const ACTION_ICONS: PersonalizedIcon[] = ['outdoor', 'shield', 'comfort', 'indoor']

function buildRecommendations(briefing: BriefingResponse): PersonalizedRecommendation[] {
  return briefing.actions.slice(0, 4).map((action, index) => ({
    icon: ACTION_ICONS[index % ACTION_ICONS.length],
    title: action,
    reason: briefing.recommendation,
  }))
}

function buildFactors(briefing: BriefingResponse): PersonalizedFactor[] {
  const factors: PersonalizedFactor[] = [
    { label: 'Temperature', value: `${briefing.dataContext.temperature}°C` },
    { label: 'Rain chance', value: `${briefing.dataContext.rainChance}%` },
    { label: 'UV', value: `${briefing.dataContext.uvIndex}` },
  ]
  if (briefing.dataContext.aqi !== null) factors.push({ label: 'US AQI', value: `${briefing.dataContext.aqi}` })
  return factors
}

/**
 * Adapts the backend's BriefingResponse into the existing local
 * PersonalizedWeather shape so PersonalizedWeatherPage can render it with
 * zero UI changes. `variant` and `disclaimer` are carried over from the
 * local fallback purely for visual theming continuity.
 */
export function adaptBriefingToPersonalizedWeather(briefing: BriefingResponse, fallback: PersonalizedWeather): PersonalizedWeather {
  const hasWindow = Boolean(briefing.bestWindow.start && briefing.bestWindow.end)

  return {
    variant: fallback.variant,
    headline: briefing.title,
    overview: `${briefing.summary} ${briefing.recommendation}`.trim(),
    windowLabel: hasWindow ? 'Best outdoor window' : 'Outdoor outlook',
    window: hasWindow ? `${briefing.bestWindow.start}–${briefing.bestWindow.end}` : briefing.bestWindow.reason,
    basis: 'Backend personalized briefing',
    tiles: buildTiles(briefing),
    recommendations: buildRecommendations(briefing),
    factors: buildFactors(briefing),
    disclaimer: fallback.disclaimer,
  }
}
