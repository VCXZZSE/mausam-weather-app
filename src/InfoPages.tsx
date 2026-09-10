import { useEffect, useRef } from "react"
import "./InfoPages.css"

export type InfoPageKind = "privacy" | "faq"

const privacySections = [
  { title: "The details you share", text: "Onboarding stores your name, age, height, weight, gender selection, activity level, goals, weather sensitivities and any health considerations you select. Your name personalises greetings, and gender selects a profile avatar. Other selections provide context for relevant weather guidance; not every field changes every recommendation. These are self-reported preferences, not medical records or a diagnosis." },
  { title: "Your location, your forecast", text: "If you choose device location and grant permission, Mausam uses your coordinates to find your area and fetch local weather. You can instead search for a place or PIN code. The confirmed location—including coordinates, area details and location source—is saved on this device. The app does not continuously track your movements in the background." },
  { title: "What stays on this device", text: "Your profile, confirmed location and theme preference are saved in this browser or app’s local storage so they are remembered on your next visit. This version has no remote profile database or account sync. Someone with access to the same browser profile may be able to see these details. They remain stored until you remove them or the browser or device clears its app data." },
  { title: "What is sent to services", text: "Weather requests send selected coordinates to Mausam’s backend and its weather provider, Open-Meteo. Place searches and reverse lookups send search text or coordinates to OpenStreetMap’s Nominatim service, through our backend or a direct fallback. CPCB/data.gov.in station data supplies Indian air quality. Hosting and service providers may process technical request information such as IP address, browser details and request logs under their own policies." },
  { title: "How personal guidance works", text: "The standard web deployment builds personalised guidance locally using weather and your selected preferences. When a separate personalised-briefing backend is configured, the app sends a derived persona category, sensitivity level, locality and coordinates to that backend. It does not send your name, gender, age, height, weight or the full list of health selections in that request. The current recommendation system uses rules; it does not send your profile to an AI text-generation service." },
  { title: "Tracking and storage", text: "The current app code does not include advertising trackers or analytics SDKs, and does not set advertising cookies. Local storage is used to remember your settings. Network providers handle their own operational records; clearing the app’s local data does not delete records already held by those providers." },
  { title: "Your controls", text: "Choose manual location if you prefer not to grant device-location access. You can revoke that permission in your browser or operating-system settings. Change location from the Mausam menu. Log out removes the saved profile and location from this device; your theme preference remains. To remove all locally saved settings, clear this site’s or app’s storage in your browser or device settings. Reload or close the app to discard temporary in-memory data." },
  { title: "About this policy", text: "This policy describes the current version of Mausam. We will update this page when the app’s data handling changes. Review the updated date below when revisiting it. General weather and activity guidance is informational and is not a substitute for professional medical advice or official emergency instructions." },
]

const faqGroups = [
  { title: "Weather & accuracy", items: [
    ["Where does the weather come from?", "Mausam uses Open-Meteo weather data for your selected coordinates. Indian air quality comes from a qualifying nearby CPCB station when available. Astronomy, comfort and activity suggestions are calculated from data or rules; some seasonal content is an estimate."],
    ["Why can the weather differ from what I see outside?", "A forecast represents an area and a particular update time, not a sensor outside your home. Local showers and fast-changing clouds can differ within that area. Check your selected location and the update time on the weather card. Reopening the app triggers a refresh when connected, but cannot guarantee that a provider captures every local change."],
    ["Does rainfall today mean it has already rained that much?", "Do not treat a daily forecast total as a rain-gauge measurement at your address. It can include rain predicted for later today. Rain probability and rainfall amount also mean different things: one is a chance, the other is an amount in millimetres. Unavailable monthly data means no connected value is being shown."],
    ["Why is air quality sometimes unavailable?", "A usable nearby station needs sufficiently recent and complete readings. If none qualifies, or the data service is unavailable, Mausam leaves AQI unavailable instead of inventing a value. Station air quality can differ from conditions on your street."],
  ] },
  { title: "Planning your day", items: [
    ["How is the best running time chosen?", "Mausam compares upcoming morning forecast slots using weather-based rules. Once today’s eligible slots have passed, it can suggest tomorrow if forecast data is available. Check the day label. A suggested window is guidance, not a guarantee of safe or ideal conditions."],
    ["Are the agriculture and fisheries advisories live?", "No. These official advisory feeds are not connected, so they remain unavailable. Unavailable does not mean an all-clear. Consult the relevant official service before making farming or fishing decisions."],
    ["Is my daily briefing generated by AI?", "The current briefing uses rules that combine your preferences with weather data. It does not use an AI text-generation service. Recommendations can change when the forecast or your saved preferences change."],
  ] },
  { title: "Your profile & location", items: [
    ["Can I use Mausam without device-location permission?", "Yes. Choose manual location and search for your area or PIN code. Confirm the result so Mausam uses the intended coordinates. You can change it later from the sidebar."],
    ["What does Log out remove?", "It clears the saved profile and confirmed location on this device and returns you to onboarding. The theme setting remains. It does not delete service-provider logs or data saved in another browser or device."],
    ["Will my profile appear on another phone?", "No. Profiles are currently stored locally, with no account sync. Another browser or phone needs its own setup. Clearing browser or app storage also removes your locally saved profile."],
    ["What happens if my internet stops working?", "Mausam needs a connection for fresh weather. A failed live request shows an error rather than silently replacing the forecast with demo weather. Reconnect and retry; do not assume previously displayed information is still current."],
  ] },
]

export function InfoPage({ kind, onBack, onNavigate }: { kind: InfoPageKind; onBack: () => void; onNavigate: (kind: InfoPageKind) => void }) {
  const heading = useRef<HTMLHeadingElement>(null)
  const isPrivacy = kind === "privacy"
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [kind])
  return <main className="mausam-info">
    <button className="info-back" type="button" onClick={onBack}><span aria-hidden="true">←</span> Back to weather</button>
    <header className="info-hero">
      <span className="info-emblem" aria-hidden="true">{isPrivacy ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></svg> : "?"}</span>
      <p className="info-eyebrow">{isPrivacy ? "YOUR TRUST MATTERS" : "A LITTLE MORE CLARITY"}</p>
      <h1 ref={heading} tabIndex={-1}>{isPrivacy ? "Privacy policy" : "Good questions. "}{!isPrivacy && <em>Clear answers.</em>}</h1>
      <p>{isPrivacy ? "A clear view of what you share, where it goes, and the choices you have." : "Get to know your forecast, your profile and the little details behind Mausam."}</p>
      <div className="info-chips">{(isPrivacy ? ["Stored on your device", "Location by choice"] : ["Weather explained", "Made for your everyday"]).map(text => <span key={text}>{text}</span>)}</div>
    </header>
    {isPrivacy ? <>
      <section className="info-highlight"><span aria-hidden="true">✦</span><div><h2>The short version</h2><p>Your profile stays locally saved. Your selected location is used to request weather and place information. You can clear your saved profile and location from the menu.</p></div></section>
      <div className="info-sections">{privacySections.map((section, index) => <section className="info-policy-card" key={section.title}><span className="info-section-number">{String(index + 1).padStart(2, "0")}</span><div><h2>{section.title}</h2><p>{section.text}</p></div></section>)}</div>
      <p className="info-updated">Last updated · 10 September 2026</p>
    </> : <div className="info-faq-groups">{faqGroups.map(group => <section className="info-faq-group" key={group.title}><h2>{group.title}</h2>{group.items.map(([question, answer]) => <details className="info-question" key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</section>)}</div>}
    <footer className="info-footer"><span aria-hidden="true">✦</span><h2>{isPrivacy ? "Still curious?" : "Your information, explained."}</h2><p>{isPrivacy ? "A little context makes the forecast clearer." : "See what you share and how Mausam uses it."}</p><button type="button" onClick={() => onNavigate(isPrivacy ? "faq" : "privacy")}>{isPrivacy ? "Explore FAQs" : "Read the privacy policy"}<span aria-hidden="true">↗</span></button></footer>
  </main>
}
