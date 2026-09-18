import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { Profile } from "@/App"
import { getPersonaById } from "@/App"
import type { UserLocation } from "@/services/locationService"
import { useTranslation } from "@/i18n"
import { LanguageSelector } from "@/components/language/LanguageSelector"
import { Icon } from "@/components/icons/Icon"
import "./ProfileSidebar.css"

function MausamLogo() {
  return <span className="app-weather-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round"><circle className="app-weather-sun" cx="29" cy="18" r="9" fill="#ffd45a" stroke="none" /><path d="M29 4v3M43 18h-3M39 8l-2 2M19 8l2 2" /><path d="M10 35h22c5 0 7-3 7-7s-3-7-7-7c-1-6-10-8-14-2-5-1-9 2-9 7-4 0-6 2-6 5s3 4 7 4Z" className="app-weather-cloud" fill="#ffffff" /></svg></span>
}

export function MausamMenuButton({ onClick, expanded }: { onClick: () => void; expanded: boolean }) {
  const { t } = useTranslation()
  return <button className="mausam-menu-trigger" onClick={onClick} aria-label={t("sidebar.open")} aria-haspopup="dialog" aria-expanded={expanded} aria-controls="mausam-sidebar" type="button">
    <MausamLogo />
    <span className="app-header-title">{t("app.name")}</span>
    <span className="mausam-menu-hint" aria-hidden="true"><i /><i /></span>
  </button>
}

function Avatar({ profile }: { profile: Profile }) {
  const { t, td } = useTranslation()
  const female = profile.gender === "Female"
  const gendered = female || profile.gender === "Male"
  if (!gendered) return <div className="sidebar-avatar sidebar-avatar-initials" role="img" aria-label={t("sidebar.avatarNeutral")} data-i18n-ignore>{profile.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</div>
  return <div className="sidebar-avatar"><svg viewBox="0 0 88 88" role="img" aria-label={t("sidebar.avatarGendered", { gender: td(profile.gender ?? "") })}>
    <circle cx="44" cy="44" r="44" fill={female ? "#e0dcff" : "#d6ecff"} />
    {female && <path d="M22 60V35c0-30 44-30 44 0v29Z" fill="#34324e" />}
    <path d="M12 88c1-23 12-29 32-29s31 6 32 29" fill={female ? "#8071c7" : "#4b80b3"} />
    <path d="M37 52h14v13c-4 5-10 5-14 0Z" fill="#dca582" />
    <ellipse cx="44" cy="38" rx="17" ry="22" fill="#f2c6a5" />
    <path d={female ? "M26 38c-3-29 37-34 36 0-12-2-21-12-23-17-1 9-7 14-13 17Z" : "M26 37c-7-22 9-30 20-25 15-4 21 14 15 27l-4-13c-8 3-17 3-25-1Z"} fill="#34324e" />
    <path d="M35 39h1m16 0h1" stroke="#34324e" strokeWidth="3" strokeLinecap="round" />
    <path d="M40 49q4 4 8 0" stroke="#a26558" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="m27 65 17 11 17-11" stroke="white" strokeOpacity=".5" strokeWidth="2" fill="none" />
  </svg></div>
}

type Props = {
  open: boolean
  profile: Profile
  location: UserLocation
  theme: "light" | "dark"
  onClose: () => void
  onChangeLocation: () => void
  onLogout: () => void
  onBriefing: () => void
  onPrivacy: () => void
  onFAQ: () => void
}

export function ProfileSidebar({ open, profile, location, theme, onClose, onChangeLocation, onLogout, onBriefing, onPrivacy, onFAQ }: Props) {
  const { t, td } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    if (!open || !element) return
    const trigger = document.activeElement as HTMLElement | null
    element.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      element.close()
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus()
    }
  }, [open])

  return createPortal(<dialog ref={dialog} id="mausam-sidebar" className={`profile-sidebar sidebar-${theme}`} aria-labelledby="sidebar-title" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="sidebar-surface">
      <header className="sidebar-header"><div className="sidebar-wordmark"><MausamLogo />{t("app.name")}</div><button className="sidebar-close" type="button" aria-label={t("sidebar.close")} onClick={onClose}><Icon name="close" /></button></header>
      <div className="sidebar-scroll">
        <section className="sidebar-identity">
          <div className="sidebar-avatar-wrap"><Avatar profile={profile} /><span className="sidebar-avatar-spark" aria-hidden="true">✦</span></div>
          <p className="sidebar-eyebrow">{t("sidebar.eyebrow")}</p>
          <h2 id="sidebar-title" data-i18n-ignore>{profile.name}</h2>
          <p className="sidebar-subtitle">{t("sidebar.subtitle")}</p>
          {profile.persona && (() => {
            const persona = getPersonaById(profile.persona)
            return persona ? (
              <div className="sidebar-persona-chip">
                <span className="sidebar-persona-icon"><Icon name={persona.icon} /></span>
                <span className="sidebar-persona-label">{td(persona.title)}</span>
              </div>
            ) : null
          })()}
        </section>

        <section className="sidebar-profile-card" aria-label={t("sidebar.profileAria")}>
          <div className="sidebar-section-heading"><h3>{t("sidebar.yourProfile")}</h3><span>{t("sidebar.personalised")}</span></div>
          {profile.persona && (() => {
            const persona = getPersonaById(profile.persona)
            return persona ? (
              <div className="sidebar-active-persona-banner" style={{ "--persona-accent": persona.accentColor } as React.CSSProperties}>
                <span className="sidebar-active-persona-icon"><Icon name={persona.icon} /></span>
                <div className="sidebar-active-persona-info">
                  <strong>{td(persona.title)}</strong>
                  <small>{td(persona.tagline)}</small>
                </div>
              </div>
            ) : null
          })()}
          <dl className="sidebar-baseline">
            <div><dt>{t("sidebar.age")}</dt><dd><span>{profile.age}</span> <small>{t("sidebar.years")}</small></dd></div>
            <div><dt>{t("sidebar.gender")}</dt><dd>{profile.gender ? td(profile.gender) : t("sidebar.notShared")}</dd></div>
            <div><dt>{t("sidebar.activity")}</dt><dd>{td(profile.activity)}</dd></div>
          </dl>
          <details className="sidebar-preferences"><summary>{t("sidebar.preferences")} <span>{t("sidebar.preferencesHint")}</span><Icon name="arrow" /></summary><div className="sidebar-preference-content">{([
            ["sidebar.goals", profile.goals], ["sidebar.sensitivities", profile.sensitivities], ["sidebar.concerns", profile.concerns],
          ] as const).map(([labelKey, values]) => <div key={labelKey}><h4>{t(labelKey)}</h4><div className="sidebar-tags">{values.length ? values.map(value => <span key={value}>{td(value)}</span>) : <span>{t("sidebar.noneSelected")}</span>}</div></div>)}</div></details>
        </section>

        <p className="sidebar-eyebrow sidebar-tools-label">{t("sidebar.toolsLabel")}</p>
        <div className="sidebar-language-row">
          <div className="sidebar-language-copy"><strong>{t("sidebar.language")}</strong><small>{t("sidebar.languageHint")}</small></div>
          <LanguageSelector size="full" />
        </div>
        <nav className="sidebar-actions" aria-label={t("sidebar.settingsAria")}>
          <button className="sidebar-action" type="button" onClick={onChangeLocation}><span className="sidebar-action-icon"><Icon name="pin" /></span><span><strong>{t("sidebar.changeLocation")}</strong><small data-i18n-ignore>{location.locality}{location.postalCode ? ` · ${location.postalCode}` : ""}</small></span><Icon name="arrow" /></button>
          <button className="sidebar-action" type="button" onClick={onBriefing}><span className="sidebar-action-icon sidebar-icon-violet"><Icon name="spark" /></span><span><strong>{t("sidebar.briefing")}</strong><small>{t("sidebar.briefingHint")}</small></span><Icon name="arrow" /></button>
          <button className="sidebar-action" type="button" onClick={onPrivacy}><span className="sidebar-action-icon sidebar-icon-teal"><Icon name="shield-lock" /></span><span><strong>{t("sidebar.privacy")}</strong><small>{t("sidebar.privacyHint")}</small></span><Icon name="arrow" /></button>
          <button className="sidebar-action" type="button" onClick={onFAQ}><span className="sidebar-action-icon sidebar-icon-teal"><Icon name="help" /></span><span><strong>{t("sidebar.faq")}</strong><small>{t("sidebar.faqHint")}</small></span><Icon name="arrow" /></button>
        </nav>
      </div>
      <footer className="sidebar-footer"><button type="button" className="sidebar-logout" onClick={onLogout}><Icon name="logout" /><span>{t("sidebar.logout")}</span><Icon name="arrow" /></button><p>{t("sidebar.logoutNote")}</p><div className="sidebar-signoff"><span aria-hidden="true">✦</span> {t("sidebar.signoff")}</div></footer>
    </div>
  </dialog>, document.body)
}
