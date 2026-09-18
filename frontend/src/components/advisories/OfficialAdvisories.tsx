import { useEffect, useState } from "react"
import { z } from "zod"
import type { UserLocation } from "@/services/locationService"
import { formatDateTime, useTranslation, type Language } from "@/i18n"
import { Icon } from "@/components/icons/Icon"
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

// Bulletin timestamps go through the same formatter as every other reading, so
// a bulletin's month names follow the active language while its digits stay
// Latin like the rest of the chrome (see i18n/numberFormat.ts). The IST time
// zone is fixed there because these feeds are Indian.
function dateLabel(value: string, language: Language = "en") {
  return formatDateTime(value, language)
}
function officialLink(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : undefined } catch { return undefined }
}
function Bulletin({ alert }: { alert: OfficialAlert }) {
  const { t, td, language } = useTranslation()
  const expiry = dateLabel(alert.expiresAt, language)
  const issued = dateLabel(alert.issuedAt, language)
  const href = officialLink(alert.url)
  return <article className="official-bulletin">
    <div className="official-bulletin-heading"><h4>{alert.title}</h4><span className="official-severity">{td(alert.severity)}</span></div>
    <p>{alert.description}</p>
    {alert.instruction && alert.instruction !== alert.description && <p className="official-instruction">{alert.instruction}</p>}
    <div className="official-bulletin-meta">{alert.area} · {alert.source}{issued && <> · {t("advisories.issued", { time: issued })}</>}{expiry && <> · {t("advisories.validUntil", { time: expiry })}</>}</div>
    {href && <a href={href} target="_blank" rel="noopener noreferrer">{t("advisories.viewOfficial")} <Icon name="external" /></a>}
  </article>
}
function Shield() {
  return <svg aria-hidden="true" width="19" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z"/><path d="M12 8v5m0 3h.01"/></svg>
}

export function LiveOfficialAdvisories({ location, refreshKey }: { location: UserLocation; refreshKey?: number }) {
  const { t, language } = useTranslation()
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
  }, [key, location.latitude, location.longitude, location.postalCode, refreshKey])

  const general = currentCategory(data?.categories.general, now)
  const generalAvailable = general?.status === "available"
  const generalAlerts = general?.alerts ?? []
  const checked = data?.checkedAt && dateLabel(data.checkedAt, language)
  return <section className="official-advisories" aria-label={t("advisories.aria")}>
    <header className="official-advisories-header">
      <div className="official-advisories-title"><span className="official-shield"><Shield /></span><div><h2>{t("advisories.title")}</h2><p data-i18n-ignore>{location.locality}{location.postalCode ? ` · ${location.postalCode}` : ""}</p></div></div>
      <span className="official-government-label">{t("advisories.govLabel")}</span>
    </header>
    <div className="official-general" aria-live="polite" aria-busy={loading}>
      <div className="official-section-label">{t("advisories.general")}</div>
      {generalAlerts.length ? <>
        <Bulletin alert={generalAlerts[0]} />
        {generalAlerts.length > 1 && <details className="official-more"><summary>{t(generalAlerts.length === 2 ? "advisories.moreOne" : "advisories.moreMany", { count: generalAlerts.length - 1 })}</summary><div>{generalAlerts.slice(1).map(alert => <Bulletin key={alert.id} alert={alert} />)}</div></details>}
      </> : <div className="official-empty"><span className={`official-status-dot ${generalAvailable ? "is-clear" : ""}`} aria-hidden="true"/><div><h3>{loading ? t("advisories.checking") : generalAvailable ? t("advisories.noneActive") : t("advisories.unavailable")}</h3><p>{loading ? t("advisories.checkingCopy") : generalAvailable ? t("advisories.noneActiveCopy") : t("advisories.unavailableCopy")}</p></div></div>}
      {generalAlerts.length > 0 && !generalAvailable && <p className="official-partial">{t("advisories.partial")}</p>}
    </div>
    <div className="official-specialties">{(["farming", "fishing"] as const).map(category => {
      const info = currentCategory(data?.categories[category], now)
      const alerts = info?.alerts ?? []
      const title = t(category === "farming" ? "advisories.farming" : "advisories.fishing")
      const status = loading
        ? t("advisories.checkingSpecialty")
        : alerts.length
          ? t(alerts.length === 1 ? "advisories.activeOne" : "advisories.activeMany", { count: alerts.length })
          : info?.status === "available"
            ? t(category === "farming" ? "advisories.noFarming" : "advisories.noFishing")
            : t("advisories.specialtyUnavailable")
      const label = <><span className="official-specialty-icon"><Icon name={category === "farming" ? "wheat" : "fish"} /></span><span><strong>{title}</strong><span className="official-specialty-status">{status}</span></span>{alerts.length > 0 && <span className="official-expand"><Icon name="chevron-down" /></span>}</>
      return alerts.length ? <details className="official-specialty has-advisory" key={category}><summary>{label}</summary><div className="official-specialty-bulletins">{alerts.map(alert => <Bulletin key={alert.id} alert={alert} />)}{info?.status !== "available" && <p className="official-partial">{t("advisories.partialShort")}</p>}</div></details> : <div className="official-specialty" key={category}>{label}</div>
    })}</div>
    <footer className="official-advisories-footer"><span>{t("advisories.footerLeft")}</span><span>{checked ? t("advisories.checked", { time: checked }) : loading ? t("advisories.connecting") : t("advisories.awaiting")}</span></footer>
  </section>
}

// Government-feed access is paused at the user's request. Keep the future live
// component separate so the homepage cannot start requests or imply an all-clear.
export function OfficialAdvisories({ location, refreshKey }: { location: UserLocation; refreshKey?: number }) {
  const { t } = useTranslation()
  return <section className="official-advisories" aria-label={t("advisories.aria")}>
    <header className="official-advisories-header">
      <div className="official-advisories-title">
        <span className="official-shield"><Shield /></span>
        <div><h2>{t("advisories.title")}</h2><p data-i18n-ignore>{location.locality}{location.postalCode ? ` · ${location.postalCode}` : ""}</p></div>
      </div>
      <span className="official-government-label">{t("advisories.unavailableLabel")}</span>
    </header>
    <div className="official-general">
      <div className="official-section-label">{t("advisories.general")}</div>
      <div className="official-empty">
        <span className="official-status-dot" aria-hidden="true" />
        <div><h3>{t("advisories.none")}</h3></div>
      </div>
    </div>
    <div className="official-specialties">
      {(["advisories.farming", "advisories.fishing"] as const).map(key => <div className="official-specialty" key={key}>
        <span className="official-specialty-icon"><Icon name={key === "advisories.farming" ? "wheat" : "fish"} /></span>
        <span><strong>{t(key)}</strong><span className="official-specialty-status">{t("advisories.none")}</span></span>
      </div>)}
    </div>
  </section>
}
