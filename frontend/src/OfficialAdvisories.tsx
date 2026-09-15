import { useEffect, useState } from "react"
import { z } from "zod"
import type { UserLocation } from "./location"
import "./OfficialAdvisories.css"

const alertSchema = z.object({
  id: z.string(), title: z.string(), description: z.string(), instruction: z.string().optional(),
  area: z.string(), source: z.string(), url: z.string(), issuedAt: z.string(),
  expiresAt: z.string(), severity: z.string(),
})
const categorySchema = z.object({ status: z.enum(["available", "unavailable"]), alerts: z.array(alertSchema) })
const responseSchema = z.object({ checkedAt: z.string().nullable(), categories: z.object({
  general: categorySchema, farming: categorySchema, fishing: categorySchema,
}) })
type OfficialAlert = z.infer<typeof alertSchema>
type AdvisoryResponse = z.infer<typeof responseSchema>
const severityOrder: Record<string, number> = { extreme: 0, severe: 1, moderate: 2, minor: 3, unknown: 4 }
function currentCategory(category: z.infer<typeof categorySchema> | undefined, now: number) {
  if (!category) return undefined
  const alerts = category.alerts.filter(alert => new Date(alert.expiresAt).getTime() > now)
    .sort((a, b) => (severityOrder[a.severity.toLowerCase()] ?? 4) - (severityOrder[b.severity.toLowerCase()] ?? 4))
  // An expired bulletin is not evidence that the government has lifted a warning.
  return { alerts, status: alerts.length < category.alerts.length ? "unavailable" : category.status }
}

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })
}
function officialLink(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : undefined } catch { return undefined }
}
function Bulletin({ alert }: { alert: OfficialAlert }) {
  const expiry = dateLabel(alert.expiresAt)
  const issued = dateLabel(alert.issuedAt)
  const href = officialLink(alert.url)
  return <article className="official-bulletin">
    <div className="official-bulletin-heading"><h4>{alert.title}</h4><span className="official-severity">{alert.severity}</span></div>
    <p>{alert.description}</p>
    {alert.instruction && alert.instruction !== alert.description && <p className="official-instruction">{alert.instruction}</p>}
    <div className="official-bulletin-meta">{alert.area} · {alert.source}{issued && <> · Issued {issued} IST</>}{expiry && <> · Valid until {expiry} IST</>}</div>
    {href && <a href={href} target="_blank" rel="noopener noreferrer">View official bulletin <span aria-hidden="true">↗</span></a>}
  </article>
}
function Shield() {
  return <svg aria-hidden="true" width="19" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="M12 8v5m0 3h.01"/></svg>
}

export function LiveOfficialAdvisories({ location }: { location: UserLocation }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  const key = `${location.latitude},${location.longitude},${location.postalCode ?? ""}`
  const [result, setResult] = useState<{ key: string; data: AdvisoryResponse | null; failed: boolean } | null>(null)
  const current = result?.key === key ? result : null
  const data = current?.data
  const loading = !current
  useEffect(() => {
    let disposed = false
    let controller: AbortController | undefined
    const refresh = async () => {
      controller?.abort()
      const request = new AbortController()
      controller = request
      const timeout = window.setTimeout(() => request.abort(), 20_000)
      try {
        const explicit = import.meta.env.VITE_ADVISORIES_API_URL?.trim()
        const weather = import.meta.env.VITE_WEATHER_API_URL?.trim()
        const url = explicit ? new URL(explicit, window.location.origin) : new URL("/api/advisories", weather ? new URL(weather, window.location.origin) : window.location.origin)
        url.searchParams.set("latitude", String(location.latitude))
        url.searchParams.set("longitude", String(location.longitude))
        if (location.postalCode) url.searchParams.set("postalCode", location.postalCode)
        const response = await fetch(url, { signal: request.signal })
        if (!response.ok) throw new Error("Advisories unavailable")
        const next = responseSchema.parse(await response.json())
        if (!disposed && controller === request) { setNow(Date.now()); setResult({ key, data: next, failed: false }) }
      } catch {
        if (!disposed && controller === request) setResult({ key, data: null, failed: true })
      } finally { window.clearTimeout(timeout) }
    }
    void refresh()
    const interval = window.setInterval(refresh, 300_000)
    return () => { disposed = true; controller?.abort(); window.clearInterval(interval) }
  }, [key, location.latitude, location.longitude, location.postalCode])

  const general = currentCategory(data?.categories.general, now)
  const generalAvailable = general?.status === "available"
  const generalAlerts = general?.alerts ?? []
  const checked = data?.checkedAt && dateLabel(data.checkedAt)
  return <section className="official-advisories" aria-label="Official alerts and advisories">
    <header className="official-advisories-header">
      <div className="official-advisories-title"><span className="official-shield"><Shield /></span><div><h2>Official alerts & advisories</h2><p>{location.locality}{location.postalCode ? ` · ${location.postalCode}` : ""}</p></div></div>
      <span className="official-government-label">GOV SOURCES</span>
    </header>
    <div className="official-general" aria-live="polite" aria-busy={loading}>
      <div className="official-section-label">General alerts</div>
      {generalAlerts.length ? <>
        <Bulletin alert={generalAlerts[0]} />
        {generalAlerts.length > 1 && <details className="official-more"><summary>{generalAlerts.length - 1} more {generalAlerts.length === 2 ? "alert" : "alerts"} for your area</summary><div>{generalAlerts.slice(1).map(alert => <Bulletin key={alert.id} alert={alert} />)}</div></details>}
      </> : <div className="official-empty"><span className={`official-status-dot ${generalAvailable ? "is-clear" : ""}`} aria-hidden="true"/><div><h3>{loading ? "Checking official alerts…" : generalAvailable ? "No active general alerts" : "Official updates unavailable"}</h3><p>{loading ? "Looking for government advisories for your area." : generalAvailable ? "No active warning reported for this area." : "We couldn’t verify current warnings. Please check again shortly."}</p></div></div>}
      {generalAlerts.length > 0 && !generalAvailable && <p className="official-partial">Some official sources are unavailable. Coverage may be incomplete.</p>}
    </div>
    <div className="official-specialties">{(["farming", "fishing"] as const).map(category => {
      const info = currentCategory(data?.categories[category], now)
      const alerts = info?.alerts ?? []
      const title = category === "farming" ? "Farming" : "Fishing"
      const status = loading ? "Checking advisories…" : alerts.length ? `${alerts.length} active ${alerts.length === 1 ? "advisory" : "advisories"}` : info?.status === "available" ? `No ${category} advisory today` : "Updates unavailable"
      const label = <><span aria-hidden="true" className="official-specialty-icon">{category === "farming" ? "🌾" : "🐟"}</span><span><strong>{title}</strong><span className="official-specialty-status">{status}</span></span>{alerts.length > 0 && <span aria-hidden="true" className="official-expand">⌄</span>}</>
      return alerts.length ? <details className="official-specialty has-advisory" key={category}><summary>{label}</summary><div className="official-specialty-bulletins">{alerts.map(alert => <Bulletin key={alert.id} alert={alert} />)}{info?.status !== "available" && <p className="official-partial">Some official sources are unavailable.</p>}</div></details> : <div className="official-specialty" key={category}>{label}</div>
    })}</div>
    <footer className="official-advisories-footer"><span>Government-issued · Area-specific</span><span>{checked ? `Checked ${checked} IST` : loading ? "Connecting to sources" : "Awaiting verified updates"}</span></footer>
  </section>
}

// Government-feed access is paused at the user's request. Keep the future live
// component separate so the homepage cannot start requests or imply an all-clear.
export function OfficialAdvisories({ location }: { location: UserLocation }) {
  return <section className="official-advisories" aria-label="Official alerts and advisories">
    <header className="official-advisories-header">
      <div className="official-advisories-title">
        <span className="official-shield"><Shield /></span>
        <div><h2>Official alerts & advisories</h2><p>{location.locality}{location.postalCode ? ` · ${location.postalCode}` : ""}</p></div>
      </div>
      <span className="official-government-label">UNAVAILABLE</span>
    </header>
    <div className="official-general">
      <div className="official-section-label">General alerts</div>
      <div className="official-empty">
        <span className="official-status-dot" aria-hidden="true" />
        <div><h3>No advisories available now</h3></div>
      </div>
    </div>
    <div className="official-specialties">
      {(["Farming", "Fishing"] as const).map(title => <div className="official-specialty" key={title}>
        <span aria-hidden="true" className="official-specialty-icon">{title === "Farming" ? "♧" : "≋"}</span>
        <span><strong>{title}</strong><span className="official-specialty-status">No advisories available now</span></span>
      </div>)}
    </div>
  </section>
}
