import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import type { Profile } from "./App"
import type { UserLocation } from "./location"
import "./ProfileSidebar.css"

function Icon({ name }: { name: "close" | "pin" | "spark" | "logout" | "arrow" | "privacy" | "help" }) {
  const paths = {
    close: "m6 6 12 12M6 18 18 6",
    pin: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
    logout: "M9 4H5v16h4m5-12 4 4-4 4m-5-4h12",
    arrow: "m9 5 7 7-7 7",
    privacy: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6",
    help: "M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  }
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

function MausamLogo() {
  return <span className="app-weather-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round"><circle className="app-weather-sun" cx="29" cy="18" r="9" fill="#ffd45a" stroke="none" /><path d="M29 4v3M43 18h-3M39 8l-2 2M19 8l2 2" /><path d="M10 35h22c5 0 7-3 7-7s-3-7-7-7c-1-6-10-8-14-2-5-1-9 2-9 7-4 0-6 2-6 5s3 4 7 4Z" className="app-weather-cloud" fill="#ffffff" /></svg></span>
}

export function MausamMenuButton({ onClick, expanded }: { onClick: () => void; expanded: boolean }) {
  return <button className="mausam-menu-trigger" onClick={onClick} aria-label="Open Mausam menu" aria-haspopup="dialog" aria-expanded={expanded} aria-controls="mausam-sidebar" type="button">
    <MausamLogo />
    <span className="app-header-title">Mausam</span>
    <span className="mausam-menu-hint" aria-hidden="true"><i /><i /></span>
  </button>
}

function Avatar({ profile }: { profile: Profile }) {
  const female = profile.gender === "Female"
  const gendered = female || profile.gender === "Male"
  if (!gendered) return <div className="sidebar-avatar sidebar-avatar-initials" role="img" aria-label="Neutral profile avatar">{profile.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</div>
  return <div className="sidebar-avatar"><svg viewBox="0 0 88 88" role="img" aria-label={`${profile.gender} profile avatar`}>
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
  onFaq: () => void
}

export function ProfileSidebar({ open, profile, location, theme, onClose, onChangeLocation, onLogout, onBriefing, onPrivacy, onFaq }: Props) {
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
      <header className="sidebar-header"><div className="sidebar-wordmark"><MausamLogo />Mausam</div><button className="sidebar-close" type="button" aria-label="Close menu" onClick={onClose}><Icon name="close" /></button></header>
      <div className="sidebar-scroll">
        <section className="sidebar-identity">
          <div className="sidebar-avatar-wrap"><Avatar profile={profile} /><span className="sidebar-avatar-spark" aria-hidden="true">✦</span></div>
          <p className="sidebar-eyebrow">A LITTLE MORE YOU</p>
          <h2 id="sidebar-title">{profile.name}</h2>
          <p className="sidebar-subtitle">Your day, in your element.</p>
        </section>

        <section className="sidebar-profile-card" aria-label="Your profile">
          <div className="sidebar-section-heading"><h3>Your profile</h3><span>PERSONALISED</span></div>
          <dl className="sidebar-metrics"><div><dt>Age</dt><dd>{profile.age}<small>years</small></dd></div><div><dt>Height</dt><dd>{profile.height}<small>cm</small></dd></div><div><dt>Weight</dt><dd>{profile.weight}<small>kg</small></dd></div></dl>
          <dl className="sidebar-baseline"><div><dt>Gender</dt><dd>{profile.gender ?? "Not shared"}</dd></div><div><dt>Activity</dt><dd>{profile.activity}</dd></div></dl>
          <details className="sidebar-preferences"><summary>Your preferences <span>Goals, sensitivities & health</span><Icon name="arrow" /></summary><div className="sidebar-preference-content">{([
            ["Goals", profile.goals], ["Weather sensitivities", profile.sensitivities], ["Health considerations", profile.concerns],
          ] as const).map(([label, values]) => <div key={label}><h4>{label}</h4><div className="sidebar-tags">{values.length ? values.map(value => <span key={value}>{value}</span>) : <span>None selected</span>}</div></div>)}</div></details>
        </section>

        <p className="sidebar-eyebrow sidebar-tools-label">MAKE YOURSELF AT HOME</p>
        <nav className="sidebar-actions" aria-label="Personal settings">
          <button className="sidebar-action" type="button" onClick={onChangeLocation}><span className="sidebar-action-icon"><Icon name="pin" /></span><span><strong>Change location</strong><small>{location.locality}{location.postalCode ? ` · ${location.postalCode}` : ""}</small></span><Icon name="arrow" /></button>
          <button className="sidebar-action" type="button" onClick={onBriefing}><span className="sidebar-action-icon sidebar-icon-violet"><Icon name="spark" /></span><span><strong>Your daily briefing</strong><small>Weather, with you in mind</small></span><Icon name="arrow" /></button>
          <button className="sidebar-action" type="button" onClick={onPrivacy}><span className="sidebar-action-icon"><Icon name="privacy" /></span><span><strong>Privacy policy</strong><small>Your information, explained</small></span><Icon name="arrow" /></button>
          <button className="sidebar-action" type="button" onClick={onFaq}><span className="sidebar-action-icon sidebar-icon-violet"><Icon name="help" /></span><span><strong>FAQs & help</strong><small>A little more clarity</small></span><Icon name="arrow" /></button>
        </nav>
      </div>
      <footer className="sidebar-footer"><button type="button" className="sidebar-logout" onClick={onLogout}><Icon name="logout" /><span>Log out</span><Icon name="arrow" /></button><p>Clears your profile & location from this device.</p><div className="sidebar-signoff"><span aria-hidden="true">✦</span> A little clarity, whatever the weather.</div></footer>
    </div>
  </dialog>, document.body)
}
