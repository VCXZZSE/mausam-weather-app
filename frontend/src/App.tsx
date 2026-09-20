import { MausamMenuButton, ProfileSidebar } from "@/components/layout/ProfileSidebar"
import { OfficialAdvisories } from "@/components/advisories/OfficialAdvisories"
import { ComfortIndicator, comfortTone } from "@/components/common/ComfortIndicator"
import { syncWeatherToWidget } from "@/widgets/widgetBridge"
import { PullToRefresh } from "@/components/common/PullToRefresh"
import { SlideToDiveIn } from "@/components/common/SlideToDiveIn"
import { TravelTilesGrid } from "@/components/travel/TravelTilesGrid"
import { OfflineScreen } from "@/components/offline/OfflineScreen"
import { Icon } from "@/components/icons/Icon"
import {
  aqiBandForIndex,
  resolveIconName,
  type IconName,
} from "@/components/icons/iconMap"
import type { PersonalizedIcon } from "@/components/icons/iconMap"
import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react"
import {
  DEMO_WEATHER_DATA,
  fetchWeatherDashboard,
  getRainCharacter,
  getWeatherHeroVariant,
  isLiveWeatherEnabled,
  isCurrentWeatherFresh,
  resolveWeatherIcon,
  type DashboardWeatherData,
} from "@/services/weatherData"
import {
  adaptBriefingToPersonalizedWeather,
  fetchPersonalizedBriefing,
  mapProfileToPersona,
  mapProfileToSensitivity,
} from "@/services/personalizedBriefing"
import {
  clearStoredLocation,
  defaultDemoLocation,
  enrichDeviceLocation,
  formatUserLocation,
  fromSearchResult,
  GeolocationError,
  loadStoredLocation,
  resolveDeviceCoordinates,
  saveLocation,
  searchLocations,
  type LocationSearchResult,
  type UserLocation,
} from "@/services/locationService"
import { getTimeGreeting } from "@/utils/timeGreeting"
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  isTightUnit,
  LanguageProvider,
  translate,
  useTranslation,
  type TranslationKey,
  type Translator,
} from "./i18n"
import { I18nDebugOverlay } from "./i18n/I18nDebugOverlay"
import { LanguageSelector } from "@/components/language/LanguageSelector"
import { PrivacyPolicyPage } from "@/pages/PrivacyPolicy"
import { FAQPage } from "@/pages/FAQPage"
import { SettingsPage } from "@/pages/SettingsPage"
import {
  useSettings,
  convertTemperature,
  convertRain,
  formatClockTimeStr,
} from "@/services/settingsStore"

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "home" | "health" | "forecast" | "alerts"
// Full-screen views that take over the tab area. A single value keeps them
// mutually exclusive, and "back" from a document returns to the briefing it
// was opened from.
type Overlay = "none" | "briefing" | "privacy" | "faq" | "settings"

// ── Shared UI ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="section-label"
      style={{
        fontSize: 10,
        fontWeight: 800,
        color: "rgba(255,255,255,0.3)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  )
}

function Card({
  grad,
  border,
  children,
  span2,
  pad = 16,
  className,
}: {
  grad: string
  border?: string
  children: ReactNode
  span2?: boolean
  pad?: number
  className?: string
}) {
  return (
    <div
      className={`futuristic-card interactive-tile${
        className ? ` ${className}` : ""
      }`}
      style={{
        background: grad,
        border: `1px solid ${border ?? "rgba(255,255,255,0.05)"}`,
        borderRadius: 20,
        padding: pad,
        overflow: "hidden",
        position: "relative",
        gridColumn: span2 ? "1 / -1" : undefined,
      }}
    >
      {children}
    </div>
  )
}

function CardLabel({ children }: { children: ReactNode }) {
  return (
    <div
      className="card-label"
      style={{
        fontSize: 9,
        fontWeight: 800,
        color: "rgba(255,255,255,0.3)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  )
}

function Badge({
  children,
  color,
  bg,
  className,
}: {
  children: ReactNode
  color: string
  bg: string
  className?: string
}) {
  return (
    <span
      className={`badge metric-tile-badge${className ? ` ${className}` : ""}`}
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        background: bg,
        border: `1px solid ${color}44`,
        borderRadius: 20,
        padding: "3px 8px",
        fontSize: 8,
        fontWeight: 900,
        color,
        letterSpacing: "0.07em",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {children}
    </span>
  )
}

function Bar({
  pct,
  fill,
  height = 4,
}: {
  pct: number
  fill: string
  height?: number
}) {
  return (
    <div
      style={{
        height,
        background: "rgba(255,255,255,0.08)",
        borderRadius: height / 2,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, pct))}%`,
          height: "100%",
          background: fill,
          borderRadius: height / 2,
        }}
      />
    </div>
  )
}

// The scale itself is defined once in index.css as --aqi-* custom properties,
// so the meter and the band icons cannot drift apart.
const INDIA_NAQI_GRADIENT = "var(--aqi-gradient)"

/**
 * Renders an icon named by the API payload. Unlike a literal <Icon name="..." />
 * the value is not known at build time: a cached response or an older backend
 * may still carry an emoji, which resolveIconName maps to its replacement.
 * Anything it cannot place renders nothing rather than a broken glyph.
 */
function IconByName({ name, label }: { name: string; label?: string }) {
  const resolved = resolveIconName(name)
  if (!resolved) return null
  return <Icon name={resolved} label={label} />
}

/**
 * A line of advice with the icon that leads it. The icon used to be an emoji
 * glued to the front of the sentence, which meant every hi/bn translation had
 * to carry its own copy and the i18n layer had to strip it back off before it
 * could match a key. `tone` is optional, so a payload from before the change
 * still renders — just without the mark.
 */
const ADVICE_EMOJIS: Array<[string, IconName]> = [
  ["☂️", "umbrella"],
  ["☂", "umbrella"],
  ["😎", "sunglasses"],
  ["🕶️", "sunglasses"],
  ["🕶", "sunglasses"],
  ["🧴", "sunscreen"],
  ["🌿", "pollen"],
  ["🌱", "sprout"],
  ["🌾", "wheat"],
  ["💧", "hydration"],
  ["😷", "mask"],
  ["🤧", "pollen"],
  ["💡", "tip"],
  ["⚠️", "warning"],
  ["⚠", "warning"],
  ["🚨", "alert"],
  ["✅", "success"],
  ["🚫", "blocked"],
  ["⚡️", "bolt"],
  ["⚡", "bolt"],
  ["🐟", "fish"],
]

function parseAdviceSegment(
  segment: string,
  fallbackTone?: string,
): { icon: IconName | null; text: string } {
  let cleaned = segment.trim()
  let matchedIcon: IconName | null = null

  for (const [emoji, iconName] of ADVICE_EMOJIS) {
    if (cleaned.includes(emoji)) {
      matchedIcon = matchedIcon ?? iconName
      cleaned = cleaned.split(emoji).join("").trim()
    }
  }

  if (!matchedIcon) {
    if (/umbrella|छाता|ছাতা/i.test(cleaned)) matchedIcon = "umbrella"
    else if (/sunglasses|चश्मा|রোদচশমা/i.test(cleaned)) matchedIcon = "sunglasses"
    else if (/spf|sunscreen|सनस्क्रीन/i.test(cleaned)) matchedIcon = "sunscreen"
    else if (/drink|water|hydrat|पानी|जल|ors/i.test(cleaned)) matchedIcon = "hydration"
    else if (/pollen|allergy|antihistamine|पराग/i.test(cleaned)) matchedIcon = "pollen"
    else if (/exertion|strenuous|heat|मेहनत|गर्मी|পরিশ্রম|গরম/i.test(cleaned)) matchedIcon = "hot"
    else if (/mask|मास्क/i.test(cleaned)) matchedIcon = "mask"
    else if (/window|खिड़की|জানালা/i.test(cleaned)) matchedIcon = "home"
    else if (fallbackTone) matchedIcon = resolveIconName(fallbackTone)
  }

  return { icon: matchedIcon, text: cleaned }
}

function AdviceLine({ text, tone }: { text: string; tone?: string }) {
  if (!text) return null
  const segments = text.split(/\s*·\s*/).filter(Boolean)

  if (segments.length <= 1) {
    const item = parseAdviceSegment(text, tone)
    return (
      <span className="advice-line-single">
        {item.icon && <Icon name={item.icon} className="advice-tone" />}
        <span>{item.text}</span>
      </span>
    )
  }

  const items = segments.map((seg, i) =>
    parseAdviceSegment(seg, i === 0 ? tone : undefined),
  )

  return (
    <span className="advice-items-wrap">
      {items.map((item, idx) => (
        <span key={idx} className="advice-chip">
          {item.icon && <Icon name={item.icon} className="advice-tone" />}
          <span>{item.text}</span>
        </span>
      ))}
    </span>
  )
}

function WeatherIcon({
  conditionCode,
  icon,
  label,
  isDay,
}: {
  conditionCode: string
  icon?: string
  label: string
  isDay?: boolean
}) {
  // A payload may still carry a URL in `icon` (a provider-supplied image), and
  // that wins, as it always did.
  if (icon && /^(https?:\/\/|\/)/.test(icon)) {
    return (
      <img
        src={icon}
        alt={label}
        loading="lazy"
        decoding="async"
        style={{ width: "1.35em", height: "1.35em", objectFit: "contain" }}
      />
    )
  }
  return (
    <Icon name={resolveWeatherIcon(conditionCode, icon, isDay)} label={label} />
  )
}

function dailyTemperaturePercent(
  day: DashboardWeatherData["daily"][number],
  days: DashboardWeatherData["daily"],
): number {
  if (!days.length) return 0
  const minimum = Math.min(...days.map((item) => item.low))
  const maximum = Math.max(...days.map((item) => item.high))
  return maximum === minimum
    ? 50
    : ((day.high - minimum) / (maximum - minimum)) * 100
}

// ── Nav Icons ──────────────────────────────────────────────────────────────────

function NavIcon({ id, active }: { id: Tab; active: boolean }) {
  const c = active ? "#fff" : "#4a4a5a"
  const sw = 1.8
  if (id === "home")
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    )
  if (id === "health")
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={active ? c : "none"}
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="9" fill="none" />
        <path d="m7.5 12 3 3 6-6" fill="none" />
      </svg>
    )
  if (id === "forecast")
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    )
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="8.5" fill="none" />
      <path d="M8 16 16 8M10 8h6v6" fill="none" />
    </svg>
  )
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────────

const NAV_TABS: { id: Tab; labelKey: TranslationKey }[] = [
  { id: "home", labelKey: "nav.home" },
  { id: "health", labelKey: "nav.health" },
  { id: "forecast", labelKey: "nav.forecast" },
  { id: "alerts", labelKey: "nav.alerts" },
]

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const { t } = useTranslation()
  return (
    <nav
      style={{
        background: "rgba(7,8,14,0.98)",
        backdropFilter: "blur(28px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexShrink: 0,
        paddingBottom: 8,
      }}
    >
      {NAV_TABS.map((item) => {
        const active = tab === item.id
        return (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`mausam-nav-button${active ? " active" : ""}`}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              padding: "11px 0 7px",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
            aria-label={t(item.labelKey)}
          >
            <NavIcon id={item.id} active={active} />
          </button>
        )
      })}
    </nav>
  )
}

function AudienceFocus({ items }: { items: DashboardWeatherData["overview"] }) {
  const { t, td } = useTranslation()
  return (
    <div className="audience-focus">
      <div className="audience-focus-heading">{t("audience.heading")}</div>
      <div className="audience-focus-grid">
        {items.map((item) => {
          let val = item.value
          if (item.label === "Move") {
            if (
              val === "Best window most of the day" ||
              val.toLowerCase().includes("most of the day")
            ) {
              val = "Good all day"
            } else if (val.startsWith("Best window ")) {
              val = val.replace(/^Best window\s+/i, "Best: ")
            }
          }

          return (
            <div key={item.label} className={`audience-focus-card ${item.tone}`}>
              <span className="audience-focus-icon">
                <IconByName name={item.icon} />
              </span>
              <div>
                <strong>{td(item.label)}</strong>
                <small>{td(val)}</small>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AppHeader({
  onOpenMenu,
  menuOpen,
  theme,
  setTheme,
  showThemeToggle = false,
}: {
  onOpenMenu: () => void
  menuOpen: boolean
  theme?: "dark" | "light"
  setTheme?: (theme: "dark" | "light") => void
  showThemeToggle?: boolean
}) {
  const { t } = useTranslation()
  return (
    <header className="app-top-header" aria-label={t("home.headerAria")}>
      <div className="app-header-group">
        <MausamMenuButton onClick={onOpenMenu} expanded={menuOpen} />
        {showThemeToggle && theme && setTheme && (
          <button
            className={`theme-toggle theme-toggle-${theme}`}
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={t("home.themeSwitch", {
              theme: t(theme === "dark" ? "theme.light" : "theme.dark"),
            })}
            aria-pressed={theme === "dark"}
          >
            <span className="theme-toggle-thumb" aria-hidden="true" />
            <svg
              className="theme-icon theme-icon-sun"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3.5" />
              <path d="M12 2.5v2M12 19.5v2M4.7 4.7l1.4 1.4M17.9 17.9l1.4 1.4M2.5 12h2M19.5 12h2M4.7 19.3l1.4-1.4M17.9 6.1l1.4-1.4" />
            </svg>
            <svg
              className="theme-icon theme-icon-moon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z" />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}

// ── Home Tab ───────────────────────────────────────────────────────────────────

export function HomeTab({
  profile,
  location,
  theme,
  setTheme,
  onOpenPersonalized,
  onOpenMenu,
  menuOpen,
  weather,
  advisoryRefreshKey,
}: {
  profile: Profile
  location: UserLocation
  theme: "dark" | "light"
  setTheme: (theme: "dark" | "light") => void
  onOpenPersonalized: () => void
  onOpenMenu: () => void
  menuOpen: boolean
  weather: DashboardWeatherData
  advisoryRefreshKey?: number
}) {
  const { t, td, n, nu } = useTranslation()
  const [settings] = useSettings()
  const { current } = weather
  const [now, setNow] = useState(() => new Date())
  const locationLabel = formatUserLocation(location)
  const locationTimeZone =
    weather.location?.timezone || location.timezone || "Asia/Kolkata"
  const greeting = getTimeGreeting(now, locationTimeZone)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const isNightEffective = (() => {
    if (current.isDay === false) return true
    const sunsetStr = weather.astronomy?.sunset
    if (sunsetStr) {
      const match = sunsetStr.match(/(\d+):(\d+)\s*(am|pm)?/i)
      if (match) {
        let h = parseInt(match[1], 10)
        const m = parseInt(match[2], 10)
        const meridian = match[3]?.toLowerCase()
        if (meridian === "pm" && h < 12) h += 12
        if (meridian === "am" && h === 12) h = 0
        const sunsetMin = h * 60 + m
        const currentMin = now.getHours() * 60 + now.getMinutes()
        if (currentMin >= sunsetMin || currentMin < 5 * 60 + 30) return true
      }
    }
    const hour = now.getHours() + now.getMinutes() / 60
    return hour >= 18 || hour < 5.5
  })()

  // Rain has its own buddy in either daylight state. Any non-rainy night
  // uses the lunar preset, including older API payloads that still say
  // heroVariant="sunny" but correctly expose isDay=false.
  const weatherHeroVariant =
    current.heroVariant === "rainy"
      ? "rainy"
      : isNightEffective
        ? "night"
        : (current.heroVariant ??
          getWeatherHeroVariant(
            current.conditionCode,
            current.condition,
            current.isDay,
          ))
  const isRainy = weatherHeroVariant === "rainy"
  const isNight = weatherHeroVariant === "night"
  // Which rain character, once isRainy has already won the chain below.
  // Shared with widgetBridge's resolver so the two systems agree.
  const rainCharacter = getRainCharacter(
    current.conditionCode,
    current.condition,
  )
  // Partly cloudy keeps the sun or moon as its subject, so its "cloudy" is
  // stripped before either sky test rather than excluded after it, which
  // keeps a payload like "partly_cloudy Fog" on the fog side.
  // Note: both tests below match literal substrings, so a provider that
  // reports "Hazy" would not match here (nor in widgetBridge's resolver).
  const skyText = `${current.conditionCode} ${current.condition}`.replace(
    /partly[\s_-]*cloudy/gi,
    "",
  )
  // Fog has its own character, and the render chain below checks it ahead of
  // overcast: a payload that says both ("Overcast fog") reads as fog, which
  // is the one that actually changes what you can see. "smoke" belongs to
  // this family in widgetBridge's resolver too, so the two systems agree on
  // all four spellings.
  const isFoggy = /fog|mist|haze|smoke/i.test(skyText)
  const isOvercast = /overcast|cloudy/i.test(skyText)
  // Palette for the overcast character, ported from OvercastIcon.tsx, and
  // shared with the fog character, which is the same cloud in the same
  // weather — only `band` (the drifting fog) is fog's alone. The disc behind
  // the overcast cloud is background scenery: dimmed, and with no face.
  //
  // `band` is the one value keyed on the app theme rather than the sky. A
  // non-rainy hero card is .is-sunny / .is-night, which in light mode is a
  // cream, near-white card; a white band on it is invisible, and the fog
  // character then reads as the overcast one with its sun removed. On a pale
  // card the fog has to be the darker element, so it flips to slate.
  const isLightMode = theme === "light"
  // Colour alone was not enough: measured against the card, light-theme
  // bands came in at about a third of the dark-theme ones. The alpha scale
  // brings them to a comparable weight without darkening the hue into
  // something that reads as scratches rather than mist.
  const bandOnPaleCard = "#445c74"
  const bandAlpha = isLightMode ? 1.55 : 1
  const overcastArt = isNight
    ? isLightMode
      ? {
          cloud: ["#cbd5e1", "#94a3b8"],
          back: ["#b5c2d5", "#8393ab"],
          // Warm golden-cream moon with strong contrast against light mode card
          disc: ["#fff8db", "#f59e0b"],
          glow: "#fde68a",
          crater: "#d97706",
          craterOpacity: [0.45, 0.38],
          discOpacity: 0.94,
          ink: "#1e293b",
          blush: "#e3a2b6",
          band: bandOnPaleCard,
          bandAlpha,
        }
      : {
          cloud: ["#cbd5e1", "#94a3b8"],
          back: ["#b5c2d5", "#8393ab"],
          // Luminous celestial moonlight with warm golden aura on dark card
          disc: ["#fffef0", "#facc15"],
          glow: "#fef08a",
          crater: "#ca8a04",
          craterOpacity: [0.45, 0.38],
          discOpacity: 0.92,
          ink: "#1e293b",
          blush: "#e3a2b6",
          band: "#e8eefa",
          bandAlpha,
        }
    : {
        cloud: ["#f4f7fc", "#b8c6da"],
        back: ["#dee6f2", "#aebbcf"],
        disc: ["#ffe6b0", "#f0b75f"],
        glow: "#ffe6b0",
        crater: "#f0b75f",
        craterOpacity: [0.3, 0.25],
        discOpacity: 0.62,
        ink: "#334155",
        blush: "#fca5a5",
        band: isLightMode ? bandOnPaleCard : "#ffffff",
        bandAlpha,
      }

  // Per-band opacity, scaled for the theme. Each band keeps its own relative
  // weight; only the overall presence changes.
  const fogBandOpacity = (base: number) =>
    Math.min(1, base * overcastArt.bandAlpha).toFixed(3)

  return (
    <div className="home-screen app-page">
      <AppHeader
        onOpenMenu={onOpenMenu}
        menuOpen={menuOpen}
        theme={theme}
        setTheme={setTheme}
        showThemeToggle={true}
      />

      <button
        className="personal-insight home-insight"
        type="button"
        onClick={onOpenPersonalized}
        aria-label={t("home.briefingAria")}
      >
        <div className="insight-spark"><Icon name="spark" /></div>
        <div className="home-insight-body">
          <div className="home-insight-title">
            {profile.name ? (
              <span className="home-insight-title-text">
                {td(greeting)}, <span className="home-insight-user-name" data-i18n-ignore>{profile.name}</span>
              </span>
            ) : (
              td(greeting)
            )}
          </div>
          <div className="home-insight-subtitle">
            {profile.sensitivities.length
              ? t("home.watching", {
                  items: profile.sensitivities
                    .slice(0, 2)
                    .map((item) => td(item))
                    .join(" + "),
                })
              : t("sidebar.briefing")}
          </div>
        </div>
        <div className="insight-arrow" aria-hidden="true">›</div>
      </button>
      {/* Hero Card */}
      <div
        className={`weather-hero-card is-${weatherHeroVariant}`}
        data-weather-variant={weatherHeroVariant}
        style={{
          background:
            "linear-gradient(150deg, #192f52 0%, #0e1c38 40%, #070d1e 100%)",
          borderRadius: 24,
          padding: "26px 22px 22px",
          marginBottom: 14,
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Ambient glows */}
        <div
          className="hero-ambient hero-ambient-top"
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            background:
              "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <div
          className="hero-ambient hero-ambient-bottom"
          style={{
            position: "absolute",
            bottom: -50,
            left: -30,
            width: 180,
            height: 180,
            background:
              "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        <div
          className="weather-hero-content"
          style={{ position: "relative", zIndex: 1 }}
        >
          <div className="hero-location hero-location-inline">
            <span className="hero-location-pin" aria-hidden="true">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
              </svg>
            </span>
            <span className="hero-location-name" data-i18n-ignore>
              {locationLabel}
            </span>

          </div>

          <div
            className="weather-hero-main"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div>
              <div
                className="weather-temp-value"
                style={{
                  fontSize: 82,
                  fontWeight: 800,
                  color: "white",
                  lineHeight: 1,
                  letterSpacing: "-0.05em",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                }}
              >
                <span>{n(convertTemperature(current.temperature, settings.temperatureUnit))}</span>
                <span
                  style={{
                    fontSize: 38,
                    fontWeight: 300,
                    color: "rgba(255,255,255,0.4)",
                    transform: "translateY(8px)",
                  }}
                >
                  {t("unit.degree")}
                </span>
              </div>
              <div
                className="weather-condition"
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.6)",
                  fontWeight: 500,
                  marginTop: 6,
                }}
              >
                {td(current.condition)}
              </div>
              <div
                className="weather-meta"
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.3)",
                  marginTop: 3,
                }}
              >
                {t("hero.feels", { value: convertTemperature(current.feelsLike, settings.temperatureUnit) })} &nbsp;·&nbsp;{" "}
                {t("hero.highLow", {
                  high: convertTemperature(current.high, settings.temperatureUnit),
                  low: convertTemperature(current.low, settings.temperatureUnit),
                })}
              </div>
              <div className="weather-estimate-note" style={{ fontSize: 11, marginTop: 8, opacity: 0.7, color: "rgba(255,255,255,0.7)" }}>
                {isLiveWeatherEnabled()
                  ? t("hero.areaEstimate", { time: formatClockTimeStr(td(weather.updatedAt), settings.timeFormat) })
                  : t("hero.demoPreview")}
              </div>
            </div>
            <div
              className={`weather-companion weather-companion-${weatherHeroVariant}`}
              aria-label={t(
                isRainy
                  ? rainCharacter === "drizzle"
                    ? "hero.ariaDrizzle"
                    : rainCharacter === "heavy-rain"
                      ? "hero.ariaHeavyRain"
                      : "hero.ariaRain"
                  : isFoggy
                    ? "hero.ariaFog"
                    : isOvercast
                      ? "hero.ariaOvercast"
                      : isNight
                        ? "hero.ariaNight"
                        : "hero.ariaSun",
              )}
            >
              <svg
                className="companion-illustration"
                viewBox="0 0 140 140"
                aria-hidden="true"
              >
                <defs>
                  <radialGradient
                    id="moonAshGradient"
                    cx="34%"
                    cy="27%"
                    r="76%"
                  >
                    <stop offset="0%" stopColor="#f4f5f7" />
                    <stop offset="54%" stopColor="#c8cdd5" />
                    <stop offset="100%" stopColor="#8c96a5" />
                  </radialGradient>
                </defs>
                {isRainy && rainCharacter === "drizzle" ? (
                  <>
                    {/* Drizzle: the rain cloud's own body and palette, so the
                        three rain characters stay one family. A shallower
                        puddle and three widely-spaced drops carry the
                        difference, not a new silhouette. */}
                    <ellipse
                      className="illustration-puddle"
                      cx="78"
                      cy="124"
                      rx="36"
                      ry="6"
                      fill="#b9e7ef"
                      opacity=".22"
                    />
                    <ellipse
                      className="illustration-reflection"
                      cx="77"
                      cy="125"
                      rx="19"
                      ry="2.4"
                      fill="#d9f3f4"
                      opacity=".26"
                    />
                    <g className="cloud-character cloud-character-drizzle">
                      <path
                        d="M25 62q-4-12 8-18 3-20 24-15 13-18 31-4 20-8 29 10 17 1 17 17 11 4 8 16-2 10-15 10H42Q25 78 25 62Z"
                        fill="#78b5d5"
                        stroke="#263f5c"
                        strokeWidth="2.2"
                      />
                      {/* Content: eyes a shade wider and the smile opened up
                          and lightened, which reads better at hero size than
                          the small-tile weights. */}
                      <g className="drizzle-eyes" fill="#26313c">
                        <circle cx="60" cy="56" r="2.6" />
                        <circle cx="83" cy="56" r="2.6" />
                      </g>
                      <path
                        d="M65 64q6 4 12 0"
                        fill="none"
                        stroke="#26313c"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <g className="drizzle-drops">
                        <path
                          className="drizzle-drop"
                          d="M52 84q-2.6 4 0 8q2.6-4 0-8Z"
                        />
                        <path
                          className="drizzle-drop"
                          d="M76 83q-2.6 4.5 0 9q2.6-4.5 0-9Z"
                        />
                        <path
                          className="drizzle-drop"
                          d="M99 84q-2.6 4 0 8q2.6-4 0-8Z"
                        />
                      </g>
                    </g>
                  </>
                ) : isRainy && rainCharacter === "heavy-rain" ? (
                  <>
                    {/* Heavy rain: same body again, a broader puddle, and
                        eight tightly-spaced drops falling roughly twice as
                        fast as the drizzle's three. */}
                    <ellipse
                      className="illustration-puddle"
                      cx="78"
                      cy="124"
                      rx="50"
                      ry="8.5"
                      fill="#b9e7ef"
                      opacity=".34"
                    />
                    <ellipse
                      className="illustration-reflection"
                      cx="77"
                      cy="125"
                      rx="30"
                      ry="3.2"
                      fill="#d9f3f4"
                      opacity=".38"
                    />
                    <g className="cloud-character cloud-character-heavy-rain">
                      <path
                        d="M25 62q-4-12 8-18 3-20 24-15 13-18 31-4 20-8 29 10 17 1 17 17 11 4 8 16-2 10-15 10H42Q25 78 25 62Z"
                        fill="#78b5d5"
                        stroke="#263f5c"
                        strokeWidth="2.2"
                      />
                      {/* Squinting: the eyes are arcs braced against the
                          downpour rather than open circles. */}
                      <g
                        className="heavy-rain-eyes"
                        fill="none"
                        stroke="#26313c"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                      >
                        <path d="M55 57q5-4 10 0" />
                        <path d="M78 57q5-4 10 0" />
                      </g>
                      <path
                        d="M67 66q4-2.5 8 0"
                        fill="none"
                        stroke="#26313c"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <g className="heavy-rain-drops">
                        <path className="heavy-rain-drop" d="M44 84q-2.4 5 0 10q2.4-5 0-10Z" />
                        <path className="heavy-rain-drop" d="M53 82q-2.4 6 0 12q2.4-6 0-12Z" />
                        <path className="heavy-rain-drop" d="M62 84q-2.4 5 0 10q2.4-5 0-10Z" />
                        <path className="heavy-rain-drop" d="M71 82q-2.4 6 0 12q2.4-6 0-12Z" />
                        <path className="heavy-rain-drop" d="M80 84q-2.4 5 0 10q2.4-5 0-10Z" />
                        <path className="heavy-rain-drop" d="M89 82q-2.4 6 0 12q2.4-6 0-12Z" />
                        <path className="heavy-rain-drop" d="M98 84q-2.4 5 0 10q2.4-5 0-10Z" />
                        <path className="heavy-rain-drop" d="M107 83q-2.4 5.5 0 11q2.4-5.5 0-11Z" />
                      </g>
                    </g>
                  </>
                ) : isRainy ? (
                  <>
                    <g
                      className="illustration-rain"
                      stroke="#c8f2fa"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity=".65"
                    >
                      <path d="M16 16l-6 14" />
                      <path d="M48 8l-6 14" />
                      <path d="M114 12l-6 14" />
                      <path d="M25 49l-6 14" />
                      <path d="M128 48l-6 14" />
                    </g>
                    <ellipse
                      className="illustration-puddle"
                      cx="78"
                      cy="124"
                      rx="47"
                      ry="8"
                      fill="#b9e7ef"
                      opacity=".3"
                    />
                    <ellipse
                      className="illustration-reflection"
                      cx="77"
                      cy="125"
                      rx="27"
                      ry="3"
                      fill="#d9f3f4"
                      opacity=".35"
                    />
                    <g className="cloud-character cloud-character-rain">
                      <path
                        d="M25 62q-4-12 8-18 3-20 24-15 13-18 31-4 20-8 29 10 17 1 17 17 11 4 8 16-2 10-15 10H42Q25 78 25 62Z"
                        fill="#78b5d5"
                        stroke="#263f5c"
                        strokeWidth="2.2"
                      />
                      <circle cx="61" cy="56" r="2.3" fill="#26313c" />
                      <circle cx="82" cy="56" r="2.3" fill="#26313c" />
                      <path
                        d="M67 64q4 3 8 0"
                        fill="none"
                        stroke="#26313c"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <g className="cloud-rain-drops">
                        <path
                          className="cloud-drop"
                          d="M48 84q-3 4 0 8q3-4 0-8Z"
                        />
                        <path
                          className="cloud-drop"
                          d="M62 83q-3 5 0 10q3-5 0-10Z"
                        />
                        <path
                          className="cloud-drop"
                          d="M76 84q-3 4 0 8q3-4 0-8Z"
                        />
                        <path
                          className="cloud-drop"
                          d="M91 82q-3 6 0 11q3-5 0-11Z"
                        />
                        <path
                          className="cloud-drop"
                          d="M105 84q-3 4 0 8q3-4 0-8Z"
                        />
                      </g>
                    </g>
                    <g className="cloud-character cloud-character-storm">
                      <path
                        d="M25 62q-4-12 8-18 3-20 24-15 13-18 31-4 20-8 29 10 17 1 17 17 11 4 8 16-2 10-15 10H42Q25 78 25 62Z"
                        fill="#b9b3db"
                        stroke="#3e396b"
                        strokeWidth="2.2"
                      />
                      <circle cx="61" cy="56" r="2.3" fill="#28253f" />
                      <circle cx="82" cy="56" r="2.3" fill="#28253f" />
                      <path
                        d="M67 64q4-3 8 0"
                        fill="none"
                        stroke="#28253f"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M69 72l-7 22h10l-5 20 20-28H77l7-14Z"
                        fill="#ffe767"
                        stroke="#d7ad36"
                        strokeWidth="1.2"
                      />
                    </g>
                  </>
                ) : isFoggy ? (
                  <g
                    className="cloud-character cloud-character-fog"
                    data-fog-phase={isNight ? "night" : "day"}
                  >
                    <defs>
                      {/* The overcast cloud's ramps, shifted down with the
                          body. User-space so every lobe shares one gradient
                          instead of each getting its own, which seams. */}
                      <linearGradient
                        id="fogCloudGrad"
                        gradientUnits="userSpaceOnUse"
                        x1="0" y1="57.5" x2="0" y2="123.4"
                      >
                        <stop offset="0%" stopColor={overcastArt.cloud[0]} />
                        <stop offset="100%" stopColor={overcastArt.cloud[1]} />
                      </linearGradient>
                      <linearGradient
                        id="fogBackGrad"
                        gradientUnits="userSpaceOnUse"
                        x1="0" y1="38.9" x2="0" y2="70.9"
                      >
                        <stop offset="0%" stopColor={overcastArt.back[0]} />
                        <stop offset="100%" stopColor={overcastArt.back[1]} />
                      </linearGradient>
                      {/* Feathers the bands out at both ends. Flat-alpha
                          bands over the card read as hard stripes rather
                          than fog, and the companion's own overflow clip
                          cannot do the fading: a gradient painted onto the
                          bands travels with them as they drift, so it
                          arrives at the clip line still part-opaque and
                          leaves a blunt vertical edge that slides back and
                          forth. The fade therefore lives in a mask on the
                          static parent below, anchored to the viewBox, and
                          the bands drift underneath it — so the alpha is
                          zero at x=0 and x=140 whatever the drift phase. */}
                      <linearGradient
                        id="fogBandFade"
                        gradientUnits="userSpaceOnUse"
                        x1="0" y1="0" x2="140" y2="0"
                      >
                        <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                        <stop offset="18%" stopColor="#fff" stopOpacity="1" />
                        <stop offset="82%" stopColor="#fff" stopOpacity="1" />
                        <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                      </linearGradient>
                      <mask
                        id="fogBandMask"
                        maskUnits="userSpaceOnUse"
                        x="0" y="0" width="140" height="140"
                      >
                        <rect x="0" y="0" width="140" height="140" fill="url(#fogBandFade)" />
                      </mask>
                    </defs>
                    {/* Sitting low: the body is the overcast cloud's, moved
                        down 6 units, and the shadow is wider and closer for
                        a character resting rather than floating. No sun or
                        moon behind it — fog is what hides the sky. */}
                    <ellipse cx="70" cy="130" rx="47" ry="6.5" fill="#475569" opacity=".22" />

                    {/* Smaller, fainter cloud behind — slower drift, parallax */}
                    <g className="fog-cloud-back" opacity=".5">
                      <g fill="url(#fogBackGrad)">
                        <circle cx="32.9" cy="53.4" r="14.4" />
                        <circle cx="49.4" cy="56.4" r="11.3" />
                        <rect x="20.6" y="55.4" width="41.2" height="15.4" rx="7.7" />
                      </g>
                    </g>

                    {/* The character. Outer group drifts, inner group settles,
                        so the two run on independent periods. Both offsets
                        are baked into the coordinates rather than carried on
                        a transform attribute, which the CSS transform
                        animations on these same nodes would override. */}
                    <g className="fog-cloud">
                      <g className="fog-cloud-settle">
                        <g fill="url(#fogCloudGrad)">
                          <circle cx="49.4" cy="84.2" r="26.8" />
                          <circle cx="90.6" cy="76" r="25.7" />
                          <circle cx="111.2" cy="90.4" r="17.5" />
                          <rect x="20.6" y="86.3" width="98.8" height="37.1" rx="18.5" />
                        </g>
                        <ellipse cx="45.3" cy="67.8" rx="16.5" ry="7.4" fill="#ffffff" opacity=".28" />
                        <ellipse cx="38" cy="105" rx="8" ry="5" fill={overcastArt.blush} opacity=".45" />
                        <ellipse cx="98" cy="105" rx="8" ry="5" fill={overcastArt.blush} opacity=".45" />
                        {/* Half-closed: only the lower arc of each eye is
                            drawn, so the flat top edge reads as a lowered
                            lid. Set wider apart than the overcast face,
                            which scales up over-weighted at hero size. */}
                        <g className="fog-eyes" fill={overcastArt.ink}>
                          <path d="M46.6 92.5Q52 99.7 57.4 92.5Z" />
                          <path d="M80.6 92.5Q86 99.7 91.4 92.5Z" />
                        </g>
                        <path
                          d="M61 104q9 7 18 0"
                          fill="none"
                          stroke={overcastArt.ink}
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </g>
                    </g>

                    {/* Fog bands drift across the body, the second one over
                        the face. Each band's own opacity is an attribute on
                        the outer group; the inner one carries the CSS
                        opacity animation. A CSS opacity animation on the
                        outer group would override the attribute and flash
                        the band to full strength, so the two are split and
                        their opacities multiply instead — the same reason
                        the overcast disc is split above.
                        .fog-bands itself never moves: it carries the fade
                        mask, which stays aligned to the viewBox while the
                        bands drift beneath it. Nothing here may animate or
                        it would drag the fade along with it. */}
                    <g
                      className="fog-bands"
                      mask="url(#fogBandMask)"
                      fill={overcastArt.band}
                    >
                      <g className="fog-band" opacity={fogBandOpacity(0.22)}>
                        <g className="fog-band-drift fog-band-drift-1">
                          <rect x="-14" y="66" width="168" height="6" rx="3" />
                        </g>
                      </g>
                      <g className="fog-band" opacity={fogBandOpacity(0.34)}>
                        <g className="fog-band-drift fog-band-drift-2">
                          <rect x="-14" y="90" width="168" height="7" rx="3.5" />
                        </g>
                      </g>
                      <g className="fog-band" opacity={fogBandOpacity(0.26)}>
                        <g className="fog-band-drift fog-band-drift-3">
                          <rect x="-14" y="108" width="168" height="6.5" rx="3.25" />
                        </g>
                      </g>
                      <g className="fog-band" opacity={fogBandOpacity(0.18)}>
                        <g className="fog-band-drift fog-band-drift-4">
                          <rect x="-14" y="116" width="168" height="5.5" rx="2.75" />
                        </g>
                      </g>
                    </g>
                  </g>
                ) : isOvercast ? (
                  <g
                    className="cloud-character cloud-character-overcast"
                    data-overcast-phase={isNight ? "night" : "day"}
                  >
                    <defs>
                      {/* User-space ramps so every lobe shares one gradient
                          instead of each getting its own, which seams. */}
                      <linearGradient
                        id="overcastCloudGrad"
                        gradientUnits="userSpaceOnUse"
                        x1="0" y1="51.5" x2="0" y2="117.4"
                      >
                        <stop offset="0%" stopColor={overcastArt.cloud[0]} />
                        <stop offset="100%" stopColor={overcastArt.cloud[1]} />
                      </linearGradient>
                      <linearGradient
                        id="overcastBackGrad"
                        gradientUnits="userSpaceOnUse"
                        x1="0" y1="32.9" x2="0" y2="64.9"
                      >
                        <stop offset="0%" stopColor={overcastArt.back[0]} />
                        <stop offset="100%" stopColor={overcastArt.back[1]} />
                      </linearGradient>
                      {/* Fades out rather than stopping flat, so no hard rim */}
                      <radialGradient id="overcastGlowGrad" cx="50%" cy="50%" r="50%">
                        <stop offset="52%" stopColor={overcastArt.glow || overcastArt.disc[0]} stopOpacity={isNight ? ".55" : ".4"} />
                        <stop offset="100%" stopColor={overcastArt.glow || overcastArt.disc[0]} stopOpacity="0" />
                      </radialGradient>
                      <radialGradient id="overcastDiscGrad" cx="38%" cy="32%" r="72%">
                        <stop offset="0%" stopColor={overcastArt.disc[0]} />
                        <stop offset="100%" stopColor={overcastArt.disc[1]} />
                      </radialGradient>
                    </defs>
                    <ellipse cx="70" cy="122" rx="42" ry="7" fill="#475569" opacity=".25" />

                    {/* Sun by day, moon by night — dimmed scenery, no face.
                        The cloud in front hides about two thirds of it. */}
                    {/* Outer group holds the dimming as an attribute; the
                        inner one breathes. A CSS opacity animation on the
                        outer group would override the attribute and flash
                        the disc to full brightness, so the two are split
                        and their opacities multiply instead. */}
                    <g className="overcast-disc" opacity={overcastArt.discOpacity}>
                      <g className="overcast-disc-breathe">
                        <circle
                          cx={isNight ? "99" : "96.8"}
                          cy={isNight ? "49" : "57.6"}
                          r={isNight ? "38" : "32.9"}
                          fill="url(#overcastGlowGrad)"
                        />
                        <circle
                          cx={isNight ? "99" : "96.8"}
                          cy={isNight ? "49" : "57.6"}
                          r={isNight ? "29.5" : "25.7"}
                          fill="url(#overcastDiscGrad)"
                        />
                        {isNight ? (
                          <>
                            <circle
                              cx="105"
                              cy="37"
                              r="5"
                              fill={overcastArt.crater || overcastArt.disc[1]}
                              opacity={overcastArt.craterOpacity ? overcastArt.craterOpacity[0] : ".5"}
                            />
                            <circle
                              cx="91.5"
                              cy="34"
                              r="3.4"
                              fill={overcastArt.crater || overcastArt.disc[1]}
                              opacity={overcastArt.craterOpacity ? overcastArt.craterOpacity[1] : ".4"}
                            />
                          </>
                        ) : null}
                      </g>
                    </g>

                    {/* Smaller, fainter cloud behind — slower drift, parallax */}
                    <g className="overcast-cloud-back" opacity=".5">
                      <g fill="url(#overcastBackGrad)">
                        <circle cx="32.9" cy="47.4" r="14.4" />
                        <circle cx="49.4" cy="50.4" r="11.3" />
                        <rect x="20.6" y="49.4" width="41.2" height="15.4" rx="7.7" />
                      </g>
                    </g>

                    {/* The character. Outer group drifts, inner group bobs,
                        so the two run on independent periods. */}
                    <g className="overcast-cloud">
                      <g className="overcast-cloud-bob">
                        <g fill="url(#overcastCloudGrad)">
                          <circle cx="49.4" cy="78.2" r="26.8" />
                          <circle cx="90.6" cy="70" r="25.7" />
                          <circle cx="111.2" cy="84.4" r="17.5" />
                          <rect x="20.6" y="80.3" width="98.8" height="37.1" rx="18.5" />
                        </g>
                        <ellipse cx="45.3" cy="61.8" rx="16.5" ry="7.4" fill="#ffffff" opacity=".28" />
                        <ellipse cx="40" cy="99" rx="7.5" ry="5" fill={overcastArt.blush} opacity=".45" />
                        <ellipse cx="96" cy="99" rx="7.5" ry="5" fill={overcastArt.blush} opacity=".45" />
                        <g className="overcast-eyes" fill={overcastArt.ink}>
                          <circle cx="54" cy="86.5" r="4.8" />
                          <circle cx="84" cy="86.5" r="4.8" />
                        </g>
                        <path
                          d="M59 98q10 11 20 0"
                          fill="none"
                          stroke={overcastArt.ink}
                          strokeWidth="3.4"
                          strokeLinecap="round"
                        />
                      </g>
                    </g>
                  </g>
                ) : isNight ? (
                  <>
                    <ellipse
                      className="moon-shadow"
                      cx="72"
                      cy="121"
                      rx="35"
                      ry="6"
                      fill="#758297"
                      opacity=".22"
                    />
                    <circle
                      className="moon-halo"
                      cx="70"
                      cy="65"
                      r="51"
                      fill="#dce4ef"
                      opacity=".11"
                    />
                    <g className="moon-buddy">
                      <circle
                        cx="70"
                        cy="65"
                        r="42"
                        fill="url(#moonAshGradient)"
                        stroke="#f5f7fa"
                        strokeWidth="2.2"
                      />
                      <circle
                        cx="45"
                        cy="43"
                        r="7"
                        fill="#747e8d"
                        opacity=".18"
                      />
                      <circle
                        cx="94"
                        cy="47"
                        r="5"
                        fill="#6f7988"
                        opacity=".16"
                      />
                      <circle
                        cx="94"
                        cy="88"
                        r="8"
                        fill="#687382"
                        opacity=".17"
                      />
                      <circle
                        cx="48"
                        cy="91"
                        r="4"
                        fill="#65707f"
                        opacity=".14"
                      />
                      <path
                        d="M49 63q5-6 10 0"
                        fill="none"
                        stroke="#273247"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M81 63q5-6 10 0"
                        fill="none"
                        stroke="#273247"
                        strokeWidth="2.8"
                        strokeLinecap="round"
                      />
                      <circle
                        cx="48"
                        cy="73"
                        r="5"
                        fill="#a8b6cc"
                        opacity=".8"
                      />
                      <circle
                        cx="92"
                        cy="73"
                        r="5"
                        fill="#a8b6cc"
                        opacity=".8"
                      />
                      <path
                        d="M56 73q14 17 28 0"
                        fill="none"
                        stroke="#273247"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M50 34q13-8 29-5"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        opacity=".6"
                      />
                    </g>
                  </>
                ) : (
                  <image
                    className="sun-buddy-image"
                    href="/sunny-weather-buddy.png"
                    x="0"
                    y="0"
                    width="140"
                    height="140"
                    preserveAspectRatio="xMidYMid slice"
                  />
                )}
              </svg>
            </div>
          </div>

          <div
            className="weather-stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              marginTop: 20,
              paddingTop: 18,
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {[
              {
                v: n(current.windSpeed),
                u: t("unit.kmh"),
                l: t("stat.wind", { direction: td(current.windDirection) }),
              },
              {
                v: n(current.humidity),
                u: t("unit.percent"),
                l: t("stat.humidity"),
              },
              {
                v: n(current.visibility),
                u: t("unit.km"),
                l: t("stat.visibility"),
              },
            ].map((s, i) => (
              <div
                className="weather-stat"
                key={i}
                style={{ textAlign: "center" }}
              >
                <div className="weather-stat-label">{s.l}</div>
                <div
                  className="weather-stat-value"
                  style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "white",
                    marginTop: 4,
                  }}
                >
                  {s.v}
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 400,
                      color: "rgba(255,255,255,0.35)",
                      marginInlineStart: isTightUnit(s.u) ? 0 : 2,
                    }}
                  >
                    {s.u}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AudienceFocus items={weather.overview} />
      <OfficialAdvisories location={location} refreshKey={advisoryRefreshKey} />

      {/* Hourly Forecast */}
      <div style={{ marginBottom: 22 }}>
        <SectionLabel>{t("section.hourlyRain")}</SectionLabel>
        <div
          className="no-scrollbar horizontal-scroll"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {weather.hourly.map((hour, i) => (
            <div
              key={`${hour.time}-${i}`}
              style={{
                flexShrink: 0,
                width: 62,
                borderRadius: 16,
                padding: "11px 6px",
                background:
                  i === 0 ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${
                  i === 0 ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.06)"
                }`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: i === 0 ? "#60a5fa" : "rgba(255,255,255,0.35)",
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                {formatClockTimeStr(td(hour.time), settings.timeFormat)}
              </div>
              <div
                data-testid={i === 0 ? "hourly-now-icon" : undefined}
                style={{ display: "grid", placeItems: "center", fontSize: 26 }}
              >
                <WeatherIcon
                  conditionCode={hour.conditionCode}
                  icon={hour.icon}
                  label={td(hour.condition)}
                  isDay={
                    hour.isDay ?? (i === 0 ? weather.current.isDay : undefined)
                  }
                />
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "white",
                  marginTop: 4,
                }}
              >
                {nu(convertTemperature(hour.temperature, settings.temperatureUnit), "unit.degree")}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "#60a5fa",
                  marginTop: 2,
                  fontWeight: 700,
                }}
              >
                {nu(hour.rainChance, "unit.percent")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Grid */}
      <div style={{ marginBottom: 22 }}>
        <SectionLabel>{t("section.todaysMetrics")}</SectionLabel>
        <div
          className="metric-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          {/* AQI */}
          <Card
            className="metric-primary-card aqi-tile"
            grad="linear-gradient(140deg,#431407 0%,#1c0803 100%)"
            border="rgba(245,158,11,0.12)"
          >
            {weather.airQuality ? (
              <>
                <Badge color="#fbbf24" bg="rgba(245,158,11,0.14)">
                  {t("badge.indiaAqi", { index: weather.airQuality.index })}
                </Badge>
                <CardLabel>{t("card.airQuality")}</CardLabel>
                <div className="aqi-status">{td(weather.airQuality.label)}</div>
                <div className="aqi-meter">
                  <Bar
                    pct={
                      (weather.airQuality.index / weather.airQuality.scaleMax) *
                      100
                    }
                    fill={INDIA_NAQI_GRADIENT}
                    height={5}
                  />
                </div>
                <div className="aqi-pollutants">
                  {weather.airQuality.pollutants
                    .slice(0, 2)
                    .map((pollutant) => (
                      <div className="aqi-pollutant" key={pollutant.label}>
                        <div className="aqi-pollutant-label">
                          {pollutant.label}
                        </div>
                        <div
                          className="aqi-pollutant-value"
                          style={{ color: pollutant.color }}
                        >
                          {n(pollutant.value)}
                        </div>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <>
                <CardLabel>{t("card.airQuality")}</CardLabel>
                <div className="aqi-unavailable">
                  <div className="aqi-unavailable-title">
                    {t("aqi.unavailable")}
                  </div>
                  <div className="aqi-unavailable-note">
                    {t("aqi.noStation")}
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* UV */}
          <Card
            className="metric-primary-card uv-tile"
            grad="linear-gradient(140deg,#7c2d12 0%,#2c0e07 100%)"
            border="rgba(251,146,60,0.1)"
          >
            <Badge color="#fb923c" bg="rgba(251,146,60,0.14)">
              {td(weather.uv.label).toUpperCase()}
            </Badge>
            <CardLabel>{t("card.uvIndex")}</CardLabel>
            <div className="metric-card-number metric-index">
              {n(weather.uv.index)}
            </div>
            <div className="metric-card-emphasis">
              {td(weather.uv.recommendation)}
            </div>
            <div className="metric-card-note">
              {t("uv.peak", { value: td(weather.uv.peakHours) })}
            </div>
          </Card>

          {/* Best Run */}
          <Card
            className="metric-primary-card run-tile"
            grad="linear-gradient(140deg,#064e3b 0%,#022c22 100%)"
            border="rgba(52,211,153,0.1)"
          >
            <Badge color="#34d399" bg="rgba(52,211,153,0.14)">
              {td(weather.running.badge)}
            </Badge>
            <CardLabel>
              {weather.running.dayLabel
                ? t("card.bestRunOn", { day: td(weather.running.dayLabel) })
                : t("card.bestRun")}
            </CardLabel>
            <div className="metric-card-number metric-run-time">
              {weather.running.start
                ? `${formatClockTimeStr(weather.running.start, settings.timeFormat)}–${formatClockTimeStr(weather.running.end, settings.timeFormat)}`
                : t("common.unavailable")}
            </div>
            <div className="metric-card-emphasis">
              {td(weather.running.summary)}
            </div>
            <div className="metric-card-note metric-card-accent">
              {t("run.sunrise", {
                value: formatClockTimeStr(
                  weather.running.sunrise ??
                  (weather.running.dayLabel === "Tomorrow"
                    ? t("common.unavailable")
                    : weather.astronomy.sunrise),
                  settings.timeFormat,
                ),
              })}
            </div>
          </Card>

          {/* Rain Today */}
          {(() => {
            const rainToday = convertRain(weather.rainfall.today, settings.rainUnit)
            const rainMonth =
              weather.rainfall.month !== undefined
                ? convertRain(weather.rainfall.month, settings.rainUnit)
                : null
            return (
              <Card
                className="metric-primary-card rainfall-tile"
                grad="linear-gradient(140deg,#1e3a5f 0%,#0a1830 100%)"
                border="rgba(96,165,250,0.1)"
              >
                <Badge color="#60a5fa" bg="rgba(96,165,250,0.14)">
                  {nu(weather.rainfall.chance, "unit.percent")}
                </Badge>
                <CardLabel>{t("card.rainfallToday")}</CardLabel>
                <div className="metric-card-number metric-rainfall">
                  {n(rainToday.value)}
                  <span> {td(rainToday.unit)}</span>
                </div>
                <div className="metric-card-emphasis">
                  {td(weather.rainfall.periodLabel)}
                </div>
                <div className="metric-card-note">
                  {t("rainfall.month", {
                    value:
                      rainMonth !== null
                        ? `${n(rainMonth.value)} ${td(rainMonth.unit)}`
                        : t("common.unavailable"),
                  })}
                </div>
              </Card>
            )
          })()}

          {/* Commute — full width */}
          <Card
            className="commute-card commute-tile"
            grad="linear-gradient(140deg,#2e1065 0%,#100522 100%)"
            border="rgba(167,139,250,0.1)"
            span2
          >
            <Badge color="#f87171" bg="rgba(239,68,68,0.14)">
              {td(weather.commute.status)}
            </Badge>
            <CardLabel>
              <span data-i18n-ignore>
                {t("card.commuteStatus", { location: weather.commute.location })}
              </span>
            </CardLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
                marginTop: 4,
              }}
            >
              {weather.commute.items.map((c) => (
                <div
                  key={c.name}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: 12,
                    padding: "10px 8px",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 18 }}>
                    <IconByName name={c.icon} />
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: "#a78bfa",
                      fontWeight: 800,
                      marginTop: 5,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {td(c.name)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "white",
                      marginTop: 2,
                    }}
                  >
                    {td(c.value)}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: "rgba(255,255,255,0.28)",
                      marginTop: 1,
                    }}
                  >
                    {td(c.detail)}
                  </div>
                </div>
              ))}
            </div>
          </Card>


        </div>
      </div>

      {/* 7-Day Forecast */}
      <div style={{ marginBottom: 14 }}>
        <SectionLabel>{t("section.sevenDay")}</SectionLabel>
        <div
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 20,
            overflow: "hidden",
          }}
        >
          {weather.daily.map((day, i) => (
            <div
              key={day.day}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "13px 16px",
                borderBottom:
                  i < weather.daily.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : "none",
                background: i === 0 ? "rgba(59,130,246,0.05)" : "transparent",
              }}
            >
              <div
                style={{
                  width: 44,
                  fontSize: 12,
                  fontWeight: 700,
                  color: i === 0 ? "#60a5fa" : "rgba(255,255,255,0.6)",
                }}
              >
                {td(day.day)}
              </div>
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  fontSize: 20,
                  marginRight: 8,
                }}
              >
                <WeatherIcon
                  conditionCode={day.conditionCode}
                  icon={day.icon}
                  label={td(day.condition)}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.32)",
                }}
              >
                {td(day.condition)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: "#60a5fa",
                    background: "rgba(96,165,250,0.1)",
                    borderRadius: 8,
                    padding: "2px 5px",
                  }}
                >
                  {nu(day.rainChance, "unit.percent")}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.32)",
                    minWidth: 22,
                  }}
                >
                  {nu(day.low, "unit.degree")}
                </span>
                <div
                  style={{
                    width: 34,
                    height: 3,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${dailyTemperaturePercent(day, weather.daily)}%`,
                      height: "100%",
                      background: "linear-gradient(90deg,#60a5fa,#f59e0b)",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "white",
                    minWidth: 22,
                  }}
                >
                  {nu(day.high, "unit.degree")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Health Tab ─────────────────────────────────────────────────────────────────

function HealthTab({
  weather,
  onOpenMenu,
  menuOpen,
}: {
  weather: DashboardWeatherData
  onOpenMenu: () => void
  menuOpen: boolean
}) {
  const { t, td, tdList, n, nu } = useTranslation()
  return (
    <div className="app-page health-screen">
      <AppHeader
        onOpenMenu={onOpenMenu}
        menuOpen={menuOpen}
      />
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "white",
          letterSpacing: "-0.03em",
          marginBottom: 18,
        }}
      >
        {t("health.title")}
      </div>

      {/* AQI Detailed */}
      <Card
        grad="linear-gradient(140deg,#431407 0%,#1a0803 100%)"
        border="rgba(245,158,11,0.12)"
        pad={20}
      >
        <CardLabel>
          <span data-i18n-ignore>
            {t("health.aqiCard", { city: weather.current.city })}
          </span>
        </CardLabel>
        {weather.airQuality ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 52,
                    fontWeight: 800,
                    color: "white",
                    lineHeight: 1,
                  }}
                >
                  {n(weather.airQuality.index)}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#fbbf24",
                    marginTop: 5,
                  }}
                >
                  {td(weather.airQuality.label)}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    marginTop: 2,
                  }}
                >
                  {td(weather.airQuality.updatedLabel)}
                </div>
              </div>
              <div
                className="aqi-band-icon"
                style={{
                  fontSize: 44,
                  marginTop: 4,
                  color: `var(${aqiBandForIndex(weather.airQuality.index).token})`,
                }}
              >
                <Icon
                  name={aqiBandForIndex(weather.airQuality.index).icon}
                  label={td(weather.airQuality.label)}
                />
              </div>
            </div>
            <Bar
              pct={
                (weather.airQuality.index / weather.airQuality.scaleMax) * 100
              }
              fill={INDIA_NAQI_GRADIENT}
              height={6}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 8,
                color: "rgba(255,255,255,0.22)",
                marginTop: 5,
                marginBottom: 16,
              }}
            >
              {tdList(weather.airQuality.scaleLabels).map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {weather.airQuality.pollutants.map((p) => (
                <div
                  key={p.label}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "rgba(255,255,255,0.45)",
                        fontWeight: 700,
                      }}
                    >
                      {p.label}
                    </span>
                    <span
                      style={{ fontSize: 11, fontWeight: 800, color: p.color }}
                    >
                      {n(p.value)}
                    </span>
                  </div>
                  <Bar
                    pct={(p.value / p.scaleMax) * 100}
                    fill={p.color}
                    height={3}
                  />
                  <div
                    style={{
                      fontSize: 8,
                      color: "rgba(255,255,255,0.22)",
                      marginTop: 3,
                    }}
                  >
                    {td(p.unit)}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 12,
                background: "rgba(245,158,11,0.08)",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 11,
                color: "#fbbf24",
                lineHeight: 1.55,
              }}
            >
              <AdviceLine
                text={td(weather.airQuality.advice)}
                tone={weather.airQuality.adviceTone}
              />
            </div>
            {weather.airQuality.stationName && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 9,
                  color: "rgba(255,255,255,0.32)",
                  lineHeight: 1.5,
                }}
              >
                {t("health.cpcbStation", {
                  name: weather.airQuality.stationName,
                })}
                {weather.airQuality.stationDistanceKm != null
                  ? ` · ${t("health.kmAway", {
                      km: weather.airQuality.stationDistanceKm,
                    })}`
                  : ""}
              </div>
            )}
          </>
        ) : (
          <div
            style={{
              padding: "20px 0",
              color: "rgba(255,255,255,0.4)",
              fontSize: 12,
            }}
          >
            {t("health.noStationNow")}
          </div>
        )}
      </Card>

      <div style={{ height: 12 }} />

      {/* UV Detailed */}
      <Card
        grad="linear-gradient(140deg,#7c2d12 0%,#2c0e07 100%)"
        border="rgba(251,146,60,0.1)"
        pad={20}
      >
        <CardLabel>{t("card.uvIndex")}</CardLabel>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 14,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: "white",
              lineHeight: 1,
            }}
          >
            {n(weather.uv.index)}
          </div>
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#fb923c" }}>
              {td(weather.uv.label)}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {td(weather.uv.recommendation)}
            </div>
          </div>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background:
              "linear-gradient(90deg,#22c55e,#eab308 30%,#f97316 60%,#ef4444 80%,#dc2626)",
            marginBottom: 8,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: `${Math.max(0, (1 - weather.uv.index / weather.uv.scaleMax) * 100)}%`,
              background: "rgba(0,0,0,0.5)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 8,
            color: "rgba(255,255,255,0.22)",
            marginBottom: 14,
          }}
        >
          {tdList(weather.uv.scaleLabels).map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {t("health.peakHours")}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "white",
                marginTop: 4,
              }}
            >
              {td(weather.uv.peakHours)}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 12,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {t("health.burnTime")}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#fb923c",
                marginTop: 4,
              }}
            >
              {td(weather.uv.burnTime)}
            </div>
          </div>
        </div>
        <div
          style={{
            background: "rgba(251,146,60,0.08)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 11,
            color: "#fdba74",
            lineHeight: 1.6,
          }}
        >
          <AdviceLine text={td(weather.uv.advice)} tone={weather.uv.adviceTone} />
        </div>
      </Card>

      <div style={{ height: 12 }} />

      {/* Pollen */}
      <Card
        grad="linear-gradient(140deg,#14532d 0%,#071a10 100%)"
        border="rgba(74,222,128,0.08)"
        pad={20}
      >
        <CardLabel>{t("health.pollen")}</CardLabel>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "white" }}>
            {td(weather.pollen.overall)}
          </div>
          <div style={{ fontSize: 28 }}>
            <IconByName name={weather.pollen.icon} />
          </div>
        </div>
        {weather.pollen.items.map((p) => (
          <div key={p.type} style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 5,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.55)",
                  fontWeight: 600,
                }}
              >
                {td(p.type)}
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: p.color }}>
                {td(p.level)}
              </span>
            </div>
            <Bar pct={p.percent} fill={p.color} height={3} />
          </div>
        ))}
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "#86efac",
            background: "rgba(74,222,128,0.08)",
            borderRadius: 10,
            padding: "10px 12px",
            lineHeight: 1.55,
          }}
        >
          <AdviceLine
            text={td(weather.pollen.advice)}
            tone={weather.pollen.adviceTone}
          />
        </div>
      </Card>

      <div style={{ height: 12 }} />

      {/* Heat & Hydration */}
      <Card
        grad="linear-gradient(140deg,#1e3a5f 0%,#0a1830 100%)"
        border="rgba(96,165,250,0.08)"
        pad={20}
      >
        <CardLabel>{t("health.heatHydration")}</CardLabel>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: 14,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#f87171",
                lineHeight: 1,
              }}
            >
              {nu(weather.current.heatIndex, "unit.degree")}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.32)",
                marginTop: 4,
              }}
            >
              {t("health.heatIndex")}
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: 14,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: "#60a5fa",
                lineHeight: 1,
              }}
            >
              {nu(weather.current.humidity, "unit.percent")}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.32)",
                marginTop: 4,
              }}
            >
              {t("health.humidity")}
            </div>
          </div>
        </div>
        <div
          style={{
            background: "rgba(96,165,250,0.08)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 11,
            color: "#93c5fd",
            lineHeight: 1.6,
          }}
        >
          <AdviceLine text={td(weather.current.hydrationAdvice)} tone="hydration" />
        </div>
      </Card>
    </div>
  )
}

// ── Sun Arc Card — hybrid arc tracker (Design 2 structure × Design 3 visuals) ──

/** Parse a time string like "5:21 AM" or "6:14 PM" into minutes since midnight. */
function parseTimeToMinutes(timeStr: string): number {
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!m) return 0
  let h = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const period = m[3].toUpperCase()
  if (period === "PM" && h !== 12) h += 12
  if (period === "AM" && h === 12) h = 0
  return h * 60 + min
}

/** Format minutes difference as "Xh Ym" */
function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return `${h}h ${m}m`
}

/**
 * Get a point on quadratic bezier Q(P0, P1, P2) at parameter t ∈ [0,1].
 * Returns {x, y}.
 */
function quadBezierPoint(
  x0: number, y0: number,
  cx: number, cy: number,
  x1: number, y1: number,
  t: number
): { x: number; y: number } {
  const mt = 1 - t
  return {
    x: mt * mt * x0 + 2 * mt * t * cx + t * t * x1,
    y: mt * mt * y0 + 2 * mt * t * cy + t * t * y1,
  }
}

function SunArcCard({
  astronomy,
  theme,
}: {
  astronomy: DashboardWeatherData["astronomy"]
  theme?: "dark" | "light"
}) {
  const { t, td } = useTranslation()
  const [settings] = useSettings()
  const isLight = theme === "light"

  // Live wall-clock tick every 20 seconds
  const [, setTick] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setTick((v) => v + 1), 20_000)
    return () => window.clearInterval(timer)
  }, [])

  // Interactive scrubbing & simulation state
  const [scrubT, setScrubT] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  // Times
  const sunriseMin = parseTimeToMinutes(astronomy.sunrise)
  const sunsetMin = parseTimeToMinutes(astronomy.sunset)
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  // Real progress along day arc (0 = sunrise, 1 = sunset)
  const realProgress = (nowMin - sunriseMin) / Math.max(1, sunsetMin - sunriseMin)
  const activeProgress = scrubT !== null ? scrubT : realProgress
  const isDay = activeProgress >= 0 && activeProgress <= 1
  const isNight = !isDay

  // Day length
  const dayLengthMin = Math.max(0, sunsetMin - sunriseMin)
  const dayLength = formatDuration(dayLengthMin)

  // SVG Geometry - spacious coordinates with NO overlap
  const W = 320
  const H = 135
  const horizonY = 86
  const arcX0 = 44
  const arcX1 = 276
  const arcCtrlX = (arcX0 + arcX1) / 2 // 160
  const arcCtrlY = 16 // Apex height
  const nightCtrlY = horizonY + 28 // 114 (well inside H=135)

  // Sun position on day arc
  const tClamped = Math.max(0, Math.min(1, activeProgress))
  const sunPos = quadBezierPoint(arcX0, horizonY, arcCtrlX, arcCtrlY, arcX1, horizonY, tClamped)

  // Moon position on night arc
  const moonT = isNight
    ? activeProgress < 0
      ? Math.max(0, Math.min(1, 1 + activeProgress))
      : Math.max(0, Math.min(1, activeProgress - 1))
    : 0.5
  const moonPos = quadBezierPoint(arcX0, horizonY, arcCtrlX, nightCtrlY, arcX1, horizonY, moonT)

  // Active orb position (sun or moon)
  const activeOrbPos = isDay ? sunPos : moonPos

  // Simulated time string when scrubbing
  const displayMin = scrubT !== null
    ? Math.round(sunriseMin + scrubT * (sunsetMin - sunriseMin))
    : nowMin
  const normMin = ((displayMin % 1440) + 1440) % 1440
  const dHour24 = Math.floor(normMin / 60)
  const dMinute = normMin % 60
  const dPeriod = dHour24 >= 12 ? "PM" : "AM"
  const dHour12 = dHour24 % 12 || 12
  const timeString =
    settings.timeFormat === "24h"
      ? `${dHour24.toString().padStart(2, "0")}:${dMinute.toString().padStart(2, "0")}`
      : `${dHour12}:${dMinute.toString().padStart(2, "0")} ${dPeriod}`

  // Stage name
  const solarNoonDisplay = formatClockTimeStr(astronomy.solarNoon, settings.timeFormat)
  let stageLabel = t("forecast.solarNoon", { time: solarNoonDisplay })
  if (activeProgress < -0.05 || activeProgress > 1.05) stageLabel = t("forecast.stageNight")
  else if (activeProgress < 0.05) stageLabel = t("forecast.sunrise")
  else if (activeProgress < 0.25) stageLabel = t("forecast.stageMorning")
  else if (activeProgress < 0.45) stageLabel = t("forecast.stageMidday")
  else if (activeProgress <= 0.55) stageLabel = t("forecast.solarNoon", { time: solarNoonDisplay })
  else if (activeProgress < 0.8) stageLabel = t("forecast.stageAfternoon")
  else if (activeProgress <= 0.95) stageLabel = t("forecast.goldenHour")
  else if (activeProgress <= 1.05) stageLabel = t("forecast.sunset")

  // Sun elevation angle estimate
  const elevationDeg = isDay ? Math.round(Math.sin(tClamped * Math.PI) * 72) : 0

  // Pointer scrubbing logic
  const handlePointer = (clientX: number) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const relX = ((clientX - rect.left) / rect.width) * W
    const tVal = (relX - arcX0) / (arcX1 - arcX0)
    setScrubT(Math.max(-0.06, Math.min(1.06, tVal)))
  }

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    handlePointer(e.clientX)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.buttons > 0 || e.pointerType === "touch") {
      handlePointer(e.clientX)
    }
  }

  // Dynamic sky colors per time phase & theme
  type SkyPhase = { top: string; mid: string; bottom: string }
  function getSkyColors(): SkyPhase {
    if (isLight) {
      if (activeProgress < -0.05 || activeProgress > 1.05) {
        // Night in Light Mode: rich, celestial sapphire indigo (never dull muddy black!)
        return { top: "#0d1b38", mid: "#142850", bottom: "#223d6e" }
      }
      if (activeProgress < 0.08) {
        // Sunrise in Light Mode
        return { top: "#fed7aa", mid: "#fef08a", bottom: "#e0f2fe" }
      }
      if (activeProgress < 0.2) {
        // Early Morning in Light Mode
        return { top: "#bae6fd", mid: "#e0f2fe", bottom: "#fef3c7" }
      }
      if (activeProgress < 0.8) {
        // Radiant Day in Light Mode
        return { top: "#93c5fd", mid: "#c7dcfc", bottom: "#e0f2fe" }
      }
      if (activeProgress < 0.95) {
        // Golden Hour in Light Mode
        return { top: "#fdba74", mid: "#fef08a", bottom: "#fed7aa" }
      }
      // Sunset in Light Mode
      return { top: "#f472b6", mid: "#fed7aa", bottom: "#fef3c7" }
    } else {
      if (activeProgress < -0.05 || activeProgress > 1.05) {
        // Night in Dark Mode
        return { top: "#030712", mid: "#07122b", bottom: "#0f1d42" }
      }
      if (activeProgress < 0.08) {
        // Sunrise in Dark Mode
        return { top: "#1e0902", mid: "#5c1d04", bottom: "#8a2c08" }
      }
      if (activeProgress < 0.2) {
        // Early Morning in Dark Mode
        return { top: "#0a1936", mid: "#122a57", bottom: "#23497d" }
      }
      if (activeProgress < 0.8) {
        // Daytime in Dark Mode
        return { top: "#081b3d", mid: "#0f2e63", bottom: "#1a4687" }
      }
      if (activeProgress < 0.95) {
        // Golden Hour in Dark Mode
        return { top: "#240e02", mid: "#5a2704", bottom: "#7c3707" }
      }
      // Sunset in Dark Mode
      return { top: "#1a0814", mid: "#4a1228", bottom: "#6e1d2c" }
    }
  }

  // Dynamic ground colors per time phase & theme
  type GroundPhase = { top: string; bottom: string }
  function getGroundColors(): GroundPhase {
    if (isLight) {
      if (isNight) {
        // Night in Light Mode: deep, starry nocturnal floor so the moon glows with clear contrast
        return { top: "rgba(18, 36, 68, 0.88)", bottom: "rgba(10, 20, 42, 0.96)" }
      }
      if (activeProgress < 0.08) {
        // Sunrise ground
        return { top: "rgba(254, 240, 138, 0.55)", bottom: "rgba(224, 242, 254, 0.75)" }
      }
      if (activeProgress < 0.2) {
        // Morning ground
        return { top: "rgba(224, 242, 254, 0.8)", bottom: "rgba(190, 225, 252, 0.85)" }
      }
      if (activeProgress < 0.8) {
        // Daytime ground
        return { top: "rgba(215, 235, 252, 0.8)", bottom: "rgba(186, 220, 248, 0.88)" }
      }
      if (activeProgress <= 1.05) {
        // Golden hour / Sunset ground
        return { top: "rgba(254, 215, 170, 0.6)", bottom: "rgba(254, 243, 199, 0.75)" }
      }
      return { top: "rgba(18, 36, 68, 0.88)", bottom: "rgba(10, 20, 42, 0.96)" }
    } else {
      if (isNight) {
        return { top: "rgba(10, 18, 38, 0.82)", bottom: "rgba(3, 7, 18, 0.95)" }
      }
      return { top: "rgba(10, 18, 38, 0.75)", bottom: "rgba(3, 7, 18, 0.92)" }
    }
  }

  const sky = getSkyColors()
  const ground = getGroundColors()

  return (
    <div className="sun-arc-card sun-moon-card">
      {/* Top Header: Sunrise & Sunset high-contrast tiles */}
      <div className="sun-times-grid">
        <div className="sun-time-tile sunrise-tile">
          <div className="sun-time-icon sunrise-icon">
            <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
              <defs>
                <linearGradient id="sr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="60%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="17" r="6" fill="url(#sr-grad)" />
              <path d="M16 5v4M7.5 8.5l2.8 2.8M24.5 8.5l-2.8 2.8M5 18h3M24 18h3" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 24h26" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M16 14l-3 3h6l-3-3z" fill="#ffffff" opacity="0.9" />
            </svg>
          </div>
          <div className="sun-arc-time sunrise-val">
            {formatClockTimeStr(astronomy.sunrise, settings.timeFormat)}
          </div>
          <div className="sun-arc-label-sm">{t("forecast.sunrise")}</div>
        </div>

        <div className="sun-time-tile sunset-tile">
          <div className="sun-time-icon sunset-icon">
            <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
              <defs>
                <linearGradient id="ss-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fed7aa" />
                  <stop offset="50%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#dc2626" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="19" r="6" fill="url(#ss-grad)" />
              <path d="M16 7v3M7.5 10.5l2.8 2.8M24.5 10.5l-2.8 2.8M5 20h3M24 20h3" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
              <path d="M3 24h26" stroke="#f97316" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M16 22l-3-3h6l-3 3z" fill="#ffffff" opacity="0.9" />
            </svg>
          </div>
          <div className="sun-arc-time sunset-val">
            {formatClockTimeStr(astronomy.sunset, settings.timeFormat)}
          </div>
          <div className="sun-arc-label-sm">{t("forecast.sunset")}</div>
        </div>
      </div>

      {/* Interactive Controls Bar - only shown when scrubbing/simulating */}
      {scrubT !== null && (
        <div className="sun-arc-controls-bar">
          <div className="sun-arc-status-badge simulating">
            <span className="status-dot" />
            <span className="status-text">{`${timeString} · ${stageLabel}`}</span>
          </div>
          <button
            type="button"
            className="sun-arc-btn reset-btn"
            onClick={() => setScrubT(null)}
            aria-label={t("forecast.resetNow")}
          >
            <Icon name="reset" /> {t("forecast.resetNow")}
          </button>
        </div>
      )}

      {/* Main 3D / Interactive Arc SVG Stage */}
      <div className="sun-arc-stage" data-i18n-ignore="true">
        <svg
          ref={svgRef}
          className="sun-arc-svg"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          style={{ cursor: "grab", touchAction: "none" }}
          data-i18n-ignore="true"
        >
          <defs>
            {/* 3-stop dynamic sky gradient */}
            <linearGradient id="sarc-sky-dyn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sky.top} />
              <stop offset="55%" stopColor={sky.mid} />
              <stop offset="100%" stopColor={sky.bottom} />
            </linearGradient>

            {/* Underground gradient */}
            <linearGradient id="sarc-ground-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ground.top} />
              <stop offset="100%" stopColor={ground.bottom} />
            </linearGradient>

            {/* Arc glowing beam filter */}
            <filter id="sarc-arc-glow" x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Orb bloom filter */}
            <filter id="sarc-orb-bloom" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* 3D Sun radial gradient with specular core */}
            <radialGradient id="sarc-sun-grad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="25%" stopColor="#fef08a" />
              <stop offset="65%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </radialGradient>

            {/* Moon gradient */}
            <radialGradient id="sarc-moon-grad" cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#f8fafc" />
              <stop offset="70%" stopColor={isLight ? "#cbd5e1" : "#94a3b8"} />
              <stop offset="100%" stopColor={isLight ? "#94a3b8" : "#64748b"} />
            </radialGradient>

            {/* Drop shadow for floating tooltip */}
            <filter id="sarc-tooltip-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="rgba(0,0,0,0.3)" />
            </filter>
          </defs>

          {/* Sky background */}
          <rect x="0" y="0" width={W} height={H} fill="url(#sarc-sky-dyn)" rx="12" />

          {/* Twinkling stars (visible at night or during dark sky) */}
          {(isNight || !isLight) && (
            <g opacity={isNight ? (isLight ? 0.95 : 0.8) : 0.35}>
              <circle cx="35" cy="22" r="1.1" fill="#ffffff" opacity="0.9" />
              <circle cx="85" cy="15" r="0.9" fill="#fef08a" opacity="0.8" />
              <circle cx="140" cy="30" r="1.2" fill="#ffffff" opacity="0.85" />
              <circle cx="190" cy="18" r="0.9" fill="#bae6fd" opacity="0.75" />
              <circle cx="240" cy="26" r="1.1" fill="#ffffff" opacity="0.9" />
              <circle cx="285" cy="16" r="0.9" fill="#fef08a" opacity="0.75" />
            </g>
          )}

          {/* Underground area */}
          <rect x="0" y={horizonY} width={W} height={H - horizonY} fill="url(#sarc-ground-grad)" />

          {/* Horizon reference line */}
          <line
            x1="8"
            y1={horizonY}
            x2={W - 8}
            y2={horizonY}
            stroke={isNight ? (isLight ? "rgba(147, 197, 253, 0.45)" : "rgba(255, 255, 255, 0.2)") : (isLight ? "rgba(59, 130, 246, 0.32)" : "rgba(255, 255, 255, 0.16)")}
            strokeWidth="1.2"
            strokeDasharray="4 3"
          />

          {/* Left badge: EAST */}
          <g transform="translate(12, 72)">
            <rect
              width="28"
              height="11"
              rx="3.5"
              fill={isNight ? (isLight ? "rgba(15, 23, 42, 0.72)" : "rgba(15,23,42,0.7)") : (isLight ? "rgba(255,255,255,0.88)" : "rgba(15,23,42,0.7)")}
              stroke={isNight ? (isLight ? "rgba(251, 191, 36, 0.45)" : "rgba(255,255,255,0.12)") : (isLight ? "rgba(147,197,253,0.5)" : "rgba(255,255,255,0.12)")}
              strokeWidth="0.6"
            />
            <text
              x="14"
              y="8"
              textAnchor="middle"
              fontSize="6"
              fontWeight="700"
              letterSpacing="0.05em"
              fill={isNight ? "#fbbf24" : (isLight ? "#d97706" : "#fbbf24")}
            >
              {t("forecast.east")}
            </text>
          </g>

          {/* Right badge: HORIZON (placed completely outside curve to prevent overlap!) */}
          <g transform={`translate(${W - 52}, 72)`}>
            <rect
              width="42"
              height="11"
              rx="3.5"
              fill={isNight ? (isLight ? "rgba(15, 23, 42, 0.72)" : "rgba(15,23,42,0.7)") : (isLight ? "rgba(255,255,255,0.88)" : "rgba(15,23,42,0.7)")}
              stroke={isNight ? (isLight ? "rgba(147, 197, 253, 0.45)" : "rgba(255,255,255,0.12)") : (isLight ? "rgba(147,197,253,0.5)" : "rgba(255,255,255,0.12)")}
              strokeWidth="0.6"
            />
            <text
              x="21"
              y="8"
              textAnchor="middle"
              fontSize="6"
              fontWeight="700"
              letterSpacing="0.06em"
              fill={isNight ? "#93c5fd" : (isLight ? "#2563eb" : "#93c5fd")}
            >
              {t("forecast.horizon")}
            </text>
          </g>

          {/* Night dashed arc (for moon) */}
          <path
            d={`M${arcX0} ${horizonY} Q${arcCtrlX} ${nightCtrlY} ${arcX1} ${horizonY}`}
            fill="none"
            stroke={isNight ? (isLight ? "rgba(147, 197, 253, 0.55)" : "rgba(148, 163, 184, 0.35)") : (isLight ? "rgba(100, 116, 139, 0.25)" : "rgba(148, 163, 184, 0.2)")}
            strokeWidth="1.6"
            strokeDasharray="4 5"
          />

          {/* Day arc base track */}
          <path
            d={`M${arcX0} ${horizonY} Q${arcCtrlX} ${arcCtrlY} ${arcX1} ${horizonY}`}
            fill="none"
            stroke={isNight && isLight ? "rgba(251, 191, 36, 0.42)" : (isLight ? "rgba(245, 158, 11, 0.28)" : "rgba(251, 191, 36, 0.22)")}
            strokeWidth="2.5"
            strokeDasharray="5 5"
          />

          {/* Glowing trajectory traveled up to current sun position */}
          {isDay && (
            <path
              d={`M${arcX0} ${horizonY} Q${arcCtrlX} ${arcCtrlY} ${arcX1} ${horizonY}`}
              fill="none"
              stroke={isLight ? "#f59e0b" : "#fbbf24"}
              strokeWidth="3.2"
              strokeDasharray={`${tClamped * 260} 300`}
              strokeLinecap="round"
              filter="url(#sarc-arc-glow)"
            />
          )}

          {/* Sunrise drop marker */}
          <line x1={arcX0} y1={horizonY - 5} x2={arcX0} y2={horizonY + 12}
            stroke={isLight ? "#f59e0b" : "#fbbf24"} strokeWidth="1.4" strokeDasharray="2 2" opacity="0.75" />

          {/* Sunset drop marker */}
          <line x1={arcX1} y1={horizonY - 5} x2={arcX1} y2={horizonY + 12}
            stroke={isLight ? "#f97316" : "#fb923c"} strokeWidth="1.4" strokeDasharray="2 2" opacity="0.75" />

          {/* Zenith / Solar noon reference marker */}
          <circle cx={arcCtrlX} cy={arcCtrlY} r="2.5" fill={isLight ? "#f59e0b" : "#fbbf24"} opacity="0.6" />

          {/* 3D Sun Shadow projection on horizon */}
          {isDay && (
            <ellipse
              cx={sunPos.x}
              cy={horizonY + 3}
              rx={Math.max(6, 14 * (1 - (elevationDeg / 72) * 0.45))}
              ry={2.4}
              fill={isLight ? "rgba(30, 58, 138, 0.2)" : "rgba(0, 0, 0, 0.45)"}
            />
          )}

          {/* MOON (when active at night) */}
          {isNight && (
            <g transform={`translate(${moonPos.x}, ${moonPos.y})`}>
              <circle r="18" fill={isLight ? "rgba(190, 215, 255, 0.25)" : "rgba(180, 200, 255, 0.12)"} filter="url(#sarc-orb-bloom)" />
              <circle r="11" fill={isLight ? "rgba(224, 235, 255, 0.32)" : "rgba(180, 200, 255, 0.18)"} />
              <circle r="7.5" fill="url(#sarc-moon-grad)" />
              <circle cx="-2.5" cy="-2.5" r="2.2" fill="#ffffff" opacity="0.85" />
            </g>
          )}

          {/* SUN (interactive glowing 3D orb) */}
          {!isNight && (
            <g transform={`translate(${sunPos.x}, ${sunPos.y})`}>
              {/* Solar ambient bloom */}
              <circle r="22" fill={isLight ? "rgba(245, 158, 11, 0.18)" : "rgba(255, 200, 50, 0.14)"} filter="url(#sarc-orb-bloom)" />
              {/* Rotating corona rays */}
              <g className="sun-corona-rays">
                <line x1="0" y1="-12" x2="0" y2="-15" stroke={isLight ? "#f59e0b" : "#fde047"} strokeWidth="1.6" strokeLinecap="round" />
                <line x1="0" y1="12" x2="0" y2="15" stroke={isLight ? "#f59e0b" : "#fde047"} strokeWidth="1.6" strokeLinecap="round" />
                <line x1="-12" y1="0" x2="-15" y2="0" stroke={isLight ? "#f59e0b" : "#fde047"} strokeWidth="1.6" strokeLinecap="round" />
                <line x1="12" y1="0" x2="15" y2="0" stroke={isLight ? "#f59e0b" : "#fde047"} strokeWidth="1.6" strokeLinecap="round" />
                <line x1="-8.5" y1="-8.5" x2="-10.5" y2="-10.5" stroke={isLight ? "#f59e0b" : "#fde047"} strokeWidth="1.4" strokeLinecap="round" />
                <line x1="8.5" y1="8.5" x2="10.5" y2="10.5" stroke={isLight ? "#f59e0b" : "#fde047"} strokeWidth="1.4" strokeLinecap="round" />
                <line x1="-8.5" y1="8.5" x2="-10.5" y2="10.5" stroke={isLight ? "#f59e0b" : "#fde047"} strokeWidth="1.4" strokeLinecap="round" />
                <line x1="8.5" y1="-8.5" x2="10.5" y2="-10.5" stroke={isLight ? "#f59e0b" : "#fde047"} strokeWidth="1.4" strokeLinecap="round" />
              </g>
              {/* Mid corona halo */}
              <circle r="12" fill={isLight ? "rgba(245, 158, 11, 0.25)" : "rgba(251, 191, 36, 0.28)"} />
              {/* 3D Sun Sphere */}
              <circle r="8.5" fill="url(#sarc-sun-grad)" className="sun-arc-orb" />
              {/* Specular highlight */}
              <circle cx="-2.5" cy="-2.5" r="2.8" fill="#ffffff" opacity="0.8" />
            </g>
          )}

          {/* Interactive Floating Tooltip (follows active sun / moon position) */}
          <g
            transform={`translate(${Math.max(48, Math.min(W - 48, activeOrbPos.x))}, ${Math.max(14, activeOrbPos.y - 19)})`}
            filter="url(#sarc-tooltip-shadow)"
          >
            <rect
              x="-44"
              y="-13"
              width="88"
              height="16"
              rx="8"
              fill={isNight && isLight ? "rgba(15, 23, 42, 0.9)" : (isLight ? "rgba(255, 255, 255, 0.94)" : "rgba(15, 23, 42, 0.92)")}
              stroke={isNight && isLight ? "rgba(147, 197, 253, 0.6)" : (isLight ? "rgba(245, 158, 11, 0.55)" : "rgba(251, 191, 36, 0.55)")}
              strokeWidth="0.85"
            />
            <text
              x="0"
              y="-2"
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="800"
              fontFamily="system-ui, -apple-system, sans-serif"
              fill={isNight && isLight ? "#ffffff" : (isLight ? "#0f172a" : "#fef08a")}
            >
              {isDay ? `${timeString} · ${elevationDeg}°` : timeString}
            </text>
          </g>
        </svg>

        {/* User drag invitation hint */}
        <div className="sun-arc-prompt-hint">
          <span>{t("forecast.scrubPrompt")}</span>
        </div>

        {/* Bottom Timeline with icons */}
        <div className="sun-arc-timeline">
          <div className="timeline-item timeline-left">
            <span className="timeline-label">{astronomy.sunrise}</span>
          </div>
          <div className="timeline-item timeline-center">
            <span className="timeline-noon-pill">
              <Icon name="sun" /> {t("forecast.solarNoon", { time: astronomy.solarNoon })}
            </span>
          </div>
          <div className="timeline-item timeline-right">
            <span className="timeline-label">{astronomy.sunset}</span>
          </div>
        </div>
      </div>

      {/* Detail Tiles: Moon Phase · Golden Hour · Moonrise · Day Length */}
      <div className="sun-detail-grid">
        {/* 1. Moon Phase */}
        <div className="sun-detail-tile moon-detail-tile">
          <div className="sun-detail-icon moon-icon-badge">
            <svg viewBox="0 0 32 32" width="26" height="26" fill="none">
              <defs>
                <radialGradient id="moon-tile-grad" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#0f172a" />
                </radialGradient>
                <linearGradient id="cres-tile-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="60%" stopColor="#cbd5e1" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="12" fill="url(#moon-tile-grad)" />
              <circle cx="12" cy="14" r="2" fill="#1e293b" opacity="0.6" />
              <circle cx="15" cy="21" r="1.5" fill="#1e293b" opacity="0.6" />
              <path d="M16 4a12 12 0 0 1 12 12 12 12 0 0 1-12 12c4-3 6-7 6-12s-2-9-6-12z" fill="url(#cres-tile-grad)" />
              <path d="M22 8a10 10 0 0 1 4 8c0 3-1 6-3 8" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
            </svg>
          </div>
          <div className="sun-detail-val">{td(astronomy.moonPhase)}</div>
          <div className="sun-detail-lbl">{t("forecast.moonPhase")}</div>
        </div>

        {/* 2. Golden Hour */}
        <div className="sun-detail-tile golden-hour-tile">
          <div className="sun-detail-icon golden-icon-badge">
            <svg viewBox="0 0 32 32" width="26" height="26" fill="none">
              <defs>
                <radialGradient id="gh-tile-grad" cx="40%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#fffbeb" />
                  <stop offset="40%" stopColor="#fde047" />
                  <stop offset="80%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </radialGradient>
              </defs>
              <circle cx="16" cy="16" r="6" fill="url(#gh-tile-grad)" />
              <path d="M16 3v3M16 26v3M3 16h3M26 16h3M6.8 6.8l2.1 2.1M23.1 23.1l2.1 2.1M6.8 25.2l2.1-2.1M23.1 8.9l2.1-2.1" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M16 7l1 2 2-1-1 2 2 1-2 1 1 2-2-1-1 2-1-2-2 1 1-2-2-1 2-1-1-2 2 1z" fill="#fbbf24" opacity="0.8" />
            </svg>
          </div>
          <div className="sun-detail-val">{astronomy.goldenHour}</div>
          <div className="sun-detail-lbl">{t("forecast.goldenHour")}</div>
          <div className="golden-progress"><span /></div>
        </div>

        {/* 3. Moonrise */}
        <div className="sun-detail-tile moonrise-tile">
          <div className="sun-detail-icon moonrise-icon-badge">
            <svg viewBox="0 0 32 32" width="26" height="26" fill="none">
              <defs>
                <linearGradient id="mr-tile-arrow" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
              <path d="M19 6a9 9 0 1 0 7 13.5c-4.2 0-7.8-3.2-8.3-7.4A8.9 8.9 0 0 1 19 6z" fill="#93c5fd" />
              <line x1="4" y1="26" x2="28" y2="26" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2" />
              <path d="M10 23V11M6 15l4-4 4 4" stroke="url(#mr-tile-arrow)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="26" cy="8" r="1.5" fill="#e0f2fe" />
            </svg>
          </div>
          <div className="sun-detail-val">{astronomy.moonrise}</div>
          <div className="sun-detail-lbl">{t("forecast.moonrise")}</div>
        </div>

        {/* 4. Day Length */}
        <div className="sun-detail-tile day-length-tile">
          <div className="sun-detail-icon day-length-icon-badge">
            <svg viewBox="0 0 32 32" width="26" height="26" fill="none">
              <defs>
                <linearGradient id="dl-tile-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>
              <circle cx="16" cy="16" r="11" stroke="#34d399" strokeWidth="2" strokeDasharray="3 3" opacity="0.4" />
              <path d="M6 16a10 10 0 0 1 20 0" stroke="url(#dl-tile-grad)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="16" cy="6" r="2.2" fill="#fbbf24" />
              <circle cx="16" cy="16" r="2" fill="#10b981" />
              <path d="M16 16V10M16 16l4 2.5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div className="sun-detail-val">{dayLength}</div>
          <div className="sun-detail-lbl">{t("forecast.dayLength")}</div>
        </div>
      </div>
    </div>
  )
}

// ── Forecast Tab ───────────────────────────────────────────────────────────────

function ForecastTab({
  weather,
  theme = "light",
  onOpenMenu,
  menuOpen,
}: {
  weather: DashboardWeatherData
  theme?: "dark" | "light"
  onOpenMenu: () => void
  menuOpen: boolean
}) {
  const { t, td, n, nu } = useTranslation()
  const [settings] = useSettings()
  const rainfallHistory = weather.rainfall.history
  const maxRainfall = rainfallHistory
    ? Math.max(1, ...rainfallHistory.map((item) => item.value))
    : 1
  const hasMonthlyRainfall =
    weather.rainfall.month !== undefined &&
    weather.rainfall.monthlyAverage !== undefined
  const monthlyRainfallPercent =
    hasMonthlyRainfall && weather.rainfall.monthlyAverage! > 0
      ? (weather.rainfall.month! / weather.rainfall.monthlyAverage!) * 100
      : 0
  const monthlyRain =
    weather.rainfall.month !== undefined
      ? convertRain(weather.rainfall.month, settings.rainUnit)
      : null
  const monthlyAvg =
    weather.rainfall.monthlyAverage !== undefined
      ? convertRain(weather.rainfall.monthlyAverage, settings.rainUnit)
      : null
  const comfortColor = comfortTone(
    weather.comfort.label,
    weather.comfort.icon,
  ).color

  return (
    <div className="app-page forecast-screen">
      <AppHeader
        onOpenMenu={onOpenMenu}
        menuOpen={menuOpen}
      />
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "white",
          letterSpacing: "-0.03em",
          marginBottom: 18,
        }}
      >
        {t("forecast.title")}
      </div>

      {/* 7 Day */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>{t("forecast.next7")}</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {weather.daily.map((day, i) => (
            <div
              key={day.day}
              style={{
                background:
                  i === 0 ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  i === 0 ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.06)"
                }`,
                borderRadius: 16,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 44,
                  fontSize: 12,
                  fontWeight: 700,
                  color: i === 0 ? "#60a5fa" : "rgba(255,255,255,0.65)",
                }}
              >
                {td(day.day)}
              </div>
              <div
                style={{ display: "grid", placeItems: "center", fontSize: 22 }}
              >
                <WeatherIcon
                  conditionCode={day.conditionCode}
                  icon={day.icon}
                  label={td(day.condition)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 600,
                  }}
                >
                  {td(day.condition)}
                </div>
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 800,
                    color: "#60a5fa",
                    background: "rgba(96,165,250,0.1)",
                    borderRadius: 8,
                    padding: "1px 5px",
                    marginTop: 4,
                    display: "inline-block",
                  }}
                >
                  {t("forecast.rainChip", { chance: day.rainChance })}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.32)" }}>
                  {nu(convertTemperature(day.low, settings.temperatureUnit), "unit.degree")}
                </span>
                <div
                  style={{
                    width: 36,
                    height: 3,
                    borderRadius: 2,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${dailyTemperaturePercent(day, weather.daily)}%`,
                      height: "100%",
                      background: "linear-gradient(90deg,#60a5fa,#f59e0b)",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>
                  {nu(convertTemperature(day.high, settings.temperatureUnit), "unit.degree")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sun & Moon */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>{t("forecast.sunMoon")}</SectionLabel>
        <SunArcCard astronomy={weather.astronomy} theme={theme} />
      </div>

      {/* Monthly Rainfall */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>
          {t("forecast.rainfallSection", {
            month: td(weather.rainfall.monthLabel),
          })}
        </SectionLabel>
        <Card
          grad="linear-gradient(140deg,#1e3a5f 0%,#0a1830 100%)"
          border="rgba(96,165,250,0.08)"
          pad={20}
        >
          {hasMonthlyRainfall ? (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginBottom: 12,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 34,
                      fontWeight: 800,
                      color: "white",
                      lineHeight: 1,
                    }}
                  >
                    {n(monthlyRain ? monthlyRain.value : weather.rainfall.month)}{" "}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 400,
                        color: "rgba(255,255,255,0.35)",
                      }}
                    >
                      {monthlyRain ? td(monthlyRain.unit) : td(weather.rainfall.unit)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.32)",
                      marginTop: 4,
                    }}
                  >
                    {t("forecast.ofAverage", {
                      value: monthlyAvg ? monthlyAvg.value : (weather.rainfall.monthlyAverage ?? ""),
                      unit: monthlyAvg ? td(monthlyAvg.unit) : td(weather.rainfall.unit),
                      month: td(weather.rainfall.monthLabel),
                    })}
                  </div>
                </div>
                <div
                  style={{ fontSize: 11, color: "#60a5fa", fontWeight: 800 }}
                >
                  {nu(Math.round(monthlyRainfallPercent), "unit.percent")}
                </div>
              </div>
              <Bar
                pct={monthlyRainfallPercent}
                fill="linear-gradient(90deg,#60a5fa,#818cf8)"
                height={5}
              />
            </>
          ) : (
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
              {t("forecast.monthlyUnavailable")}
            </div>
          )}
          {rainfallHistory && (
            <div
              style={{
                display: "flex",
                gap: 4,
                alignItems: "flex-end",
                height: 60,
                marginTop: 16,
              }}
            >
              {rainfallHistory.map((item, i) => (
                <div
                  key={`${item.label}-${i}`}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      borderRadius: "3px 3px 0 0",
                      height: `${(item.value / maxRainfall) * 46}px`,
                      background:
                        i === rainfallHistory.length - 1
                          ? "#60a5fa"
                          : "rgba(96,165,250,0.22)",
                    }}
                  />
                  <div style={{ fontSize: 7, color: "rgba(255,255,255,0.22)" }}>
                    {td(item.label)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Comfort Index */}
      <SectionLabel>{t("forecast.comfortFeel")}</SectionLabel>
      <Card
        grad="linear-gradient(140deg,#2e1065 0%,#100522 100%)"
        border="rgba(167,139,250,0.08)"
        pad={20}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 46,
                fontWeight: 800,
                color: comfortColor,
                lineHeight: 1,
              }}
            >
              {n(weather.comfort.index)}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: comfortColor,
                marginTop: 5,
              }}
            >
              {td(weather.comfort.label)}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                marginTop: 2,
              }}
            >
              {t("forecast.comfortIndex")}
            </div>
          </div>
          {/* Centred on the 46px index line, not the whole text column. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: 46,
              flex: "0 0 auto",
            }}
          >
            <ComfortIndicator
              label={weather.comfort.label}
              icon={weather.comfort.icon}
            />
          </div>
        </div>
        {weather.comfort.factors.map((factor) => (
          <div key={factor.label} style={{ marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                {td(factor.label)}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>
                {td(factor.value)}
              </span>
            </div>
            <Bar pct={factor.percent} fill={factor.color} height={3} />
          </div>
        ))}
        <div
          style={{
            marginTop: 12,
            background: "rgba(167,139,250,0.06)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 11,
            color: "rgba(255,255,255,0.38)",
            lineHeight: 1.55,
          }}
        >
          <AdviceLine
            text={td(weather.comfort.advice)}
            tone={weather.comfort.adviceTone}
          />
        </div>
      </Card>
    </div>
  )
}

// ── Alerts Tab ─────────────────────────────────────────────────────────────────

function AlertsTab({
  weather,
  userLocation,
  theme = "light",
  onOpenMenu,
  menuOpen,
}: {
  weather: DashboardWeatherData
  userLocation?: UserLocation | null
  theme?: "dark" | "light"
  onOpenMenu: () => void
  menuOpen: boolean
}) {
  const { t, td, nu } = useTranslation()
  return (
    <div className="app-page alerts-screen">
      <AppHeader
        onOpenMenu={onOpenMenu}
        menuOpen={menuOpen}
      />
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: theme === "light" ? "#0f172a" : "white",
          letterSpacing: "-0.03em",
          marginBottom: 18,
        }}
      >
        {t("alerts.title")}
      </div>

      {/* Active Alerts */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>
          {t("alerts.active", { count: weather.alerts.length })}
        </SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {weather.alerts.map((a) => (
            <div
              key={a.title}
              style={{
                background: a.background,
                border: `1px solid ${a.borderColor}`,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", gap: 10 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: a.dotColor,
                    flexShrink: 0,
                    marginTop: 4,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: theme === "light" ? "#0f172a" : "white",
                      }}
                    >
                      {td(a.title)}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color:
                          theme === "light"
                            ? "#64748b"
                            : "rgba(255,255,255,0.28)",
                        marginLeft: 8,
                        flexShrink: 0,
                      }}
                    >
                      {td(a.time)}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color:
                        theme === "light"
                          ? "#334155"
                          : "rgba(255,255,255,0.52)",
                      lineHeight: 1.55,
                    }}
                  >
                    {td(a.body)}
                  </div>
                  <div
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      background: a.borderColor,
                      borderRadius: 8,
                      padding: "2px 8px",
                      fontSize: 8,
                      fontWeight: 900,
                      color: a.dotColor,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {t("alerts.badge", {
                      level: td(a.level).toUpperCase(),
                      source: td(a.source),
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Locations */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>{t("alerts.saved")}</SectionLabel>
        <TravelTilesGrid userLocation={userLocation ?? null} theme={theme} />
      </div>

      {/* Packing List */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>{t("alerts.packing")}</SectionLabel>
        <Card
          grad="linear-gradient(140deg,#1a3256 0%,#0d1a2e 100%)"
          border="rgba(96,165,250,0.08)"
          pad={16}
        >
          <div
            style={{
              fontSize: 11,
              color: "#60a5fa",
              fontWeight: 800,
              marginBottom: 14,
            }}
          >
            <span data-i18n-ignore>{td(weather.packing.title)}</span>
          </div>
          {weather.packing.items.map((p, i, arr) => (
            <div
              key={p.item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                paddingBottom: i < arr.length - 1 ? 12 : 0,
                marginBottom: i < arr.length - 1 ? 12 : 0,
                borderBottom:
                  i < arr.length - 1
                    ? "1px solid rgba(255,255,255,0.05)"
                    : "none",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  width: 30,
                  flexShrink: 0,
                  textAlign: "center",
                }}
              >
                <IconByName name={p.icon} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>
                  {td(p.item)}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.32)",
                    marginTop: 1,
                  }}
                >
                  {td(p.reason)}
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Seasonal event planner */}
      <SectionLabel>{td(weather.event.sectionLabel)}</SectionLabel>
      <Card
        grad="rgba(255,255,255,0.05)"
        border="rgba(255,255,255,0.08)"
        pad={16}
        className="event-planner-card"
      >
        {/* Top meta row: Category/Season pill on left, Countdown on right */}
        <div className="event-meta-row">
          <div className="event-category-pill">
            <IconByName name={weather.event.icon} />
            <span>{td(weather.event.expectedSeason)}</span>
          </div>
          <div className="event-countdown-pill">
            <span className="event-countdown-dot" />
            <span>{t("event.startsIn", { days: weather.event.daysAway })}</span>
          </div>
        </div>

        {/* Event identity: Full title and clean date range */}
        <div className="event-identity">
          <div className="event-title" data-i18n-ignore>
            {td(weather.event.title)}
          </div>
          <div className="event-dates" data-i18n-ignore>
            {td(weather.event.dateRange)}
          </div>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="event-metrics-grid">
          <div className="event-metric-tile">
            <div className="event-metric-eyebrow">
              <Icon name="temperature" size={12} className="event-metric-icon" />
              <span>{t("event.expectedTemp")}</span>
            </div>
            <div className="event-metric-val">
              {weather.event.expectedTemperature}°
            </div>
            <div className="event-metric-caption">
              {t("event.avgTemp", { value: weather.event.expectedTemperature })}
            </div>
          </div>

          <div className="event-metric-tile">
            <div className="event-metric-eyebrow">
              <Icon name="rain" size={12} className="event-metric-icon" />
              <span>{t("event.precipitation")}</span>
            </div>
            <div className="event-metric-val">
              {td(weather.event.rainLabel)}
            </div>
            <div className="event-metric-caption">
              {t("event.rainChance", { chance: weather.event.rainChance })}
            </div>
          </div>
        </div>

        {/* Actionable recommendation callout: clean, straight to the point */}
        <div className="event-callout">
          <div className="event-callout-header">
            <span>{t("event.recommendation")}</span>
          </div>
          <div className="event-callout-text">
            {td(weather.event.advice).replace(/💡/g, "").trim()}
          </div>
        </div>
      </Card>
    </div>
  )
}

// ── Personal setup ─────────────────────────────────────────────────────────────

type SetupStep = "welcome" | "name" | "body" | "sensitivities" | "routine"
export type ProfileGender = "Female" | "Male" | "Non-binary" | "Prefer not to say"

export type UserPersonaId =
  | "health"
  | "fitness"
  | "beach"
  | "travel"
  | "family"
  | "garden"
  | "commute"
  | "event"

export interface UserPersona {
  id: UserPersonaId
  title: string
  shortTitle: string
  icon: IconName
  accentColor: string
  gradient: string
  tagline: string
  description: string
  highlights: string[]
  defaultSensitivities: string[]
  defaultConcerns: string[]
  defaultGoals: string[]
  defaultActivity: string
}

export const USER_PERSONAS: UserPersona[] = [
  {
    id: "health",
    title: "Health-conscious",
    shortTitle: "Health",
    icon: "leaf",
    accentColor: "#10b981",
    gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.25), rgba(6, 95, 70, 0.15))",
    tagline: "Allergy, asthma & skin shield",
    description: "Highlight Air Quality Index (AQI), pollen count, UV index, and humidity levels to help manage allergies, asthma, or sensitive skin.",
    highlights: ["Air Quality (AQI)", "Pollen & Allergens", "UV & Skin Index", "Humidity Levels"],
    defaultSensitivities: ["AQI / smoke", "Pollen", "Humidity", "UV / sun"],
    defaultConcerns: ["Asthma", "Allergies", "Skin sensitivity"],
    defaultGoals: ["Daily energy", "Outdoor plans"],
    defaultActivity: "Moderate",
  },
  {
    id: "fitness",
    title: "Outdoor fitness enthusiasts",
    shortTitle: "Fitness",
    icon: "bolt",
    accentColor: "#f59e0b",
    gradient: "linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(180, 83, 9, 0.15))",
    tagline: "Best running hours & thermal stamina",
    description: "Focus on sunrise/sunset times, 'best running hours', wind speed, and heat alerts for optimal athletic performance.",
    highlights: ["Best Running Hours", "Sunrise / Sunset", "Wind & Gusts", "Heat Alerts"],
    defaultSensitivities: ["Heat", "AQI / smoke", "UV / sun"],
    defaultConcerns: ["None of these"],
    defaultGoals: ["Fitness", "Outdoor plans"],
    defaultActivity: "High",
  },
  {
    id: "beach",
    title: "Beachgoers & surfers",
    shortTitle: "Beach & Surf",
    icon: "waves",
    accentColor: "#06b6d4",
    gradient: "linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(14, 116, 144, 0.15))",
    tagline: "Sea conditions, swell & tide timings",
    description: "Provide sea conditions, tide timings, wave height, and water temperature for optimal coastal planning.",
    highlights: ["Sea Conditions", "Tide Timings", "Wave Height", "Water Temperature"],
    defaultSensitivities: ["UV / sun", "Heat", "Monsoon damp"],
    defaultConcerns: ["None of these"],
    defaultGoals: ["Outdoor plans", "Fitness"],
    defaultActivity: "High",
  },
  {
    id: "travel",
    title: "Travelers",
    shortTitle: "Travelers",
    icon: "plane",
    accentColor: "#8b5cf6",
    gradient: "linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(109, 40, 217, 0.15))",
    tagline: "Saved destinations & transit alerts",
    description: "Offer quick access to saved destinations, severe weather alerts for flights, and packing suggestions based on forecasts.",
    highlights: ["Flight Weather Alerts", "Packing Suggestions", "Saved Destinations", "Severe Weather"],
    defaultSensitivities: ["Cold", "AQI / smoke"],
    defaultConcerns: ["None of these"],
    defaultGoals: ["Travel", "Daily energy"],
    defaultActivity: "Moderate",
  },
  {
    id: "family",
    title: "Parents & families",
    shortTitle: "Parents & Families",
    icon: "home",
    accentColor: "#ec4899",
    gradient: "linear-gradient(135deg, rgba(236, 72, 153, 0.25), rgba(190, 24, 93, 0.15))",
    tagline: "School commute & daily routine safety",
    description: "Focus on school commute conditions, rain alerts, and severe weather warnings to plan daily routines safely.",
    highlights: ["School Commute", "Rain Alerts", "Severe Warnings", "Kids Comfort Index"],
    defaultSensitivities: ["AQI / smoke", "Cold", "Heat"],
    defaultConcerns: ["Allergies"],
    defaultGoals: ["Family care", "Daily energy"],
    defaultActivity: "Moderate",
  },
  {
    id: "garden",
    title: "Agriculture & gardeners",
    shortTitle: "Agri & Gardeners",
    icon: "sprout",
    accentColor: "#22c55e",
    gradient: "linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(21, 128, 61, 0.15))",
    tagline: "Soil moisture & seasonal planting",
    description: "Provide soil moisture, rainfall predictions, frost alerts, and seasonal planting guidance.",
    highlights: ["Soil Moisture", "Rain Predictions", "Frost Alerts", "Planting Guidance"],
    defaultSensitivities: ["Monsoon damp", "Cold", "Heat"],
    defaultConcerns: ["None of these"],
    defaultGoals: ["Outdoor plans", "Daily energy"],
    defaultActivity: "Moderate",
  },
  {
    id: "commute",
    title: "Commuters",
    shortTitle: "Commuters",
    icon: "car",
    accentColor: "#3b82f6",
    gradient: "linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(29, 78, 216, 0.15))",
    tagline: "Visibility, traffic flow & storm alerts",
    description: "Integrate weather with traffic updates, visibility conditions (fog/smog), and alerts for sudden storms affecting travel.",
    highlights: ["Fog & Smog Visibility", "Traffic Weather", "Storm Alerts", "Commute Timing"],
    defaultSensitivities: ["AQI / smoke", "Monsoon damp"],
    defaultConcerns: ["None of these"],
    defaultGoals: ["Daily energy", "Travel"],
    defaultActivity: "Moderate",
  },
  {
    id: "event",
    title: "Event planners",
    shortTitle: "Event Planners",
    icon: "party",
    accentColor: "#f43f5e",
    gradient: "linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(190, 18, 60, 0.15))",
    tagline: "Extended forecasts & comfort index",
    description: "Extended forecasts, probability of rain, and 'comfort index' for organizing outdoor gatherings or weddings.",
    highlights: ["14-Day Outlook", "Rain Probability", "Comfort Index", "Outdoor Gatherings"],
    defaultSensitivities: ["Monsoon damp", "Heat", "Humidity"],
    defaultConcerns: ["None of these"],
    defaultGoals: ["Outdoor plans", "Daily energy"],
    defaultActivity: "Moderate",
  },
]

export function getPersonaById(id?: string): UserPersona | undefined {
  if (!id) return undefined
  return USER_PERSONAS.find((p) => p.id === id)
}

export type Profile = {
  dob?: string
  gender?: ProfileGender
  name: string
  sensitivities: string[]
  concerns: string[]
  goals: string[]
  age: number
  height?: number
  weight?: number
  activity: string
  persona?: UserPersonaId
}

export function calculateAge(dobStr?: string): number {
  if (!dobStr) return 29
  const parts = dobStr.split("-")
  if (parts.length < 3) return 29
  const y = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10) - 1
  const d = parseInt(parts[2], 10)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return 29
  const birth = new Date(y, m, d)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return Math.max(13, Math.min(100, age))
}
type PersonalizationVariant = "skin-sun" | "uv-heat" | "uv-sun" | "air-quality" | "cold" | "general"
export type { PersonalizedIcon }
export type PersonalizedTone = "blue" | "amber" | "green" | "violet" | "rose"
export type PersonalizedTile = {
  icon: PersonalizedIcon
  title: string
  value: string
  detail: string
  tone: PersonalizedTone
}
export type PersonalizedRecommendation = {
  icon: PersonalizedIcon
  title: string
  reason: string
}
export type PersonalizedFactor = { label: string; value: string }
export type PersonalizedWeather = {
  variant: PersonalizationVariant
  headline: string
  overview: string
  windowLabel: string
  window: string
  basis: string
  tiles: PersonalizedTile[]
  recommendations: PersonalizedRecommendation[]
  factors: PersonalizedFactor[]
  disclaimer?: string
}

const SETUP_STEPS: SetupStep[] = [
  "welcome",
  "name",
  "body",
  "sensitivities",
  "routine",
]

const choiceSets = {
  sensitivities: [
    "Dust",
    "Pollen",
    "AQI / smoke",
    "Humidity",
    "Heat",
    "Monsoon damp",
    "Cold",
    "UV / sun",
  ],
  concerns: [
    "Asthma",
    "Allergies",
    "Migraine",
    "Skin sensitivity",
    "Heart health",
    "None of these",
  ],
  goals: [
    "Daily energy",
    "Outdoor plans",
    "Fitness",
    "Sleep",
    "Travel",
    "Family care",
  ],
}

const PROFILE_STORAGE_KEY = "mausam-profile"

function resetOnboardingPreviewIfRequested(): void {
  if (!import.meta.env.DEV || typeof window === "undefined") return
  const url = new URL(window.location.href)
  if (url.searchParams.get("preview") !== "onboarding") return

  localStorage.removeItem(PROFILE_STORAGE_KEY)
  localStorage.removeItem("mausam-theme")
  clearStoredLocation()
  url.searchParams.delete("preview")
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  )
}

const PERSONALIZED_VARIANTS: Record<PersonalizationVariant, Omit<PersonalizedWeather, "variant">> =
  {
    "skin-sun": {
      headline: "Plan around the strongest midday sun.",
      overview:
        "Strong UV exposure is expected around midday. Since you marked skin sensitivity, your better outdoor window is earlier in the morning or later in the day. Keep sun protection in mind during peak exposure.",
      windowLabel: "Lower exposure",
      window: "Before 9 AM or after 5 PM",
      basis: "Skin sensitivity + UV / sun",
      factors: [
        { label: "UV", value: "8 · High" },
        { label: "Humidity", value: "72%" },
        { label: "Temperature", value: "31°C" },
      ],
      tiles: [
        {
          icon: "shield",
          title: "Skin & Sun",
          value: "UV 8 · High",
          detail: "Extra care around midday",
          tone: "rose",
        },
        {
          icon: "sun",
          title: "Exposure",
          value: "Peak 12–2 PM",
          detail: "Strongest UV period",
          tone: "amber",
        },
        {
          icon: "outdoor",
          title: "Safer window",
          value: "Before 9 AM",
          detail: "Or return after 5 PM",
          tone: "green",
        },
        {
          icon: "evening",
          title: "Evening",
          value: "Lower UV",
          detail: "Exposure eases near sunset",
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: "Finish outdoor plans before 9 AM",
          reason: "UV exposure rises quickly later in the morning.",
        },
        {
          icon: "shield",
          title: "Keep sun protection nearby",
          reason: "Midday UV is the strongest factor in your briefing.",
        },
        {
          icon: "evening",
          title: "Choose the evening for a longer walk",
          reason: "Exposure falls and conditions feel calmer after 5 PM.",
        },
      ],
      disclaimer: "Weather guidance only — not medical advice.",
    },
    "uv-heat": {
      headline: "A bright, hot day needs an earlier start.",
      overview:
        "Today will feel hot and bright in Kolkata. UV levels will become very high around midday, while temperatures peak in the afternoon. Your better outdoor window is before 10 AM or after 5 PM.",
      windowLabel: "Best outdoor window",
      window: "6:00 AM – 9:30 AM",
      basis: "UV / sun + Heat",
      factors: [
        { label: "UV", value: "8" },
        { label: "Heat", value: "High" },
        { label: "Outdoor risk", value: "Moderate" },
      ],
      tiles: [
        {
          icon: "sun",
          title: "UV & Heat",
          value: "UV 8 · High",
          detail: "Peak around 12–2 PM",
          tone: "amber",
        },
        {
          icon: "outdoor",
          title: "Outdoor",
          value: "Best time to move",
          detail: "6–9:30 AM",
          tone: "green",
        },
        {
          icon: "comfort",
          title: "Comfort",
          value: "Feels like 36°C",
          detail: "Heat stress · Moderate",
          tone: "rose",
        },
        {
          icon: "sun",
          title: "Sun",
          value: "Sunrise 5:42 AM",
          detail: "Sunset 6:14 PM",
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: "Go for your walk before 9:30 AM",
          reason: "UV and heat will increase after that.",
        },
        {
          icon: "comfort",
          title: "Keep the afternoon lighter",
          reason: "It may feel close to 36°C at peak heat.",
        },
        {
          icon: "evening",
          title: "Evening is your second-best window",
          reason: "Sun and heat both ease after 5 PM.",
        },
      ],
    },
    "uv-sun": {
      headline: "Strong sun, with a softer evening window.",
      overview:
        "Strong sunshine is expected today, with UV reaching very high levels around midday. Outdoor plans will be more comfortable earlier in the morning or toward sunset.",
      windowLabel: "Better outdoor light",
      window: "5:30 PM – 6:15 PM",
      basis: "UV / sun",
      factors: [
        { label: "UV", value: "8 · Very high" },
        { label: "Sunrise", value: "5:42 AM" },
        { label: "Sunset", value: "6:14 PM" },
      ],
      tiles: [
        {
          icon: "sun",
          title: "UV",
          value: "8 · Very High",
          detail: "Peak exposure at midday",
          tone: "amber",
        },
        {
          icon: "evening",
          title: "Sun",
          value: "Golden hour",
          detail: "Around 5:30 PM",
          tone: "violet",
        },
        {
          icon: "outdoor",
          title: "Outdoors",
          value: "Better after 5 PM",
          detail: "Or early this morning",
          tone: "green",
        },
        {
          icon: "shield",
          title: "Sun protection",
          value: "Peak 12–2 PM",
          detail: "Plan around this window",
          tone: "rose",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: "Move longer plans toward 5 PM",
          reason: "Sunlight softens as the peak UV window ends.",
        },
        {
          icon: "shield",
          title: "Plan protection for midday",
          reason: "UV is expected to reach very high levels.",
        },
        {
          icon: "evening",
          title: "Use the golden-hour window",
          reason: "5:30–6:15 PM offers gentler outdoor light.",
        },
      ],
    },
    cold: {
      headline: "Comfortable by day, cooler at the edges.",
      overview:
        "Temperatures will remain comfortable during the day but become noticeably cooler after sunset. If you are heading outside early or late, an extra layer will make the evening more comfortable.",
      windowLabel: "Most comfortable",
      window: "10 AM – 5 PM",
      basis: "Cold sensitivity",
      factors: [
        { label: "Morning", value: "19°C" },
        { label: "Day", value: "27°C" },
        { label: "Night", value: "21°C" },
      ],
      tiles: [
        {
          icon: "cold",
          title: "Cold",
          value: "19°C this morning",
          detail: "Coolest part of the day",
          tone: "blue",
        },
        {
          icon: "comfort",
          title: "Comfort",
          value: "Extra layer",
          detail: "Useful early and late",
          tone: "green",
        },
        {
          icon: "temperature",
          title: "Temperature",
          value: "27°C peak",
          detail: "Comfortable by afternoon",
          tone: "amber",
        },
        {
          icon: "evening",
          title: "Evening",
          value: "21°C after sunset",
          detail: "Cooling gradually",
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: "Use 10 AM–5 PM for outdoor plans",
          reason: "That is the most comfortable temperature window.",
        },
        {
          icon: "cold",
          title: "Carry a light extra layer",
          reason: "Early morning and evening will feel noticeably cooler.",
        },
        {
          icon: "evening",
          title: "Expect a cooler return home",
          reason: "Temperatures fall toward 21°C after sunset.",
        },
      ],
    },
    "air-quality": {
      headline: "Air quality is today’s main signal.",
      overview:
        "Air quality is the main thing to watch today. AQI is currently elevated and may remain poor through the afternoon. Consider indoor exercise and limit prolonged outdoor exposure during peak pollution.",
      windowLabel: "Better outdoor window",
      window: "After 7 PM",
      basis: "AQI / smoke sensitivity",
      factors: [
        { label: "AQI", value: "164 · Elevated" },
        { label: "PM2.5", value: "Elevated" },
        { label: "Visibility", value: "3.2 km" },
      ],
      tiles: [
        {
          icon: "air",
          title: "Air quality",
          value: "AQI 164",
          detail: "Unhealthy conditions",
          tone: "rose",
        },
        {
          icon: "air",
          title: "Pollution",
          value: "PM2.5 elevated",
          detail: "Main air-quality factor",
          tone: "amber",
        },
        {
          icon: "indoor",
          title: "Indoor",
          value: "Better for exercise",
          detail: "Especially this afternoon",
          tone: "green",
        },
        {
          icon: "evening",
          title: "Cleaner window",
          value: "After 7 PM",
          detail: "Conditions may begin easing",
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "indoor",
          title: "Move exercise indoors today",
          reason: "AQI and PM2.5 are elevated through the afternoon.",
        },
        {
          icon: "outdoor",
          title: "Keep outdoor exposure shorter",
          reason: "Poor air and reduced visibility are the main concerns.",
        },
        {
          icon: "evening",
          title: "Recheck conditions after 7 PM",
          reason: "That is the better potential outdoor window.",
        },
      ],
      disclaimer: "This is environmental guidance, not a medical diagnosis.",
    },
    general: {
      headline: "Warm, humid, with rain worth planning around.",
      overview:
        "Today looks warm with periods of rain. Conditions are generally comfortable, but humidity will rise through the afternoon. Keep an umbrella nearby if you’ll be out later.",
      windowLabel: "Best overall window",
      window: "8 AM – 11 AM",
      basis: "Today’s Kolkata conditions",
      factors: [
        { label: "Temperature", value: "31°C" },
        { label: "Rain", value: "68%" },
        { label: "Humidity", value: "82%" },
        { label: "Wind", value: "22 km/h SW" },
      ],
      tiles: [
        {
          icon: "rain",
          title: "Rain",
          value: "68% chance",
          detail: "Possible after 4 PM",
          tone: "blue",
        },
        {
          icon: "comfort",
          title: "Comfort",
          value: "Feels like 35°C",
          detail: "Humidity rises later",
          tone: "rose",
        },
        {
          icon: "wind",
          title: "Wind",
          value: "22 km/h SW",
          detail: "Steady through the day",
          tone: "green",
        },
        {
          icon: "evening",
          title: "Sun",
          value: "Sunset 6:14 PM",
          detail: "Cloudy evening light",
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: "Use 8–11 AM for outdoor plans",
          reason: "It is the best overall balance of heat and rain.",
        },
        {
          icon: "rain",
          title: "Keep an umbrella nearby",
          reason: "Rain probability rises after 4 PM.",
        },
        {
          icon: "comfort",
          title: "Expect a more humid afternoon",
          reason: "It may feel warmer even if temperature holds steady.",
        },
      ],
    },
  }

const PERSONALIZATION_PRIORITY: Array<{
  variant: PersonalizationVariant
  matches: (profile: Profile) => boolean
}> = [
  {
    variant: "skin-sun",
    matches: (profile) =>
      profile.concerns.includes("Skin sensitivity") &&
      profile.sensitivities.includes("UV / sun"),
  },
  {
    variant: "uv-heat",
    matches: (profile) =>
      profile.sensitivities.includes("UV / sun") &&
      profile.sensitivities.includes("Heat"),
  },
  {
    variant: "uv-sun",
    matches: (profile) => profile.sensitivities.includes("UV / sun"),
  },
  {
    variant: "air-quality",
    matches: (profile) => profile.sensitivities.includes("AQI / smoke"),
  },
  {
    variant: "cold",
    matches: (profile) => profile.sensitivities.includes("Cold"),
  },
  { variant: "general", matches: () => true },
]

/**
 * Builds the local, deterministic briefing.
 *
 * Every sentence here interpolates a live reading, so none of them can be
 * translated by dictionary lookup after the fact. The caller passes its
 * translator in and the copy is composed in the active language from the
 * outset; `td` covers the API vocabulary (conditions, AQI bands) mixed in.
 */
export function getPersonalizedWeather(
  profile: Profile,
  weather: DashboardWeatherData = DEMO_WEATHER_DATA,
  translator: Pick<Translator, "t" | "td"> = {
    t: (key, values) => translate(DEFAULT_LANGUAGE, key, values),
    td: ((value: string | undefined) => value) as Translator["td"],
  },
): PersonalizedWeather {
  const { t, td } = translator
  let variant =
    PERSONALIZATION_PRIORITY.find((rule) => rule.matches(profile))?.variant ??
    "general"
  // airQuality can be genuinely absent (provider unavailable — see
  // weatherData.ts) rather than always demo-filled; the air-quality
  // variant needs real data to be meaningful, so fall through to general.
  if (variant === "air-quality" && !weather.airQuality) variant = "general"
  const base = PERSONALIZED_VARIANTS[variant]
  const { current, airQuality, uv, rainfall, running, astronomy } = weather
  const primaryPollutant = airQuality?.pollutants[0]
  const temperatureRange = t("gen.tempRange", {
    low: current.low,
    high: current.high,
  })
  const outdoorWindow = running.start
    ? running.dayLabel
      ? t("gen.windowOnDay", {
          day: td(running.dayLabel),
          start: running.start,
          end: running.end,
        })
      : t("gen.window", { start: running.start, end: running.end })
    : t("gen.noWindow")
  const condition = td(current.condition)
  const uvLabel = td(uv.label)
  const peakHours = td(uv.peakHours)
  const runningSummary = td(running.summary)
  const windValue = t("gen.windValue", {
    value: current.windSpeed,
    direction: td(current.windDirection),
  })
  const periodLower = td(rainfall.periodLabel).toLowerCase()

  if (variant === "skin-sun") {
    return {
      variant,
      ...base,
      headline: t("gen.headline.skinSun", { label: uvLabel }),
      overview: t("gen.overview.skinSun", {
        condition,
        temperature: current.temperature,
        uv: uv.index,
        peak: peakHours,
      }),
      window: outdoorWindow,
      factors: [
        {
          label: t("gen.label.uv"),
          value: t("gen.indexWithLabel", { index: uv.index, label: uvLabel }),
        },
        {
          label: t("gen.label.humidity"),
          value: t("gen.percent", { value: current.humidity }),
        },
        {
          label: t("gen.label.temperature"),
          value: t("gen.degC", { value: current.temperature }),
        },
      ],
      tiles: [
        {
          icon: "shield",
          title: t("gen.tile.skinSun"),
          value: t("gen.uvWithLabel", { index: uv.index, label: uvLabel }),
          detail: td(uv.recommendation),
          tone: "rose",
        },
        {
          icon: "sun",
          title: t("gen.tile.exposure"),
          value: t("gen.peak", { hours: peakHours }),
          detail: t("gen.burnTime", { value: td(uv.burnTime) }),
          tone: "amber",
        },
        {
          icon: "outdoor",
          title: t("gen.tile.saferWindow"),
          value: outdoorWindow,
          detail: runningSummary,
          tone: "green",
        },
        {
          icon: "evening",
          title: t("gen.tile.evening"),
          value: astronomy.goldenHour,
          detail: t("gen.sunsetAt", { time: astronomy.sunset }),
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: t("gen.rec.useWindow", { window: outdoorWindow }),
          reason: runningSummary,
        },
        {
          icon: "shield",
          title: td(uv.recommendation),
          reason: t("gen.rec.uvToday", { index: uv.index, label: uvLabel }),
        },
        {
          icon: "evening",
          title: t("gen.rec.calmerEvening"),
          reason: t("gen.rec.goldenBegins", { time: astronomy.goldenHour }),
        },
      ],
    }
  }

  if (variant === "uv-heat") {
    return {
      variant,
      ...base,
      headline: t("gen.headline.uvHeat", { condition }),
      overview: t("gen.overview.uvHeat", {
        temperature: current.temperature,
        feels: current.feelsLike,
        uv: uv.index,
        label: uvLabel,
        peak: peakHours,
        window: outdoorWindow,
      }),
      window: outdoorWindow,
      factors: [
        {
          label: t("gen.label.uv"),
          value: t("gen.indexWithLabel", { index: uv.index, label: uvLabel }),
        },
        {
          label: t("gen.label.feelsLike"),
          value: t("gen.degC", { value: current.feelsLike }),
        },
        {
          label: t("gen.label.humidity"),
          value: t("gen.percent", { value: current.humidity }),
        },
      ],
      tiles: [
        {
          icon: "sun",
          title: t("gen.tile.uvHeat"),
          value: t("gen.uvWithLabel", { index: uv.index, label: uvLabel }),
          detail: t("gen.peak", { hours: peakHours }),
          tone: "amber",
        },
        {
          icon: "outdoor",
          title: t("gen.tile.outdoor"),
          value: outdoorWindow,
          detail: runningSummary,
          tone: "green",
        },
        {
          icon: "comfort",
          title: t("gen.tile.comfort"),
          value: t("gen.feelsAt", { value: current.feelsLike }),
          detail: t("gen.heatIndexAt", { value: current.heatIndex }),
          tone: "rose",
        },
        {
          icon: "sun",
          title: t("gen.tile.sun"),
          value: t("gen.sunriseAt", { time: astronomy.sunrise }),
          detail: t("gen.sunsetAt", { time: astronomy.sunset }),
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: t("gen.rec.useWindowLonger", { window: outdoorWindow }),
          reason: runningSummary,
        },
        {
          icon: "comfort",
          title: t("gen.rec.peakHeatLighter"),
          reason: t("gen.rec.feelClose", { value: current.feelsLike }),
        },
        {
          icon: "shield",
          title: td(uv.recommendation),
          reason: t("gen.rec.peakExposure", { hours: peakHours }),
        },
      ],
    }
  }

  if (variant === "uv-sun") {
    return {
      variant,
      ...base,
      headline: t("gen.headline.uvSun", { label: uvLabel }),
      overview: t("gen.overview.uvSun", {
        condition,
        uv: uv.index,
        peak: peakHours,
        window: outdoorWindow,
      }),
      window: outdoorWindow,
      factors: [
        {
          label: t("gen.label.uv"),
          value: t("gen.indexWithLabel", { index: uv.index, label: uvLabel }),
        },
        { label: t("gen.label.sunrise"), value: astronomy.sunrise },
        { label: t("gen.label.sunset"), value: astronomy.sunset },
      ],
      tiles: [
        {
          icon: "sun",
          title: t("gen.label.uv"),
          value: t("gen.indexWithLabel", { index: uv.index, label: uvLabel }),
          detail: t("gen.peak", { hours: peakHours }),
          tone: "amber",
        },
        {
          icon: "evening",
          title: t("gen.tile.sun"),
          value: astronomy.goldenHour,
          detail: t("gen.sunsetAt", { time: astronomy.sunset }),
          tone: "violet",
        },
        {
          icon: "outdoor",
          title: t("gen.tile.outdoors"),
          value: outdoorWindow,
          detail: runningSummary,
          tone: "green",
        },
        {
          icon: "shield",
          title: t("gen.tile.sunProtection"),
          value: td(uv.recommendation),
          detail: t("gen.burnTime", { value: td(uv.burnTime) }),
          tone: "rose",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: t("gen.rec.planActivity", { window: outdoorWindow }),
          reason: runningSummary,
        },
        {
          icon: "shield",
          title: td(uv.recommendation),
          reason: t("gen.rec.uvReach", { index: uv.index }),
        },
        {
          icon: "evening",
          title: t("gen.rec.goldenWindow"),
          reason: t("gen.rec.gentlerLight", { time: astronomy.goldenHour }),
        },
      ],
    }
  }

  if (variant === "cold") {
    return {
      variant,
      ...base,
      headline: t("gen.headline.cold", { condition, range: temperatureRange }),
      overview: t("gen.overview.cold", {
        temperature: current.temperature,
        low: current.low,
        window: outdoorWindow,
      }),
      window: outdoorWindow,
      factors: [
        {
          label: t("gen.label.low"),
          value: t("gen.degC", { value: current.low }),
        },
        {
          label: t("gen.label.now"),
          value: t("gen.degC", { value: current.temperature }),
        },
        {
          label: t("gen.label.high"),
          value: t("gen.degC", { value: current.high }),
        },
      ],
      tiles: [
        {
          icon: "cold",
          title: t("gen.tile.cold"),
          value: t("gen.lowDeg", { value: current.low }),
          detail: t("gen.detail.coolest"),
          tone: "blue",
        },
        {
          icon: "comfort",
          title: t("gen.tile.comfort"),
          value: t("gen.feelDeg", { value: current.feelsLike }),
          detail: td(weather.comfort.label),
          tone: "green",
        },
        {
          icon: "temperature",
          title: t("gen.label.temperature"),
          value: t("gen.highDeg", { value: current.high }),
          detail: condition,
          tone: "amber",
        },
        {
          icon: "evening",
          title: t("gen.tile.evening"),
          value: t("gen.sunsetAt", { time: astronomy.sunset }),
          detail: t("gen.rangeLabel", { range: temperatureRange }),
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: t("gen.rec.useWindow", { window: outdoorWindow }),
          reason: runningSummary,
        },
        {
          icon: "cold",
          title: t("gen.rec.extraLayer"),
          reason: t("gen.rec.forecastLow", { value: current.low }),
        },
        {
          icon: "evening",
          title: t("gen.rec.recheckSunset"),
          reason: t("gen.rec.sunsetAt", { time: astronomy.sunset }),
        },
      ],
    }
  }

  if (variant === "air-quality" && airQuality) {
    return {
      variant,
      ...base,
      headline: t("gen.headline.airQuality", {
        label: td(airQuality.label).toLowerCase(),
      }),
      overview: t("gen.overview.airQuality", {
        index: airQuality.index,
        advice: td(airQuality.advice),
      }),
      window: outdoorWindow,
      factors: [
        {
          label: t("gen.label.aqi"),
          value: t("gen.indexWithLabel", {
            index: airQuality.index,
            label: td(airQuality.label),
          }),
        },
        {
          label: primaryPollutant
            ? td(primaryPollutant.label)
            : t("gen.label.pollutant"),
          value: primaryPollutant
            ? t("gen.pollutantValue", {
                value: primaryPollutant.value,
                unit: td(primaryPollutant.unit),
              })
            : t("gen.notAvailable"),
        },
        {
          label: t("gen.label.visibility"),
          value: t("gen.km", { value: current.visibility }),
        },
      ],
      tiles: [
        {
          icon: "air",
          title: t("gen.tile.airQuality"),
          value: t("gen.aqiValue", { index: airQuality.index }),
          detail: td(airQuality.label),
          tone: "rose",
        },
        {
          icon: "air",
          title: primaryPollutant
            ? td(primaryPollutant.label)
            : t("gen.tile.pollution"),
          value: primaryPollutant
            ? t("gen.pollutantValue", {
                value: primaryPollutant.value,
                unit: td(primaryPollutant.unit),
              })
            : t("gen.notAvailable"),
          detail: t("gen.detail.primaryPollutant"),
          tone: "amber",
        },
        {
          icon: "indoor",
          title: t("gen.tile.guidance"),
          value: td(airQuality.label),
          detail: td(airQuality.updatedLabel),
          tone: "green",
        },
        {
          icon: "outdoor",
          title: t("gen.tile.activityWindow"),
          value: outdoorWindow,
          detail: runningSummary,
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "air",
          title: t("gen.rec.planAqi", { index: airQuality.index }),
          reason: td(airQuality.advice),
        },
        {
          icon: "outdoor",
          title: t("gen.rec.useWindowIfOut", { window: outdoorWindow }),
          reason: runningSummary,
        },
        {
          icon: "indoor",
          title: t("gen.rec.recheckReading"),
          reason: td(airQuality.updatedLabel),
        },
      ],
    }
  }

  return {
    variant,
    ...base,
    headline: t("gen.headline.general", { condition }),
    overview: t("gen.overview.general", {
      temperature: current.temperature,
      feels: current.feelsLike,
      rain: rainfall.chance,
      humidity: current.humidity,
      wind: windValue,
    }),
    window: outdoorWindow,
    basis: t("gen.basis.general", { city: current.city }),
    factors: [
      {
        label: t("gen.label.temperature"),
        value: t("gen.degC", { value: current.temperature }),
      },
      {
        label: t("gen.label.rain"),
        value: t("gen.percent", { value: rainfall.chance }),
      },
      {
        label: t("gen.label.humidity"),
        value: t("gen.percent", { value: current.humidity }),
      },
      { label: t("gen.label.wind"), value: windValue },
    ],
    tiles: [
      {
        icon: "rain",
        title: t("gen.label.rain"),
        value: t("gen.chancePct", { value: rainfall.chance }),
        detail: t("gen.rainAmount", {
          value: rainfall.today,
          unit: td(rainfall.unit),
          period: periodLower,
        }),
        tone: "blue",
      },
      {
        icon: "comfort",
        title: t("gen.tile.comfort"),
        value: t("gen.feelsAt", { value: current.feelsLike }),
        detail: t("gen.humidityPct", { value: current.humidity }),
        tone: "rose",
      },
      {
        icon: "wind",
        title: t("gen.label.wind"),
        value: windValue,
        detail: t("gen.gusts", { value: current.windGust }),
        tone: "green",
      },
      {
        icon: "evening",
        title: t("gen.tile.sun"),
        value: t("gen.sunsetAt", { time: astronomy.sunset }),
        detail: t("gen.goldenHourAt", { time: astronomy.goldenHour }),
        tone: "violet",
      },
    ],
    recommendations: [
      {
        icon: "outdoor",
        title: t("gen.rec.useWindow", { window: outdoorWindow }),
        reason: runningSummary,
      },
      {
        icon: "rain",
        title: t("gen.rec.planRain", { chance: rainfall.chance }),
        reason: t("gen.rec.rainReported", {
          value: rainfall.today,
          unit: td(rainfall.unit),
          period: periodLower,
        }),
      },
      {
        icon: "comfort",
        title: t("gen.rec.expectFeel", { value: current.feelsLike }),
        reason: t("gen.rec.humidityIs", { value: current.humidity }),
      },
    ],
  }
}

function loadStoredProfile(): Profile | null {
  try {
    const value = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!value) return null
    const profile = JSON.parse(value) as Partial<Profile>
    if (
      typeof profile.name !== "string" ||
      !Array.isArray(profile.sensitivities) ||
      !Array.isArray(profile.concerns) ||
      !Array.isArray(profile.goals) ||
      typeof profile.activity !== "string"
    )
      return null
    const dob = typeof profile.dob === "string" ? profile.dob : undefined
    const age = dob ? calculateAge(dob) : (typeof profile.age === "number" ? profile.age : 29)
    const persona = typeof profile.persona === "string" ? (profile.persona as UserPersonaId) : undefined
    // Rebuild the object explicitly
    return {
      name: profile.name,
      dob,
      gender: ["Female", "Male", "Non-binary", "Prefer not to say"].includes(profile.gender ?? "") ? profile.gender : undefined,
      sensitivities: profile.sensitivities,
      concerns: profile.concerns,
      goals: profile.goals,
      age,
      height: typeof profile.height === "number" ? profile.height : undefined,
      weight: typeof profile.weight === "number" ? profile.weight : undefined,
      activity: profile.activity,
      persona,
    }
  } catch {
    return null
  }
}

function SetupChip({
  label,
  selected,
  onClick,
  disabled = false,
}: {
  label: string
  selected: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      className={`setup-chip${selected ? " selected" : ""}${
        disabled ? " disabled" : ""
      }`}
      onClick={disabled ? undefined : onClick}
      type="button"
      disabled={disabled}
    >
      <span className="chip-mark">
              <Icon name={selected ? "tick" : "plus"} />
            </span>
      {label}
    </button>
  )
}

function ScrollWheelColumn<T extends string | number>({
  items,
  value,
  onChange,
  itemHeight = 40,
}: {
  items: T[]
  value: T
  onChange: (val: T) => void
  itemHeight?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const index = items.indexOf(value)
    if (index !== -1 && containerRef.current && !isScrollingRef.current) {
      containerRef.current.scrollTop = index * itemHeight
    }
  }, [value, items, itemHeight])

  const handleScroll = () => {
    if (!containerRef.current) return
    isScrollingRef.current = true
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)

    scrollTimeoutRef.current = setTimeout(() => {
      if (!containerRef.current) return
      const scrollTop = containerRef.current.scrollTop
      const index = Math.round(scrollTop / itemHeight)
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index))
      if (items[clampedIndex] !== undefined && items[clampedIndex] !== value) {
        onChange(items[clampedIndex])
      }
      isScrollingRef.current = false
    }, 80)
  }

  return (
    <div
      ref={containerRef}
      className="dob-wheel-scroll-col"
      onScroll={handleScroll}
      style={{ height: itemHeight * 5 }}
    >
      <div style={{ height: itemHeight * 2, flexShrink: 0 }} />
      {items.map((item) => {
        const isSelected = item === value
        return (
          <div
            key={String(item)}
            className={`dob-wheel-item${isSelected ? " is-selected" : ""}`}
            style={{ height: itemHeight, lineHeight: `${itemHeight}px` }}
            onClick={() => {
              const idx = items.indexOf(item)
              if (containerRef.current) {
                containerRef.current.scrollTo({ top: idx * itemHeight, behavior: "smooth" })
              }
              onChange(item)
            }}
          >
            {item}
          </div>
        )
      })}
      <div style={{ height: itemHeight * 2, flexShrink: 0 }} />
    </div>
  )
}

export function DobPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (dateStr: string) => void
}) {
  const { t, td } = useTranslation()
  const parts = value.split("-")
  const yearVal = parseInt(parts[0] || "1995", 10)
  const monthVal = Math.max(0, Math.min(11, parseInt(parts[1] || "02", 10) - 1))
  const dayVal = parseInt(parts[2] || "18", 10)

  // The wheel column carries the displayed label as its own value, so the list
  // is translated up front and the month is resolved back by index. The order
  // is identical in every language, which keeps indexOf() correct.
  const MONTH_NAMES = useMemo(
    () =>
      [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ].map((month) => td(month)),
    [td],
  )

  const maxDaysInMonth = new Date(yearVal, monthVal + 1, 0).getDate()
  const currentDay = Math.min(dayVal, maxDaysInMonth)
  const currentMonthName = MONTH_NAMES[monthVal] ?? MONTH_NAMES[1]

  const handleMonthChange = (selectedMonthName: string) => {
    const mIndex = MONTH_NAMES.indexOf(selectedMonthName)
    if (mIndex === -1) return
    const newMax = new Date(yearVal, mIndex + 1, 0).getDate()
    const newDay = Math.min(currentDay, newMax)
    const mStr = String(mIndex + 1).padStart(2, "0")
    const dStr = String(newDay).padStart(2, "0")
    onChange(`${yearVal}-${mStr}-${dStr}`)
  }

  const handleDayChange = (d: number) => {
    const mStr = String(monthVal + 1).padStart(2, "0")
    const dStr = String(d).padStart(2, "0")
    onChange(`${yearVal}-${mStr}-${dStr}`)
  }

  const handleYearChange = (y: number) => {
    const newMax = new Date(y, monthVal + 1, 0).getDate()
    const newDay = Math.min(currentDay, newMax)
    const mStr = String(monthVal + 1).padStart(2, "0")
    const dStr = String(newDay).padStart(2, "0")
    onChange(`${y}-${mStr}-${dStr}`)
  }

  const years = Array.from({ length: 2014 - 1930 }, (_, i) => 1930 + i)
  const days = Array.from({ length: maxDaysInMonth }, (_, i) => i + 1)

  const calculatedAge = calculateAge(value)

  return (
    <div className="dob-picker-card">
      <div className="dob-picker-header">
        <span className="setup-label">{t("setup.dobLabel")}</span>
        <span className="dob-age-badge">
          {t("setup.ageBadge", { age: calculatedAge })}
        </span>
      </div>

      <div className="dob-wheels-frame">
        <div className="dob-wheel-lens" />
        <ScrollWheelColumn
          items={MONTH_NAMES}
          value={currentMonthName}
          onChange={handleMonthChange}
          itemHeight={40}
        />
        <ScrollWheelColumn
          items={days}
          value={currentDay}
          onChange={handleDayChange}
          itemHeight={40}
        />
        <ScrollWheelColumn
          items={years}
          value={yearVal}
          onChange={handleYearChange}
          itemHeight={40}
        />
      </div>

      <p className="dob-notice-text">
        {t("setup.dobPrivacyBefore")}
        <strong>{t("setup.dobPrivacyLink")}</strong>
        {t("setup.dobPrivacyAfter")}
      </p>
    </div>
  )
}

export function SemiCircleCrownWheel({
  personas,
  selectedIndex,
  onSelect,
}: {
  personas: UserPersona[]
  selectedIndex: number
  onSelect: (index: number) => void
}) {
  const { t, td } = useTranslation()
  const stageRef = useRef<HTMLDivElement>(null)
  const stageHeight = 360
  const centerY = stageHeight / 2 // 180px

  // Pure virtual scroll offset (0 to personas.length - 1)
  const [scrollOffset, setScrollOffset] = useState(selectedIndex)
  const scrollOffsetRef = useRef(selectedIndex)
  const animFrameRef = useRef<number | null>(null)
  const isInteractingRef = useRef(false)
  const startYRef = useRef(0)
  const startOffsetRef = useRef(0)
  const velocityHistoryRef = useRef<{ y: number; t: number }[]>([])

  // Keep ref in sync
  useEffect(() => {
    scrollOffsetRef.current = scrollOffset
  }, [scrollOffset])

  // Cancel any running animation
  const stopAnimation = () => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
  }

  // Smoothly animate scrollOffset to target integer index
  const animateTo = (targetIdx: number) => {
    stopAnimation()
    const clampedTarget = Math.max(0, Math.min(personas.length - 1, targetIdx))
    const start = scrollOffsetRef.current
    const distance = clampedTarget - start
    if (Math.abs(distance) < 0.002) {
      setScrollOffset(clampedTarget)
      scrollOffsetRef.current = clampedTarget
      return
    }

    const duration = Math.min(360, Math.max(200, Math.abs(distance) * 160))
    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      const current = start + distance * ease
      setScrollOffset(current)
      scrollOffsetRef.current = current

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step)
      } else {
        setScrollOffset(clampedTarget)
        scrollOffsetRef.current = clampedTarget
        animFrameRef.current = null
      }
    }
    animFrameRef.current = requestAnimationFrame(step)
  }

  // Sync external selectedIndex changes
  useEffect(() => {
    if (!isInteractingRef.current) {
      if (Math.abs(scrollOffsetRef.current - selectedIndex) > 0.01) {
        animateTo(selectedIndex)
      }
    }
  }, [selectedIndex])

  // Clean up animation on unmount
  useEffect(() => {
    return () => stopAnimation()
  }, [])

  // Drag / Touch / Gesture handlers
  const handleDragStart = (clientY: number) => {
    stopAnimation()
    isInteractingRef.current = true
    startYRef.current = clientY
    startOffsetRef.current = scrollOffsetRef.current
    velocityHistoryRef.current = [{ y: clientY, t: performance.now() }]
  }

  const handleDragMove = (clientY: number) => {
    if (!isInteractingRef.current) return
    const now = performance.now()
    velocityHistoryRef.current.push({ y: clientY, t: now })
    if (velocityHistoryRef.current.length > 5) {
      velocityHistoryRef.current.shift()
    }

    const dy = clientY - startYRef.current
    // 56px drag moves 1 profile
    const deltaOffset = -dy / 56
    let nextOffset = startOffsetRef.current + deltaOffset

    // Rubber-band resistance at extremes
    if (nextOffset < 0) {
      nextOffset = nextOffset * 0.35
    } else if (nextOffset > personas.length - 1) {
      const over = nextOffset - (personas.length - 1)
      nextOffset = personas.length - 1 + over * 0.35
    }

    setScrollOffset(nextOffset)
    scrollOffsetRef.current = nextOffset

    // Live update selection if changed
    const rounded = Math.round(nextOffset)
    const clampedRounded = Math.max(0, Math.min(personas.length - 1, rounded))
    if (clampedRounded !== selectedIndex) {
      onSelect(clampedRounded)
    }
  }

  const handleDragEnd = () => {
    if (!isInteractingRef.current) return
    isInteractingRef.current = false

    // Calculate fling velocity
    let velocity = 0
    const history = velocityHistoryRef.current
    if (history.length >= 2) {
      const oldest = history[0]
      const newest = history[history.length - 1]
      const dt = newest.t - oldest.t
      if (dt > 10) {
        velocity = (newest.y - oldest.y) / dt
      }
    }

    // Projected target with momentum (-velocity because dragging down decreases offset)
    const current = scrollOffsetRef.current
    const momentumOffset = -velocity * 0.15
    const projected = current + momentumOffset
    const target = Math.max(0, Math.min(personas.length - 1, Math.round(projected)))

    animateTo(target)
    onSelect(target)
  }

  // Pointer Events (Desktop Mouse Dragging)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    handleDragStart(e.clientY)
    if (stageRef.current) {
      stageRef.current.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    handleDragMove(e.clientY)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stageRef.current && stageRef.current.hasPointerCapture(e.pointerId)) {
      stageRef.current.releasePointerCapture(e.pointerId)
    }
    handleDragEnd()
  }

  // Native Touch Events (Mobile Touch / Swipe)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handleDragStart(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handleDragMove(e.touches[0].clientY)
    }
  }

  const handleTouchEnd = () => {
    handleDragEnd()
  }

  // Wheel handling with smooth debounce
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    stopAnimation()
    isInteractingRef.current = true

    const delta = e.deltaY * 0.003
    let nextOffset = scrollOffsetRef.current + delta
    nextOffset = Math.max(0, Math.min(personas.length - 1, nextOffset))

    setScrollOffset(nextOffset)
    scrollOffsetRef.current = nextOffset

    const rounded = Math.round(nextOffset)
    const clampedRounded = Math.max(0, Math.min(personas.length - 1, rounded))
    if (clampedRounded !== selectedIndex) {
      onSelect(clampedRounded)
    }

    if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
    wheelTimeoutRef.current = setTimeout(() => {
      isInteractingRef.current = false
      const target = Math.max(0, Math.min(personas.length - 1, Math.round(scrollOffsetRef.current)))
      animateTo(target)
      onSelect(target)
    }, 120)
  }

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown" && selectedIndex < personas.length - 1) {
      e.preventDefault()
      const next = selectedIndex + 1
      animateTo(next)
      onSelect(next)
    } else if (e.key === "ArrowUp" && selectedIndex > 0) {
      e.preventDefault()
      const prev = selectedIndex - 1
      animateTo(prev)
      onSelect(prev)
    }
  }

  return (
    <div
      ref={stageRef}
      className="crown-minimal-stage"
      tabIndex={0}
      role="listbox"
      aria-label={t("setup.crownAria")}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onWheel={handleWheel}
      style={{ height: stageHeight }}
    >
      <svg className="crown-minimal-arc-svg" viewBox="0 0 140 360" preserveAspectRatio="none">
        <defs>
          <linearGradient id="crownMinimalArcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="25%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="75%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
          </linearGradient>
        </defs>
        <path
          d="M 128 20 Q 30 180 128 340"
          fill="none"
          stroke="url(#crownMinimalArcGrad)"
          strokeWidth="2.2"
        />
      </svg>

      {/* Up Button */}
      <button
        type="button"
        className="crown-nav-btn btn-up"
        aria-label={t("setup.previousProfile")}
        disabled={selectedIndex === 0}
        onClick={(e) => {
          e.stopPropagation()
          if (selectedIndex > 0) {
            const next = selectedIndex - 1
            animateTo(next)
            onSelect(next)
          }
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>

      {/* Down Button */}
      <button
        type="button"
        className="crown-nav-btn btn-down"
        aria-label={t("setup.nextProfile")}
        disabled={selectedIndex === personas.length - 1}
        onClick={(e) => {
          e.stopPropagation()
          if (selectedIndex < personas.length - 1) {
            const next = selectedIndex + 1
            animateTo(next)
            onSelect(next)
          }
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <div className="crown-minimal-pointer" aria-hidden="true" />

      {/* Profiles along true semi-circle trajectory */}
      {personas.map((persona, index) => {
        const delta = index - scrollOffset
        const absDelta = Math.abs(delta)
        const isSelected = index === selectedIndex

        // Pure circular arc trajectory along circle radius R=240px (step = 24 degrees per item)
        const angleDeg = delta * 24
        const angleRad = (angleDeg * Math.PI) / 180
        const y = centerY + Math.sin(angleRad) * 240
        const x = (1 - Math.cos(angleRad)) * 130

        const isVisible = absDelta < 3.2
        const scale = isVisible ? Math.max(0.78, 1 - absDelta * 0.08) : 0.72
        const opacity = isVisible ? Math.max(0.18, 1 - absDelta * 0.32) : 0

        return (
          <div
            key={persona.id}
            role="option"
            aria-selected={isSelected}
            aria-label={td(persona.title)}
            className={`crown-minimal-item${isSelected ? " is-selected" : ""}`}
            style={{
              position: "absolute",
              top: `${y}px`,
              right: 0,
              transform: `translate3d(${x}px, -50%, 0) scale(${scale})`,
              opacity,
              pointerEvents: isVisible ? "auto" : "none",
              zIndex: isSelected ? 6 : 4,
              "--item-accent": persona.accentColor,
            } as React.CSSProperties}
            onClick={() => {
              animateTo(index)
              onSelect(index)
            }}
          >
            <span className="crown-item-title">{td(persona.title)}</span>
            <div
              className="crown-item-bubble"
              style={{
                borderColor: isSelected ? persona.accentColor : "rgba(255,255,255,0.18)",
                boxShadow: isSelected
                  ? `0 0 18px ${persona.accentColor}55, inset 0 0 8px ${persona.accentColor}33`
                  : "none",
              }}
            >
              <span className="crown-item-emoji">
                <Icon name={persona.icon} label={td(persona.shortTitle)} />
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Setup({
  weather,
  onComplete,
}: {
  weather: DashboardWeatherData | null
  onComplete: (profile: Profile) => void
}) {
  const { t, td, nu } = useTranslation()
  const [step, setStep] = useState<SetupStep>("welcome")
  const [name, setName] = useState("")
  const [dob, setDob] = useState("1995-02-18")
  const [sex, setSex] = useState<ProfileGender>("Prefer not to say")
  const [sensitivities, setSensitivities] = useState<string[]>([])
  const [concerns, setConcerns] = useState<string[]>([])
  const [selectedPersonaIndex, setSelectedPersonaIndex] = useState(0)
  const [nameMissing, setNameMissing] = useState(false)
  const activePersona = USER_PERSONAS[selectedPersonaIndex] || USER_PERSONAS[0]
  const stepIndex = SETUP_STEPS.indexOf(step)
  const toggle = (
    value: string,
    values: string[],
    setValues: (next: string[]) => void,
  ) =>
    setValues(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    )
  const toggleConcern = (value: string) => {
    if (value === "None of these") {
      setConcerns((current) =>
        current.includes("None of these") ? [] : ["None of these"],
      )
      return
    }

    setConcerns((current) => {
      if (current.includes(value)) {
        return current.filter((item) => item !== value)
      }
      if (current.includes("None of these")) {
        return [value]
      }
      return [...current.filter((item) => item !== "None of these"), value]
    })
  }
  const next = () => {
    if (step === "name" && !name.trim()) {
      setNameMissing(true)
      return
    }
    setNameMissing(false)
    setStep(SETUP_STEPS[Math.min(stepIndex + 1, SETUP_STEPS.length - 1)])
  }
  const back = () => setStep(SETUP_STEPS[Math.max(stepIndex - 1, 0)])

  return (
    <main className="setup-shell">
      <div className="setup-noise" />
      <div className="setup-topbar">
        <div className="brand-mark">MAUSAM</div>
        {step !== "welcome" && (
          <div className="setup-progress">
            <span style={{ width: `${Math.max(9, (stepIndex / 4) * 100)}%` }} />
          </div>
        )}
        {step !== "welcome" && (
          <button className="setup-back" onClick={back} type="button">
            <Icon name="arrow-left" />
          </button>
        )}
      </div>
      <div className="setup-content">
        {step === "welcome" && (
          <section className="setup-hero welcome-glass setup-animate">
            <div className="welcome-orb welcome-orb-a" />
            <div className="welcome-orb welcome-orb-b" />
            <div className="welcome-menu">
              <span className="welcome-menu-active">{t("setup.menuToday")}</span>
              <span>{t("setup.menuDiscover")}</span>
              <span>{t("setup.menuForYou")}</span>
              <span>{t("setup.menuMausam")}</span>
            </div>
            <div className="welcome-brand">MAUSAM</div>
            <div className="setup-eyebrow">{t("setup.welcomeEyebrow")}</div>
            <h1>
              {t("setup.welcomeLine1")}
              <br />
              <em>{t("setup.welcomeLine2")}</em>
            </h1>
            <p>{t("setup.welcomeCopy")}</p>
            <div className="welcome-reading">
              <span className="reading-dot" />
              <div>
                <small>
                  {t(weather ? "setup.demoPreview" : "setup.localWeather")}
                </small>
                <strong>
                  {weather
                    ? `${weather.current.city} · ${td(weather.current.condition)}`
                    : t("setup.chooseArea")}
                </strong>
              </div>
              {weather && <b>{nu(weather.current.temperature, "unit.degree")}</b>}
            </div>
            <button className="welcome-start" onClick={next} type="button">
              <span>{t("setup.start")}</span>
              <Icon name="arrow-right" />
            </button>
            <div className="setup-footnote">{t("setup.footnote")}</div>
          </section>
        )}
        {step === "name" && (
          <section className="setup-panel setup-name-panel setup-animate">
            <div className="setup-eyebrow">{t("setup.nameEyebrow")}</div>
            <h2>
              {t("setup.nameLine1")}
              <br />
              <em>{t("setup.nameLine2")}</em>
            </h2>
            <p className="setup-copy">{t("setup.nameCopy")}</p>
            <label className="setup-label" htmlFor="profile-name">
              {t("setup.nameLabel")} <span>{t("setup.required")}</span>
            </label>
            <input
              id="profile-name"
              className={`setup-input${nameMissing ? " input-error" : ""}`}
              autoComplete="name"
              placeholder={t("setup.namePlaceholder")}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setNameMissing(false)
              }}
              aria-invalid={nameMissing}
            />
            {nameMissing && (
              <div className="setup-error">{t("setup.nameError")}</div>
            )}
            <button className="setup-primary" onClick={next} type="button">
              {t("setup.continue")} <Icon name="arrow-right" />
            </button>
          </section>
        )}
        {step === "body" && (
          <section className="setup-panel setup-animate">
            <div className="setup-eyebrow">{t("setup.bodyEyebrow")}</div>
            <h2>
              {t("setup.bodyLine1")}
              <br />
              <em>{t("setup.bodyLine2")}</em>
            </h2>
            <p className="setup-copy">{t("setup.bodyCopy")}</p>
            <div className="setup-body-stack">
              <DobPicker value={dob} onChange={setDob} />
              <div>
                <label className="setup-label">{t("setup.genderLabel")}</label>
                <div className="gender-options">
                  {(["Female", "Male", "Non-binary", "Prefer not to say"] as const).map(
                    (item) => (
                      <button
                        key={item}
                        className={sex === item ? "active" : ""}
                        onClick={() => setSex(item)}
                        type="button"
                      >
                        {td(item)}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
            <button
              className="setup-primary"
              onClick={() => setStep("sensitivities")}
              type="button"
            >
              {t("setup.saveBaseline")} <Icon name="arrow-right" />
            </button>
          </section>
        )}
        {step === "sensitivities" && (
          <section className="setup-panel setup-animate">
            <div className="setup-eyebrow">{t("setup.sensitivitiesEyebrow")}</div>
            <h2>
              {t("setup.sensitivitiesLine1")}
              <br />
              <em>{t("setup.sensitivitiesLine2")}</em>
            </h2>
            <p className="setup-copy">{t("setup.sensitivitiesCopy")}</p>
            <label className="setup-label">{t("setup.triggersLabel")}</label>
            <div className="setup-chips">
              {choiceSets.sensitivities.map((item) => (
                <SetupChip
                  key={item}
                  label={td(item)}
                  selected={sensitivities.includes(item)}
                  onClick={() => toggle(item, sensitivities, setSensitivities)}
                />
              ))}
            </div>
            <label className="setup-label">
              {t("setup.concernsLabel")} <span>{t("setup.optional")}</span>
            </label>
            <div className="setup-chips">
              {choiceSets.concerns.map((item) => (
                <SetupChip
                  key={item}
                  label={td(item)}
                  selected={concerns.includes(item)}
                  disabled={
                    item !== "None of these" &&
                    concerns.includes("None of these")
                  }
                  onClick={() => toggleConcern(item)}
                />
              ))}
            </div>
            <button className="setup-primary" onClick={next} type="button">
              {t("setup.tuneAlerts")} <Icon name="arrow-right" />
            </button>
          </section>
        )}
        {step === "routine" && (
          <section className="setup-panel setup-profile-panel setup-animate">
            <div className="setup-eyebrow">{t("setup.routineEyebrow")}</div>
            <h2>
              {t("setup.routineLine1")}
              <br />
              <em>{t("setup.routineLine2")}</em>
            </h2>
            <p className="setup-copy">{t("setup.routineCopy")}</p>

            <div className="setup-crown-section">
              <SemiCircleCrownWheel
                personas={USER_PERSONAS}
                selectedIndex={selectedPersonaIndex}
                onSelect={setSelectedPersonaIndex}
              />

              <div
                className="crown-minimal-summary"
                style={{ "--persona-accent": activePersona.accentColor } as React.CSSProperties}
              >
                <div className="crown-summary-line">
                  <span className="crown-summary-dot" />
                  <strong>{td(activePersona.title)}</strong>
                  <span className="crown-summary-sep">·</span>
                  <span className="crown-summary-tagline">{td(activePersona.tagline)}</span>
                </div>
                <div className="crown-summary-tags">
                  {activePersona.highlights.map((item) => (
                    <span key={item} className="crown-summary-tag">
                      {td(item)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              className="setup-primary"
              onClick={() =>
                onComplete({
                  dob,
                  gender: sex,
                  name,
                  sensitivities:
                    sensitivities.length > 0
                      ? sensitivities
                      : activePersona.defaultSensitivities,
                  concerns:
                    concerns.length > 0
                      ? concerns
                      : activePersona.defaultConcerns,
                  goals: activePersona.defaultGoals,
                  age: calculateAge(dob),
                  activity: activePersona.defaultActivity,
                  persona: activePersona.id,
                })
              }
              type="button"
            >
              {t("setup.continue")} <Icon name="arrow-right" />
            </button>
          </section>
        )}
      </div>
      {step !== "welcome" && (
        <div className="setup-step-count">
          {String(stepIndex).padStart(2, "0")} <span>/ 04</span>
        </div>
      )}
    </main>
  )
}

// ── Personalised Weather ──────────────────────────────────────────────────────

function PersonalizedWeatherPage({
  profile,
  location,
  weather,
  onBack,
  onOpenPrivacy,
  onOpenFAQ,
}: {
  profile: Profile
  location: UserLocation
  weather: DashboardWeatherData
  onBack: () => void
  onOpenPrivacy: () => void
  onOpenFAQ: () => void
}) {
  const { t, td } = useTranslation()
  const localFallback = useMemo(
    () => getPersonalizedWeather(profile, weather, { t, td }),
    [profile, weather, t, td],
  )
  const [personalized, setPersonalized] =
    useState<PersonalizedWeather>(localFallback)
  const [whyOpen, setWhyOpen] = useState(false)

  useEffect(() => {
    // Show the local, deterministic briefing immediately (no loading
    // state needed), then silently upgrade to the backend briefing if it
    // arrives in time. Any failure — unconfigured endpoint, network error,
    // invalid response — leaves the local fallback in place, exactly as
    // the existing weather-fetch fallback behaves.
    setPersonalized(localFallback)
    const controller = new AbortController()
    fetchPersonalizedBriefing(
      {
        persona: mapProfileToPersona(profile),
        sensitivity: mapProfileToSensitivity(profile),
        location: location.locality,
        // v0.2: reason over the SAME coordinates this page's weather came
        // from, when the backend has resolved them (absent for demo data).
        latitude: weather.location?.latitude,
        longitude: weather.location?.longitude,
      },
      controller.signal,
    )
      .then((briefing) =>
        setPersonalized(
          adaptBriefingToPersonalizedWeather(briefing, localFallback, weather),
        ),
      )
      .catch(() => {
        /* keep the local fallback already set */
      })
    return () => controller.abort()
  }, [profile, location, weather, localFallback])

  return (
    <main className="personalized-page" data-variant={personalized.variant}>
      <header className="personalized-topbar">
        <button
          className="personalized-back"
          type="button"
          onClick={onBack}
          aria-label={t("briefing.back")}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div>
          <strong>{t("briefing.title")}</strong>
          <span>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
            </svg>
            <span data-i18n-ignore>{formatUserLocation(location)}</span>
          </span>
        </div>
      </header>

      <section className="personalized-intro">
        <span className="personalized-eyebrow" data-i18n-ignore>
          {t("briefing.for", { name: profile.name || t("briefing.you") })}
        </span>
        <h1>
          {t("briefing.headingLine1")}
          <br />
          <span>{t("briefing.headingLine2")}</span>
        </h1>
        <p>{t("briefing.subtitle")}</p>
      </section>

      <article className="personalized-overview personalized-glass">
        <div className="personalized-card-heading">
          <span className="personalized-spark" aria-hidden="true">
            <Icon name="spark" />
          </span>
          <div>
            <span>{t("briefing.glance")}</span>
          </div>
        </div>
        <h2>{td(personalized.headline)}</h2>
        <p>{td(personalized.overview)}</p>
        <div
          className="personalized-factor-pills"
          aria-label={t("briefing.factorsAria")}
        >
          {personalized.factors.slice(0, 3).map((factor) => (
            <span key={factor.label}>
              <small>{td(factor.label)}</small>
              <strong>{td(factor.value)}</strong>
            </span>
          ))}
        </div>
        <div className="personalized-window">
          <span className="personalized-window-icon">
            <Icon name="outdoor" />
          </span>
          <div>
            <small>{td(personalized.windowLabel)}</small>
            <strong>{td(personalized.window)}</strong>
          </div>
        </div>
        <div className="personalized-basis" data-i18n-ignore>
          <Icon name="spark" className="wordmark-spark" />{" "}
          {t("briefing.basis", { basis: td(personalized.basis) })}
        </div>
      </article>

      <section
        className="personalized-section"
        aria-labelledby="personalized-tiles-title"
      >
        <div className="personalized-section-heading">
          <div>
            <span>{t("briefing.forYourDay")}</span>
            <h2 id="personalized-tiles-title">{t("briefing.tilesTitle")}</h2>
          </div>
          <small>
            {t("briefing.essentials", { count: personalized.tiles.length })}
          </small>
        </div>
        <div className="personalized-tile-grid">
          {personalized.tiles.map((tile) => (
            <article
              className={`personalized-tile personalized-glass tone-${tile.tone}`}
              key={tile.title}
            >
              <span className="personalized-tile-icon">
                <Icon name={tile.icon} />
              </span>
              <span className="personalized-tile-title">{td(tile.title)}</span>
              <strong>{td(tile.value)}</strong>
              <small>{td(tile.detail)}</small>
            </article>
          ))}
        </div>
      </section>

      <section
        className="personalized-section"
        aria-labelledby="personalized-actions-title"
      >
        <div className="personalized-section-heading">
          <div>
            <span>{t("briefing.nextSteps")}</span>
            <h2 id="personalized-actions-title">{t("briefing.whatShouldIDo")}</h2>
          </div>
        </div>
        <div className="personalized-actions personalized-glass">
          {personalized.recommendations.map((recommendation, index) => (
            <article key={recommendation.title}>
              <span className="personalized-action-number">0{index + 1}</span>
              <span className="personalized-action-icon">
                <Icon name={recommendation.icon} />
              </span>
              <div>
                <strong>{td(recommendation.title)}</strong>
                <p>{td(recommendation.reason)}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className={`personalized-why personalized-glass${
          whyOpen ? " is-open" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => setWhyOpen((current) => !current)}
          aria-expanded={whyOpen}
          aria-controls="personalized-why-content"
        >
          <span className="personalized-why-icon">?</span>
          <span>
            <strong>{t("briefing.whyTitle")}</strong>
            <small>{t("briefing.whySubtitle")}</small>
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m7 10 5 5 5-5" />
          </svg>
        </button>
        <div className="personalized-why-panel" id="personalized-why-content">
          <div>
            <p>{t("briefing.whyBody")}</p>
            <div className="personalized-factor-list">
              {personalized.factors.map((factor) => (
                <div key={factor.label}>
                  <span>{td(factor.label)}</span>
                  <strong>{td(factor.value)}</strong>
                </div>
              ))}
            </div>
            <div className="personalized-profile-tags">
              {[
                ...profile.sensitivities,
                ...profile.concerns.filter((item) => item !== "None of these"),
              ]
                .slice(0, 5)
                .map((item) => (
                  <span key={item}>{td(item)}</span>
                ))}
              {!profile.sensitivities.length &&
                !profile.concerns.filter((item) => item !== "None of these")
                  .length && <span>{t("briefing.generalProfile")}</span>}
            </div>
          </div>
        </div>
      </section>

      {/* The briefing is built from the profile and location data these
          documents describe, so they sit directly beneath it. */}
      <button
        type="button"
        className="personalized-doc-link"
        onClick={onOpenPrivacy}
      >
        <span>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm0 5a2.5 2.5 0 0 1 2.5 2.5V11h.5v5h-6v-5h.5V9.5A2.5 2.5 0 0 1 12 7Zm0 1.6c-.5 0-1 .4-1 .9V11h2V9.5c0-.5-.4-.9-1-.9Z" />
          </svg>
        </span>
        <span>
          <strong>{t("sidebar.privacy")}</strong>
          <small>{t("sidebar.privacyHint")}</small>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>

      <button
        type="button"
        className="personalized-doc-link"
        onClick={onOpenFAQ}
      >
        <span>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 15.6a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm1.6-5.5c-.7.5-.9.8-.9 1.4v.3h-1.5v-.4c0-1.2.5-1.9 1.4-2.5.7-.5 1-.8 1-1.4 0-.7-.5-1.1-1.3-1.2-.8 0-1.4.4-1.6 1.2l-1.4-.5C9.7 7.8 10.8 7 12.3 7c1.7 0 2.9 1 2.9 2.5 0 1-.5 1.8-1.6 2.6Z" />
          </svg>
        </span>
        <span>
          <strong>{t("sidebar.faq")}</strong>
          <small>{t("sidebar.faqHint")}</small>
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 5 7 7-7 7" />
        </svg>
      </button>

      {personalized.disclaimer && (
        <p className="personalized-disclaimer">{td(personalized.disclaimer)}</p>
      )}
    </main>
  )
}

// ── Ready slider (entry animation after location setup) ─────────────────────────
function Ready({
  onComplete,
  onBack,
}: {
  onComplete: () => void
  onBack?: () => void
}) {
  const { t } = useTranslation()
  return (
    <main className="setup-shell">
      <div className="setup-noise" />
      <div className="setup-topbar">
        <div className="brand-mark">MAUSAM</div>
        {onBack && (
          <button
            className="setup-back"
            onClick={onBack}
            type="button"
            aria-label={t("location.back")}
          >
            <Icon name="arrow-left" />
          </button>
        )}
      </div>
      <div className="setup-content">
        <section className="setup-panel setup-login setup-animate">
          <div className="setup-eyebrow">{t("ready.eyebrow")}</div>
          <h2>
            {t("ready.headingLine1")}
            <br />
            <em>{t("ready.headingLine2")}</em>
          </h2>
          <p className="setup-copy">{t("ready.copy")}</p>
          <SlideToDiveIn onComplete={onComplete} />
          <div className="setup-consent">{t("ready.consent")}</div>
        </section>
      </div>
    </main>
  )
}

// ── Location setup (location-first flow) ────────────────────────────────────────
// Runs once, after onboarding completes and before the first live weather
// request — never a silently substituted default location (backend-v0.2
// handoff §1/§2). navigator.geolocation is only ever called from this
// button's click handler, never automatically on mount.

export function LocationSetup({
  onResolved,
  onBack,
}: {
  onResolved: (location: UserLocation, weather?: DashboardWeatherData) => void
  onBack?: () => void
}) {
  const { t } = useTranslation()
  const [locating, setLocating] = useState(false)
  // Error copy is stored as a catalogue key, not a rendered sentence, so a
  // language switch while the message is on screen re-renders it translated.
  const [errorKey, setErrorKey] = useState<TranslationKey | "">("")
  const [manualOpen, setManualOpen] = useState(false)
  const [manualQuery, setManualQuery] = useState("")
  const [manualResults, setManualResults] = useState<LocationSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchErrorKey, setSearchErrorKey] = useState<TranslationKey | "">("")

  const finishSelection = async (
    location: UserLocation,
    enrich?: (signal: AbortSignal) => Promise<UserLocation>,
  ) => {
    // Prefetch briefly, but never trap onboarding behind a slow API.
    const controller = new AbortController()
    let latestLocation = location
    const requests = Promise.allSettled([
      (enrich ? enrich(controller.signal) : Promise.resolve(location)).then(value => {
        latestLocation = value
        return value
      }),
      fetchWeatherDashboard(location, controller.signal),
    ])
    let timer: ReturnType<typeof setTimeout> | undefined
    const fallback = [
      { status: "fulfilled", value: location },
      { status: "rejected", reason: new Error("Prefetch timed out") },
    ] as const
    const [locationResult, weatherResult] = await Promise.race([
      requests,
      new Promise<typeof fallback>((resolve) => {
        timer = setTimeout(() => resolve([
          { status: "fulfilled", value: latestLocation }, fallback[1],
        ]), 4000)
      }),
    ])
    clearTimeout(timer)
    controller.abort()
    const baseLocation =
      locationResult.status === "fulfilled" ? locationResult.value : location
    const weatherTimezone =
      weatherResult.status === "fulfilled"
        ? weatherResult.value.location?.timezone
        : undefined
    const resolvedLocation = {
      ...baseLocation,
      timezone: baseLocation.timezone || weatherTimezone || "",
    }
    const resolvedWeather =
      weatherResult.status === "fulfilled"
        ? {
            ...weatherResult.value,
            location: weatherResult.value.location
              ? {
                  ...weatherResult.value.location,
                  locality: resolvedLocation.locality,
                  region: resolvedLocation.region,
                  country: resolvedLocation.country,
                  timezone:
                    resolvedLocation.timezone ||
                    weatherResult.value.location.timezone,
                }
              : weatherResult.value.location,
            current: {
              ...weatherResult.value.current,
              city: resolvedLocation.locality,
              region: resolvedLocation.region,
            },
          }
        : undefined
    onResolved(resolvedLocation, resolvedWeather)
  }

  const useCurrentLocation = async () => {
    setLocating(true)
    setErrorKey("")
    try {
      const coordinates = await resolveDeviceCoordinates()
      // Address resolution and weather are independent once coordinates
      // exist. Fetching them together avoids a serial network round trip
      // and prevents demo temperature/time data flashing on the dashboard.
      await finishSelection(coordinates, (signal) =>
        enrichDeviceLocation(coordinates, signal),
      )
    } catch (error) {
      const reason =
        error instanceof GeolocationError
          ? error.reason
          : "position-unavailable"
      setErrorKey(
        reason === "permission-denied"
          ? "location.errorPermission"
          : reason === "policy-blocked"
            ? "location.errorPolicy"
            : reason === "insecure-context"
              ? "location.errorInsecure"
              : reason === "unsupported"
                ? "location.errorUnsupported"
                : reason === "services-disabled"
                  ? "location.errorServices"
                  : reason === "timeout"
                    ? "location.errorTimeout"
                    : "location.errorUnavailable",
      )
      setManualOpen(true)
    } finally {
      setLocating(false)
    }
  }

  const runSearch = async (query: string) => {
    setManualQuery(query)
    setSearchErrorKey("")
    if (!query.trim()) {
      setManualResults([])
      return
    }
    if (/^\d+$/.test(query.trim()) && !/^[1-9]\d{5}$/.test(query.trim())) {
      setManualResults([])
      setSearchErrorKey("location.errorPin")
      return
    }
    setSearching(true)
    try {
      const results = await searchLocations(query)
      setManualResults(results)
      if (results.length === 0) setSearchErrorKey("location.errorNoMatch")
    } catch {
      setManualResults([])
      setSearchErrorKey("location.errorSearch")
    } finally {
      setSearching(false)
    }
  }

  const chooseResult = async (result: LocationSearchResult) => {
    setLocating(true)
    try {
      await finishSelection(fromSearchResult(result))
    } finally {
      setLocating(false)
    }
  }

  const useDemoLocation = async () => {
    setLocating(true)
    try {
      await finishSelection(defaultDemoLocation())
    } finally {
      setLocating(false)
    }
  }

  return (
    <main className="setup-shell">
      <div className="setup-noise" />
      <div className="setup-topbar">
        <div className="brand-mark">
          <Icon name="spark" className="wordmark-spark" /> MAUSAM
        </div>
        {onBack && (
          <button
            className="setup-back"
            onClick={onBack}
            type="button"
            aria-label={t("location.back")}
          >
            <Icon name="arrow-left" />
          </button>
        )}
      </div>
      <div className="setup-content">
        <section className="setup-panel setup-animate">
          <div className="setup-eyebrow">{t("location.eyebrow")}</div>
          <h2>
            {t("location.headingLine1")}
            <br />
            <em>{t("location.headingLine2")}</em>
          </h2>
          <p className="setup-copy">{t("location.copy")}</p>

          <button
            className="setup-primary"
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
          >
            {locating ? t("location.finding") : t("location.useCurrent")}{" "}
            <Icon name="arrow-right" />
          </button>

          {errorKey && <div className="setup-error">{t(errorKey)}</div>}

          <button
            type="button"
            className="location-manual-toggle"
            aria-expanded={manualOpen}
            aria-controls="location-manual-panel"
            disabled={locating}
            onClick={() => setManualOpen((open) => !open)}
          >
            {t("location.searchManually")}
          </button>

          {manualOpen && (
            <div id="location-manual-panel" className="location-manual-panel">
              <form
                className="location-search-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void runSearch(manualQuery)
                }}
              >
                <label className="setup-label" htmlFor="india-location-search">
                  {t("location.searchLabel")}
                </label>
                <div className="location-search-row">
                  <input
                    id="india-location-search"
                    className="setup-input"
                    inputMode="search"
                    autoComplete="postal-code"
                    placeholder={t("location.placeholder")}
                    value={manualQuery}
                    onChange={(event) => {
                      setManualQuery(event.target.value)
                      setManualResults([])
                      setSearchErrorKey("")
                    }}
                  />
                  <button
                    type="submit"
                    className="location-search-button"
                    disabled={searching || !manualQuery.trim()}
                  >
                    {searching ? "…" : t("location.search")}
                  </button>
                </div>
              </form>
              {searching && (
                <div className="setup-copy">{t("location.searching")}</div>
              )}
              {searchErrorKey && (
                <div className="setup-error">{t(searchErrorKey)}</div>
              )}
              {manualResults.map((result) => (
                <button
                  key={`${result.name}-${result.latitude}-${result.longitude}`}
                  type="button"
                  className="location-card"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    marginTop: 8,
                    cursor: "pointer",
                  }}
                  disabled={locating}
                  onClick={() => chooseResult(result)}
                >
                  <span className="location-icon"><Icon name="target" /></span>
                  <div>
                    <strong>
                      {result.name}
                      {result.postalCode ? ` · ${result.postalCode}` : ""}
                    </strong>
                    <small>
                      {[result.region, result.country]
                        .filter(Boolean)
                        .join(", ")}
                    </small>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            className="location-demo-button"
            disabled={locating}
            onClick={useDemoLocation}
          >
            {t("location.demo")}
          </button>
        </section>
      </div>
    </main>
  )
}

// ── App Root ───────────────────────────────────────────────────────────────────

/**
 * The provider owns the language for the whole tree, including the onboarding
 * and location screens that render before the dashboard exists.
 */
export default function App() {
  return (
    <LanguageProvider>
      <MausamApp />
      {/* Tree-shaken out of production builds; see i18n/I18nDebugOverlay. */}
      {import.meta.env.DEV && <I18nDebugOverlay />}
    </LanguageProvider>
  )
}

function MausamApp() {
  const { t, setLanguage } = useTranslation()
  // Development-only, one-shot route for reviewing the complete onboarding
  // without manually clearing browser storage. The query parameter is
  // removed immediately so completing onboarding still persists normally.
  resetOnboardingPreviewIfRequested()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [profile, setProfile] = useState<Profile | null>(loadStoredProfile)
  // A saved profile alone is only a draft. Location is persisted after
  // the Ready slider, so only the pair permits skipping the intro on reload.
  const [profileSetupComplete, setProfileSetupComplete] = useState(
    () => Boolean(loadStoredProfile() && loadStoredLocation()),
  )
  const [weather, setWeather] =
    useState<DashboardWeatherData | null>(() => isLiveWeatherEnabled() ? null : DEMO_WEATHER_DATA)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(
    loadStoredLocation,
  )
  const [pendingLocation, setPendingLocation] = useState<{
    location: UserLocation
    weather?: DashboardWeatherData
  } | null>(null)
  const [weatherSource, setWeatherSource] =
    useState<"demo" | "loading" | "live" | "error">(() =>
      isLiveWeatherEnabled() && loadStoredLocation() ? "loading" : "demo",
    )
  const [tab, setTab] = useState<Tab>("home")
  const [overlay, setOverlay] = useState<Overlay>("none")
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    localStorage.getItem("mausam-theme") === "dark" ? "dark" : "light",
  )
  const prefetchedLocationKey = useRef<string | null>(null)
  const [weatherLocationKey, setWeatherLocationKey] = useState<string | null>(null)
  const [weatherRetry, setWeatherRetry] = useState(0)
  const [advisoryRefreshKey, setAdvisoryRefreshKey] = useState(0)

  // Synchronize latest weather state to the native Android widget
  useEffect(() => {
    if (weather) {
      void syncWeatherToWidget(weather, theme === "dark")
    }
  }, [weather, theme])

  const changeLocation = () => {
    setMenuOpen(false)
    clearStoredLocation()
    setUserLocation(null)
    setPendingLocation(null)
    setWeather(null)
    setWeatherLocationKey(null)
    prefetchedLocationKey.current = null
    setTab("home")
    setOverlay("none")
  }
  const logout = () => {
    changeLocation()
    localStorage.removeItem(PROFILE_STORAGE_KEY)
    localStorage.removeItem("mausam-theme")
    setTheme("light")
    setLanguage(DEFAULT_LANGUAGE)
    localStorage.removeItem(LANGUAGE_STORAGE_KEY)
    setProfile(null)
    setProfileSetupComplete(false)
  }

  const resolveLocation = (
    location: UserLocation,
    prefetchedWeather?: DashboardWeatherData,
  ) => {
    if (prefetchedWeather) {
      setWeather(prefetchedWeather)
      setWeatherSource(isLiveWeatherEnabled() ? "live" : "demo")
      prefetchedLocationKey.current = `${location.latitude},${location.longitude}`
      setWeatherLocationKey(prefetchedLocationKey.current)
    } else {
      setWeather(null)
      setWeatherSource("loading")
      setWeatherLocationKey(null)
    }
    saveLocation(location)
    setUserLocation(location)
  }

  useEffect(() => {
    localStorage.setItem("mausam-theme", theme)
  }, [theme])

  useEffect(() => {
    if (userLocation?.source !== "device" || userLocation.locality !== "Current location") return
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12_000)
    void enrichDeviceLocation(userLocation, controller.signal).then(location => {
      if (!controller.signal.aborted && location.locality !== "Current location") {
        saveLocation(location)
        setUserLocation(location)
      }
    })
    return () => { clearTimeout(timer); controller.abort() }
  }, [userLocation])

  useEffect(() => {
    if (!profile) return
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
  }, [profile])

  useEffect(() => {
    // Location-first (backend-v0.2 handoff §1): no live weather request is
    // ever attempted until a real location has been resolved (device GPS,
    // manual search, or an explicitly chosen demo location) — never a
    // silently substituted default.
    if (!userLocation) return

    const endpointConfigured = isLiveWeatherEnabled()
    const configuredRefresh = Number(import.meta.env.VITE_WEATHER_REFRESH_MS)
    const refreshMs = Number.isFinite(configuredRefresh) && configuredRefresh >= 10_000
      ? Math.min(configuredRefresh, 300_000) : 300_000
    let disposed = false
    let activeRequest: AbortController | undefined
    let inFlight = false
    const locationKey = `${userLocation.latitude},${userLocation.longitude}`
    const refreshWeather = async () => {
      if (inFlight || disposed) return
      inFlight = true
      activeRequest?.abort()
      const request = new AbortController()
      activeRequest = request
      const timeout = window.setTimeout(() => {
        request.abort()
        if (!disposed && activeRequest === request) {
          setWeather(null)
          setWeatherSource("error")
        }
      }, 20_000)
      try {
        const nextWeather = await fetchWeatherDashboard(userLocation, request.signal)
        if (disposed || request.signal.aborted || activeRequest !== request) return
        setWeather(nextWeather)
        setWeatherLocationKey(locationKey)
        setWeatherSource(endpointConfigured ? "live" : "demo")
      } catch {
        if (disposed || activeRequest !== request) return
        setWeather(null)
        setWeatherSource("error")
      } finally {
        window.clearTimeout(timeout)
        if (activeRequest === request) inFlight = false
      }
    }
    if (prefetchedLocationKey.current === locationKey) {
      prefetchedLocationKey.current = null
    } else {
      setWeather(null)
      setWeatherSource("loading")
      void refreshWeather()
    }
    const refreshOnReturn = () => {
      if (document.visibilityState !== "visible") return
      // A sleeping tab can retain yesterday's reading. Clear it before
      // fetching, even if the browser paused the normal refresh interval.
      setWeather(value => {
        if (value && !isCurrentWeatherFresh(value)) return null
        return value
      })
      setWeatherSource("loading")
      void refreshWeather()
    }
    const refreshTimer = endpointConfigured ? window.setInterval(refreshWeather, refreshMs) : undefined
    if (endpointConfigured) {
      document.addEventListener("visibilitychange", refreshOnReturn)
      window.addEventListener("focus", refreshOnReturn)
      window.addEventListener("online", refreshOnReturn)
    }
    return () => {
      document.removeEventListener("visibilitychange", refreshOnReturn)
      window.removeEventListener("focus", refreshOnReturn)
      window.removeEventListener("online", refreshOnReturn)
      disposed = true
      activeRequest?.abort()
      if (refreshTimer !== undefined) window.clearInterval(refreshTimer)
    }
  }, [userLocation, weatherRetry])

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [tab, overlay])

  const handlePullRefresh = async () => {
    if (!userLocation) return
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 18_000)
    try {
      // 1. Fetch live weather directly with forced upstream refresh
      const weatherPromise = fetchWeatherDashboard(userLocation, controller.signal, true)

      // 2. Refresh device location coordinates / reverse-geocoded locality if device GPS
      const locationPromise = (async () => {
        if (userLocation.source === "device") {
          try {
            const freshLocation = await enrichDeviceLocation(userLocation, controller.signal)
            if (freshLocation && freshLocation.locality !== "Current location") {
              saveLocation(freshLocation)
              setUserLocation(freshLocation)
            }
          } catch {
            /* non-fatal */
          }
        }
      })()

      // 3. Trigger advisory and downstream component refresh
      setAdvisoryRefreshKey((k) => k + 1)

      const [nextWeather] = await Promise.all([weatherPromise, locationPromise])
      if (nextWeather) {
        setWeather(nextWeather)
        setWeatherLocationKey(`${userLocation.latitude},${userLocation.longitude}`)
        setWeatherSource(isLiveWeatherEnabled() ? "live" : "demo")
        void syncWeatherToWidget(nextWeather, theme === "dark", formatUserLocation(userLocation))
      }
    } catch (err) {
      console.warn("Pull-to-refresh caught error:", err)
      setWeatherRetry((v) => v + 1)
    } finally {
      window.clearTimeout(timeout)
    }
  }

  if (!profile || !profileSetupComplete)
    return <Setup weather={isLiveWeatherEnabled() ? null : weather} onComplete={(nextProfile) => {
      setProfile(nextProfile)
      setProfileSetupComplete(true)
    }} />

  if (!userLocation && !pendingLocation)
    return (
      <LocationSetup
        onResolved={(location, weather) =>
          setPendingLocation({ location, weather })
        }
        onBack={() => setProfile(null)}
      />
    )
  if (pendingLocation)
    return (
      <Ready
        onComplete={() => {
          if (pendingLocation)
            resolveLocation(pendingLocation.location, pendingLocation.weather)
          setPendingLocation(null)
        }}
        onBack={() => setPendingLocation(null)}
      />
    )
  if (!userLocation) return null
  if (!weather || weatherLocationKey !== `${userLocation.latitude},${userLocation.longitude}`) {
    const failed = weatherSource === "error"
    if (failed) {
      return (
        <OfflineScreen
          theme={theme}
          onRetry={() => setWeatherRetry(value => value + 1)}
          onDemoMode={() => {
            setWeatherSource("demo")
            setWeather(DEMO_WEATHER_DATA)
            setWeatherLocationKey(`${userLocation.latitude},${userLocation.longitude}`)
          }}
          onChangeLocation={() => {
            clearStoredLocation()
            setUserLocation(null)
            setWeather(null)
            setWeatherLocationKey(null)
          }}
        />
      )
    }
    return <main className="setup-shell" data-weather-source="loading">
      <div className="setup-topbar" />
      <div className="setup-content"><section className="setup-panel">
        <div className="setup-eyebrow">{t("gate.liveWeather", { place: userLocation.locality })}</div>
        <h2>{t("gate.loadingTitle")}</h2>
        <p className="setup-copy" role="status">{t("gate.loadingCopy")}</p>
        <button type="button" className="location-manual-toggle" onClick={() => { clearStoredLocation(); setUserLocation(null); setWeather(null); setWeatherLocationKey(null) }}>{t("gate.changeLocation")}</button>
      </section></div>
    </main>
  }

  return (
    <div
      className={`mausam-app theme-${theme}${menuOpen ? " sidebar-open" : ""}`}
      data-theme={theme}
      data-weather-source={weatherSource}
      style={{
        background: theme === "light" ? "#cce4f2" : "#04050a",
        height: "100dvh",
        minHeight: "100dvh",
        display: "flex",
        justifyContent: "center",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 630,
          height: "100dvh",
          minHeight: "100dvh",
          background: theme === "light" ? "#e9fbff" : "#07080e",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          ref={scrollRef}
          className="no-scrollbar app-scroll"
          style={{ flex: 1, minHeight: 0, overflowY: "auto" }}
        >
          <PullToRefresh scrollRef={scrollRef} onRefresh={handlePullRefresh} theme={theme}>
            {overlay !== "none" && <header className="secondary-menu-header"><MausamMenuButton onClick={() => setMenuOpen(true)} expanded={menuOpen} /></header>}
            {overlay === "settings" ? (
              <SettingsPage onBack={() => setOverlay("none")} />
            ) : overlay === "privacy" ? (
              <PrivacyPolicyPage
                onBack={() => setOverlay("briefing")}
                onHome={() => {
                  setTab("home")
                  setOverlay("none")
                }}
              />
            ) : overlay === "faq" ? (
              <FAQPage
                onBack={() => setOverlay("briefing")}
                onHome={() => {
                  setTab("home")
                  setOverlay("none")
                }}
              />
            ) : overlay === "briefing" ? (
              <PersonalizedWeatherPage
                profile={profile}
                location={userLocation}
                weather={weather}
                onBack={() => setOverlay("none")}
                onOpenPrivacy={() => setOverlay("privacy")}
                onOpenFAQ={() => setOverlay("faq")}
              />
            ) : (
              <>
                {tab === "home" && (
                  <HomeTab
                    profile={profile}
                    location={userLocation}
                    theme={theme}
                    setTheme={setTheme}
                    onOpenPersonalized={() => setOverlay("briefing")}
                    onOpenMenu={() => setMenuOpen(true)}
                    menuOpen={menuOpen}
                    weather={weather}
                    advisoryRefreshKey={advisoryRefreshKey}
                  />
                )}
                {tab === "health" && (
                  <HealthTab
                    weather={weather}
                    onOpenMenu={() => setMenuOpen(true)}
                    menuOpen={menuOpen}
                  />
                )}
                {tab === "forecast" && (
                  <ForecastTab
                    weather={weather}
                    theme={theme}
                    onOpenMenu={() => setMenuOpen(true)}
                    menuOpen={menuOpen}
                  />
                )}
                {tab === "alerts" && (
                  <AlertsTab
                    weather={weather}
                    userLocation={userLocation}
                    theme={theme}
                    onOpenMenu={() => setMenuOpen(true)}
                    menuOpen={menuOpen}
                  />
                )}
              </>
            )}
          </PullToRefresh>
        </div>
        {overlay === "none" && <BottomNav tab={tab} setTab={setTab} />}
        <ProfileSidebar open={menuOpen} profile={profile} location={userLocation} theme={theme}
          onClose={() => setMenuOpen(false)} onChangeLocation={changeLocation} onLogout={logout}
          onBriefing={() => { setMenuOpen(false); setOverlay("briefing") }}
          onPrivacy={() => { setMenuOpen(false); setOverlay("privacy") }}
          onFAQ={() => { setMenuOpen(false); setOverlay("faq") }}
          onSettings={() => { setMenuOpen(false); setOverlay("settings") }} />
      </div>
    </div>
  )
}
