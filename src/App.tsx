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
  getWeatherHeroVariant,
  resolveWeatherIcon,
  type DashboardWeatherData,
} from "./weatherData"
import {
  adaptBriefingToPersonalizedWeather,
  fetchPersonalizedBriefing,
  mapProfileToPersona,
  mapProfileToSensitivity,
} from "./personalizedBriefing"
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
} from "./location"
import { getTimeGreeting } from "./timeGreeting"

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = "home" | "health" | "forecast" | "alerts"

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
}: {
  children: ReactNode
  color: string
  bg: string
}) {
  return (
    <span
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

const INDIA_NAQI_GRADIENT =
  "linear-gradient(90deg,#22c55e 0 10%,#84cc16 10% 20%,#facc15 20% 40%,#f97316 40% 60%,#a855f7 60% 80%,#7f1d1d 80% 100%)"

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
  const resolvedIcon = resolveWeatherIcon(conditionCode, icon, isDay)
  if (/^(https?:\/\/|\/)/.test(resolvedIcon)) {
    return (
      <img
        src={resolvedIcon}
        alt={label}
        loading="lazy"
        decoding="async"
        style={{ width: "1.35em", height: "1.35em", objectFit: "contain" }}
      />
    )
  }
  return (
    <span role="img" aria-label={label}>
      {resolvedIcon}
    </span>
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

const NAV_TABS: { id: Tab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "health", label: "Health" },
  { id: "forecast", label: "Forecast" },
  { id: "alerts", label: "Alerts" },
]

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
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
            aria-label={item.label}
          >
            <NavIcon id={item.id} active={active} />
          </button>
        )
      })}
    </nav>
  )
}

function AudienceFocus({ items }: { items: DashboardWeatherData["overview"] }) {
  return (
    <div className="audience-focus">
      <div className="audience-focus-heading">Today, at a glance</div>
      <div className="audience-focus-grid">
        {items.map((item) => (
          <div key={item.label} className={`audience-focus-card ${item.tone}`}>
            <span className="audience-focus-icon">{item.icon}</span>
            <div>
              <strong>{item.label}</strong>
              <small>{item.value}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Home Tab ───────────────────────────────────────────────────────────────────

function HomeTab({
  profile,
  location,
  theme,
  setTheme,
  onOpenPersonalized,
  onChangeLocation,
  weather,
}: {
  profile: Profile
  location: UserLocation
  theme: "dark" | "light"
  setTheme: (theme: "dark" | "light") => void
  onOpenPersonalized: () => void
  onChangeLocation: () => void
  weather: DashboardWeatherData
}) {
  const { current } = weather
  // Rain has its own buddy in either daylight state. Any non-rainy night
  // uses the lunar preset, including older API payloads that still say
  // heroVariant="sunny" but correctly expose isDay=false.
  const weatherHeroVariant =
    current.heroVariant === "rainy"
      ? "rainy"
      : current.isDay === false
        ? "night"
        : (current.heroVariant ??
          getWeatherHeroVariant(
            current.conditionCode,
            current.condition,
            current.isDay,
          ))
  const isRainy = weatherHeroVariant === "rainy"
  const isNight = weatherHeroVariant === "night"
  const [now, setNow] = useState(() => new Date())
  const locationLabel = formatUserLocation(location)
  const locationTimeZone =
    weather.location?.timezone || location.timezone || "Asia/Kolkata"
  const greeting = getTimeGreeting(now, locationTimeZone)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="home-screen app-page" style={{ padding: "52px 16px 24px" }}>
      <header className="app-top-header" aria-label="Mausam header">
        <div className="app-header-group">
          <span className="app-weather-mark" aria-hidden="true">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle
                className="app-weather-sun"
                cx="29"
                cy="19"
                r="10"
                fill="currentColor"
                stroke="none"
                opacity=".95"
              />
              <path d="M29 5v4M29 29v4M15 19h4M39 19h4M19 9l3 3M36 26l3 3M19 29l3-3M36 12l3-3" />
              <path
                d="M10 35h22c5 0 7-3 7-7s-3-7-7-7c-1-6-10-8-14-2-5-1-9 2-9 7-4 0-6 2-6 5s3 4 7 4Z"
                fill="currentColor"
                stroke="none"
              />
              <path
                d="M10 35h22c5 0 7-3 7-7s-3-7-7-7c-1-6-10-8-14-2-5-1-9 2-9 7-4 0-6 2-6 5s3 4 7 4Z"
                stroke="rgba(255,255,255,.55)"
                strokeWidth="1.4"
              />
            </svg>
          </span>
          <span className="app-header-title">Mausam</span>
          <button
            className={`theme-toggle theme-toggle-${theme}`}
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={`Switch to ${
              theme === "dark" ? "light" : "dark"
            } theme`}
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
        </div>
      </header>

      <button
        className="personal-insight home-insight"
        type="button"
        onClick={onOpenPersonalized}
        aria-label="Open your personalised weather briefing"
      >
        <div className="insight-spark">✦</div>
        <div>
          <strong>
            {profile.name ? `${greeting}, ${profile.name}` : greeting}
          </strong>
          <span>
            Personalised for {location.locality}
            {profile.sensitivities.length
              ? ` · Watching ${profile.sensitivities.slice(0, 2).join(" + ")}`
              : ""}
          </span>
        </div>
        <div className="insight-arrow">›</div>
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
            <span className="hero-location-name">{locationLabel}</span>
            <button
              type="button"
              onClick={onChangeLocation}
              aria-label="Change location"
              style={{
                background: "none",
                border: 0,
                padding: 0,
                marginLeft: 8,
                color: "inherit",
                opacity: 0.65,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Change
            </button>
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
                <span>{current.temperature}</span>
                <span
                  style={{
                    fontSize: 38,
                    fontWeight: 300,
                    color: "rgba(255,255,255,0.4)",
                    transform: "translateY(8px)",
                  }}
                >
                  °
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
                {current.condition}
              </div>
              <div
                className="weather-meta"
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.3)",
                  marginTop: 3,
                }}
              >
                Feels {current.feelsLike}° &nbsp;·&nbsp; H:{current.high}° L:
                {current.low}°
              </div>
            </div>
            <div
              className={`weather-companion weather-companion-${weatherHeroVariant}`}
              aria-label={
                isRainy
                  ? "Animated rain cloud"
                  : isNight
                    ? "Animated smiling moon"
                    : "Animated smiling sun"
              }
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
                {isRainy ? (
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
                v: `${current.windSpeed}`,
                u: "km/h",
                l: `Wind · ${current.windDirection}`,
              },
              { v: `${current.humidity}`, u: "%", l: "Humidity" },
              { v: `${current.visibility}`, u: "km", l: "Visibility" },
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

      {/* Hourly Forecast */}
      <div style={{ marginBottom: 22 }}>
        <SectionLabel>Hourly · Rain Chance</SectionLabel>
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
                {hour.time}
              </div>
              <div
                data-testid={i === 0 ? "hourly-now-icon" : undefined}
                style={{ display: "grid", placeItems: "center", fontSize: 20 }}
              >
                <WeatherIcon
                  conditionCode={hour.conditionCode}
                  icon={hour.icon}
                  label={hour.condition}
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
                {hour.temperature}°
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "#60a5fa",
                  marginTop: 2,
                  fontWeight: 700,
                }}
              >
                {hour.rainChance}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Grid */}
      <div style={{ marginBottom: 22 }}>
        <SectionLabel>Today's Metrics</SectionLabel>
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
                  INDIA AQI {weather.airQuality.index}
                </Badge>
                <CardLabel>Air Quality</CardLabel>
                <div className="aqi-status">{weather.airQuality.label}</div>
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
                          {pollutant.value}
                        </div>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <>
                <CardLabel>Air Quality</CardLabel>
                <div className="aqi-status">Unavailable</div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.32)",
                    marginTop: 4,
                  }}
                >
                  No nearby CPCB station reading is available.
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
              {weather.uv.label.toUpperCase()}
            </Badge>
            <CardLabel>UV Index</CardLabel>
            <div className="metric-card-number metric-index">
              {weather.uv.index}
            </div>
            <div className="metric-card-emphasis">
              {weather.uv.recommendation}
            </div>
            <div className="metric-card-note">
              Peak · {weather.uv.peakHours}
            </div>
          </Card>

          {/* Best Run */}
          <Card
            className="metric-primary-card run-tile"
            grad="linear-gradient(140deg,#064e3b 0%,#022c22 100%)"
            border="rgba(52,211,153,0.1)"
          >
            <Badge color="#34d399" bg="rgba(52,211,153,0.14)">
              {weather.running.badge}
            </Badge>
            <CardLabel>Best Run Time</CardLabel>
            <div className="metric-card-number metric-run-time">
              {weather.running.start}–{weather.running.end}
            </div>
            <div className="metric-card-emphasis">
              {weather.running.summary}
            </div>
            <div className="metric-card-note metric-card-accent">
              Sunrise · {weather.astronomy.sunrise}
            </div>
          </Card>

          {/* Rain Today */}
          <Card
            className="metric-primary-card rainfall-tile"
            grad="linear-gradient(140deg,#1e3a5f 0%,#0a1830 100%)"
            border="rgba(96,165,250,0.1)"
          >
            <Badge color="#60a5fa" bg="rgba(96,165,250,0.14)">
              {weather.rainfall.chance}%
            </Badge>
            <CardLabel>Rainfall Today</CardLabel>
            <div className="metric-card-number metric-rainfall">
              {weather.rainfall.today}
              <span> {weather.rainfall.unit}</span>
            </div>
            <div className="metric-card-emphasis">
              {weather.rainfall.periodLabel}
            </div>
            <div className="metric-card-note">
              Month ·{" "}
              {weather.rainfall.month !== undefined
                ? `${weather.rainfall.month} ${weather.rainfall.unit}`
                : "Unavailable"}
            </div>
          </Card>

          {/* Commute — full width */}
          <Card
            grad="linear-gradient(140deg,#2e1065 0%,#100522 100%)"
            border="rgba(167,139,250,0.1)"
            span2
          >
            <Badge color="#f87171" bg="rgba(239,68,68,0.14)">
              {weather.commute.status}
            </Badge>
            <CardLabel>Commute Status · {weather.commute.location}</CardLabel>
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
                  <div style={{ fontSize: 18 }}>{c.icon}</div>
                  <div
                    style={{
                      fontSize: 8,
                      color: "#a78bfa",
                      fontWeight: 800,
                      marginTop: 5,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {c.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: "white",
                      marginTop: 2,
                    }}
                  >
                    {c.value}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: "rgba(255,255,255,0.28)",
                      marginTop: 1,
                    }}
                  >
                    {c.detail}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Local swimming conditions for Kolkata. */}
          <Card
            className="secondary-pair-card swimming-tile"
            grad="linear-gradient(140deg,#083344 0%,#031520 100%)"
            border="rgba(34,211,238,0.08)"
          >
            <Badge color="#f87171" bg="rgba(239,68,68,0.14)">
              {weather.swimming.badge}
            </Badge>
            <CardLabel>
              {weather.swimming.venue} · {weather.swimming.distance}
            </CardLabel>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "white",
                lineHeight: 1,
              }}
            >
              {weather.swimming.depth}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                {weather.swimming.depthUnit}
              </span>
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.35)",
                marginTop: 5,
              }}
            >
              Pool depth
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.3)",
                marginTop: 3,
              }}
            >
              💧 ~{weather.swimming.waterTemperature}°C (est.) · Peak{" "}
              {weather.swimming.peakTime}
            </div>
            <div style={{ fontSize: 9, color: "#f87171", marginTop: 5 }}>
              {weather.swimming.advice}
            </div>
          </Card>

          {/* Garden */}
          <Card
            className="secondary-pair-card garden-tile"
            grad="linear-gradient(140deg,#14532d 0%,#071a10 100%)"
            border="rgba(74,222,128,0.08)"
          >
            <Badge color="#4ade80" bg="rgba(74,222,128,0.14)">
              {weather.garden.badge}
            </Badge>
            <CardLabel>Garden & Crops</CardLabel>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "white",
                lineHeight: 1.45,
              }}
            >
              {weather.garden.title}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.3)",
                marginTop: 7,
              }}
            >
              🌱 Soil: {weather.garden.soil}
            </div>
            <div style={{ fontSize: 9, color: "#4ade80", marginTop: 5 }}>
              {weather.garden.note}
            </div>
          </Card>
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div style={{ marginBottom: 14 }}>
        <SectionLabel>7-Day Forecast</SectionLabel>
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
                {day.day}
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
                  label={day.condition}
                />
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: 11,
                  color: "rgba(255,255,255,0.32)",
                }}
              >
                {day.condition}
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
                  {day.rainChance}%
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.32)",
                    minWidth: 22,
                  }}
                >
                  {day.low}°
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
                  {day.high}°
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

function HealthTab({ weather }: { weather: DashboardWeatherData }) {
  return (
    <div
      className="app-page health-screen"
      style={{ padding: "52px 16px 24px" }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "white",
          letterSpacing: "-0.03em",
          marginBottom: 18,
        }}
      >
        Health Metrics
      </div>

      {/* AQI Detailed */}
      <Card
        grad="linear-gradient(140deg,#431407 0%,#1a0803 100%)"
        border="rgba(245,158,11,0.12)"
        pad={20}
      >
        <CardLabel>India National AQI · {weather.current.city}</CardLabel>
        {weather.airQuality ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
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
                  {weather.airQuality.index}
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#fbbf24",
                    marginTop: 5,
                  }}
                >
                  {weather.airQuality.label}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.3)",
                    marginTop: 2,
                  }}
                >
                  {weather.airQuality.updatedLabel}
                </div>
              </div>
              <div style={{ fontSize: 40 }}>{weather.airQuality.icon}</div>
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
              {weather.airQuality.scaleLabels.map((label) => (
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
                      {p.value}
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
                    {p.unit}
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
              {weather.airQuality.advice}
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
                CPCB station: {weather.airQuality.stationName}
                {weather.airQuality.stationDistanceKm != null
                  ? ` · ${weather.airQuality.stationDistanceKm} km away`
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
            No nearby CPCB station reading is available right now.
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
        <CardLabel>UV Index</CardLabel>
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
            {weather.uv.index}
          </div>
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#fb923c" }}>
              {weather.uv.label}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {weather.uv.recommendation}
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
          {weather.uv.scaleLabels.map((label) => (
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
              Peak Hours
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "white",
                marginTop: 4,
              }}
            >
              {weather.uv.peakHours}
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
              Burn Time
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: "#fb923c",
                marginTop: 4,
              }}
            >
              {weather.uv.burnTime}
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.38)",
            lineHeight: 1.6,
          }}
        >
          {weather.uv.advice}
        </div>
      </Card>

      <div style={{ height: 12 }} />

      {/* Pollen */}
      <Card
        grad="linear-gradient(140deg,#14532d 0%,#071a10 100%)"
        border="rgba(74,222,128,0.08)"
        pad={20}
      >
        <CardLabel>Pollen Outlook (Seasonal Estimate)</CardLabel>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: "white" }}>
            {weather.pollen.overall}
          </div>
          <div style={{ fontSize: 28 }}>{weather.pollen.icon}</div>
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
                {p.type}
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: p.color }}>
                {p.level}
              </span>
            </div>
            <Bar pct={p.percent} fill={p.color} height={3} />
          </div>
        ))}
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: "rgba(255,255,255,0.38)",
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            padding: "9px 12px",
            lineHeight: 1.55,
          }}
        >
          {weather.pollen.advice}
        </div>
      </Card>

      <div style={{ height: 12 }} />

      {/* Heat & Hydration */}
      <Card
        grad="linear-gradient(140deg,#1e3a5f 0%,#0a1830 100%)"
        border="rgba(96,165,250,0.08)"
        pad={20}
      >
        <CardLabel>Heat & Hydration</CardLabel>
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
              {weather.current.heatIndex}°
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.32)",
                marginTop: 4,
              }}
            >
              Heat Index (Approx.)
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
              {weather.current.humidity}%
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.32)",
                marginTop: 4,
              }}
            >
              Humidity
            </div>
          </div>
        </div>
        <div
          style={{
            background: "rgba(96,165,250,0.08)",
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 11,
            color: "#60a5fa",
            lineHeight: 1.6,
          }}
        >
          {weather.current.hydrationAdvice}
        </div>
      </Card>
    </div>
  )
}

// ── Forecast Tab ───────────────────────────────────────────────────────────────

function ForecastTab({ weather }: { weather: DashboardWeatherData }) {
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

  return (
    <div
      className="app-page forecast-screen"
      style={{ padding: "52px 16px 24px" }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "white",
          letterSpacing: "-0.03em",
          marginBottom: 18,
        }}
      >
        Extended Forecast
      </div>

      {/* 7 Day */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Next 7 Days</SectionLabel>
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
                {day.day}
              </div>
              <div
                style={{ display: "grid", placeItems: "center", fontSize: 22 }}
              >
                <WeatherIcon
                  conditionCode={day.conditionCode}
                  icon={day.icon}
                  label={day.condition}
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
                  {day.condition}
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
                  {day.rainChance}% rain
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.32)" }}>
                  {day.low}°
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
                  {day.high}°
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sun & Moon */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Sun & Moon</SectionLabel>
        <Card
          className="sun-moon-card"
          grad="linear-gradient(140deg,#1a2a4a 0%,#0d1730 100%)"
          border="rgba(255,255,255,0.06)"
          pad={20}
        >
          <div
            className="sun-times-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div className="sun-time-tile">
              <div className="sun-time-icon sunrise-icon">☼</div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#fbbf24",
                  marginTop: 6,
                }}
              >
                {weather.astronomy.sunrise}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.32)" }}>
                Sunrise
              </div>
            </div>
            <div className="sun-time-tile">
              <div className="sun-time-icon sunset-icon">◒</div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#f97316",
                  marginTop: 6,
                }}
              >
                {weather.astronomy.sunset}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.32)" }}>
                Sunset
              </div>
            </div>
          </div>
          <svg
            className="sun-path"
            viewBox="0 0 280 68"
            style={{ width: "100%", height: 58, marginBottom: 4 }}
          >
            <path
              d="M10 60 Q140 -12 270 60"
              fill="none"
              stroke="rgba(251,191,36,0.22)"
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            <circle cx="140" cy="18" r="9" fill="#fbbf24" />
            <circle cx="140" cy="18" r="15" fill="rgba(251,191,36,0.14)" />
            <line
              x1="0"
              y1="61"
              x2="280"
              y2="61"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          </svg>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 9,
              color: "rgba(255,255,255,0.22)",
              marginBottom: 16,
            }}
          >
            <span>{weather.astronomy.sunrise}</span>
            <span style={{ color: "#fbbf24", fontWeight: 700 }}>
              Solar noon · {weather.astronomy.solarNoon}
            </span>
            <span>{weather.astronomy.sunset}</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {[
              {
                icon: "◐",
                label: "Moon Phase",
                val: weather.astronomy.moonPhase,
                className: "moon-detail-tile",
              },
              {
                icon: "☼",
                label: "Golden Hour",
                val: weather.astronomy.goldenHour,
                className: "golden-hour-tile",
              },
              {
                icon: "◔",
                label: "Moonrise",
                val: weather.astronomy.moonrise,
                className: "moon-detail-tile",
              },
            ].map((m) => (
              <div
                key={m.label}
                className={`sun-detail-tile ${m.className}`}
                style={{ textAlign: "center" }}
              >
                <div className="sun-detail-icon">{m.icon}</div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "white",
                    marginTop: 5,
                  }}
                >
                  {m.val}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.28)",
                    marginTop: 2,
                  }}
                >
                  {m.label}
                </div>
                {m.label === "Golden Hour" && (
                  <div className="golden-progress">
                    <span />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Monthly Rainfall */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>{weather.rainfall.monthLabel} Rainfall</SectionLabel>
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
                    {weather.rainfall.month}{" "}
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 400,
                        color: "rgba(255,255,255,0.35)",
                      }}
                    >
                      {weather.rainfall.unit}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "rgba(255,255,255,0.32)",
                      marginTop: 4,
                    }}
                  >
                    of ~{weather.rainfall.monthlyAverage}
                    {weather.rainfall.unit} {weather.rainfall.monthLabel} avg
                  </div>
                </div>
                <div
                  style={{ fontSize: 11, color: "#60a5fa", fontWeight: 800 }}
                >
                  {Math.round(monthlyRainfallPercent)}%
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
              Monthly rainfall data unavailable.
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
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Comfort Index */}
      <SectionLabel>Comfort & Feel</SectionLabel>
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
                color: "#f87171",
                lineHeight: 1,
              }}
            >
              {weather.comfort.index}
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#f87171",
                marginTop: 5,
              }}
            >
              {weather.comfort.label}
            </div>
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                marginTop: 2,
              }}
            >
              Comfort Index (Estimate)
            </div>
          </div>
          <div style={{ fontSize: 36 }}>{weather.comfort.icon}</div>
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
                {factor.label}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "white" }}>
                {factor.value}
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
          {weather.comfort.advice}
        </div>
      </Card>
    </div>
  )
}

// ── Alerts Tab ─────────────────────────────────────────────────────────────────

function AlertsTab({ weather }: { weather: DashboardWeatherData }) {
  return (
    <div
      className="app-page alerts-screen"
      style={{ padding: "52px 16px 24px" }}
    >
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "white",
          letterSpacing: "-0.03em",
          marginBottom: 18,
        }}
      >
        Alerts & Travel
      </div>

      {/* Active Alerts */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Active Alerts · {weather.alerts.length}</SectionLabel>
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
                      style={{ fontSize: 13, fontWeight: 700, color: "white" }}
                    >
                      {a.title}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.28)",
                        marginLeft: 8,
                        flexShrink: 0,
                      }}
                    >
                      {a.time}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.52)",
                      lineHeight: 1.55,
                    }}
                  >
                    {a.body}
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
                    {a.level.toUpperCase()} ALERT · {a.source}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Locations */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Saved Locations</SectionLabel>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          {weather.locations.map((location) => (
            <div
              key={location.name}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 16,
                padding: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    placeItems: "center",
                    fontSize: 22,
                  }}
                >
                  <WeatherIcon
                    conditionCode={location.conditionCode}
                    icon={location.icon}
                    label={location.condition}
                  />
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.28)",
                    fontWeight: 600,
                  }}
                >
                  {location.distance}
                </div>
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "white",
                  marginBottom: 2,
                }}
              >
                {location.name}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.38)",
                  marginBottom: 8,
                }}
              >
                {location.condition}
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "white" }}>
                {location.temperature}°
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Packing List */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Today's Packing List</SectionLabel>
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
            {weather.packing.title}
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
                {p.icon}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>
                  {p.item}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "rgba(255,255,255,0.32)",
                    marginTop: 1,
                  }}
                >
                  {p.reason}
                </div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Seasonal event planner */}
      <SectionLabel>{weather.event.sectionLabel}</SectionLabel>
      <Card
        grad="linear-gradient(140deg,rgba(251,191,36,0.08) 0%,rgba(239,68,68,0.04) 100%)"
        border="rgba(251,191,36,0.14)"
        pad={18}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 14,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#fbbf24",
                marginBottom: 3,
              }}
            >
              {weather.event.icon} {weather.event.title}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)" }}>
              {weather.event.dateRange} · Starts in {weather.event.daysAway}{" "}
              days
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.32)" }}>
              Expected
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>
              {weather.event.expectedSeason}
            </div>
          </div>
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
              padding: 10,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>
              {weather.event.expectedTemperature}°C avg
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.32)",
                marginTop: 2,
              }}
            >
              Expected temp
            </div>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: 10,
              padding: 10,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 800, color: "#4ade80" }}>
              {weather.event.rainLabel}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(255,255,255,0.32)",
                marginTop: 2,
              }}
            >
              ~{weather.event.rainChance}% chance
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.45)",
            lineHeight: 1.55,
          }}
        >
          {weather.event.advice}
        </div>
      </Card>
    </div>
  )
}

// ── Personal setup ─────────────────────────────────────────────────────────────

type SetupStep = "welcome" | "name" | "body" | "sensitivities" | "routine"
export type Profile = {
  name: string
  sensitivities: string[]
  concerns: string[]
  goals: string[]
  age: number
  height: number
  weight: number
  activity: string
}
type PersonalizationVariant = "skin-sun" | "uv-heat" | "uv-sun" | "air-quality" | "cold" | "general"
export type PersonalizedIcon = "sun" | "outdoor" | "comfort" | "shield" | "cold" | "temperature" | "evening" | "air" | "indoor" | "rain" | "wind"
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

export function getPersonalizedWeather(
  profile: Profile,
  weather: DashboardWeatherData = DEMO_WEATHER_DATA,
): PersonalizedWeather {
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
  const temperatureRange = `${current.low}–${current.high}°C`
  const outdoorWindow = `${running.start}–${running.end}`

  if (variant === "skin-sun") {
    return {
      variant,
      ...base,
      headline: `${uv.label} UV calls for a gentler outdoor plan.`,
      overview: `${current.condition} conditions are around ${current.temperature}°C, with UV at ${uv.index}. Since you marked skin sensitivity, plan longer outdoor time outside the ${uv.peakHours} peak and follow today’s protection guidance.`,
      window: outdoorWindow,
      factors: [
        { label: "UV", value: `${uv.index} · ${uv.label}` },
        { label: "Humidity", value: `${current.humidity}%` },
        { label: "Temperature", value: `${current.temperature}°C` },
      ],
      tiles: [
        {
          icon: "shield",
          title: "Skin & Sun",
          value: `UV ${uv.index} · ${uv.label}`,
          detail: uv.recommendation,
          tone: "rose",
        },
        {
          icon: "sun",
          title: "Exposure",
          value: `Peak ${uv.peakHours}`,
          detail: `Burn time ${uv.burnTime}`,
          tone: "amber",
        },
        {
          icon: "outdoor",
          title: "Safer window",
          value: outdoorWindow,
          detail: running.summary,
          tone: "green",
        },
        {
          icon: "evening",
          title: "Evening",
          value: astronomy.goldenHour,
          detail: `Sunset ${astronomy.sunset}`,
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: `Use ${outdoorWindow} for outdoor plans`,
          reason: running.summary,
        },
        {
          icon: "shield",
          title: uv.recommendation,
          reason: `UV is ${uv.index} (${uv.label}) today.`,
        },
        {
          icon: "evening",
          title: "Choose a calmer evening window",
          reason: `Golden hour begins around ${astronomy.goldenHour}.`,
        },
      ],
    }
  }

  if (variant === "uv-heat") {
    return {
      variant,
      ...base,
      headline: `${current.condition}, with heat and UV worth planning around.`,
      overview: `It is ${current.temperature}°C and feels like ${current.feelsLike}°C. UV is ${uv.index} (${uv.label}), peaking ${uv.peakHours}. Your better activity window is ${outdoorWindow}.`,
      window: outdoorWindow,
      factors: [
        { label: "UV", value: `${uv.index} · ${uv.label}` },
        { label: "Feels like", value: `${current.feelsLike}°C` },
        { label: "Humidity", value: `${current.humidity}%` },
      ],
      tiles: [
        {
          icon: "sun",
          title: "UV & Heat",
          value: `UV ${uv.index} · ${uv.label}`,
          detail: `Peak ${uv.peakHours}`,
          tone: "amber",
        },
        {
          icon: "outdoor",
          title: "Outdoor",
          value: outdoorWindow,
          detail: running.summary,
          tone: "green",
        },
        {
          icon: "comfort",
          title: "Comfort",
          value: `Feels ${current.feelsLike}°C`,
          detail: `Heat index ${current.heatIndex}°C`,
          tone: "rose",
        },
        {
          icon: "sun",
          title: "Sun",
          value: `Sunrise ${astronomy.sunrise}`,
          detail: `Sunset ${astronomy.sunset}`,
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: `Use ${outdoorWindow} for longer activity`,
          reason: running.summary,
        },
        {
          icon: "comfort",
          title: "Keep the peak heat lighter",
          reason: `It may feel close to ${current.feelsLike}°C.`,
        },
        {
          icon: "shield",
          title: uv.recommendation,
          reason: `Peak exposure is ${uv.peakHours}.`,
        },
      ],
    }
  }

  if (variant === "uv-sun") {
    return {
      variant,
      ...base,
      headline: `${uv.label} UV, with a softer outdoor window.`,
      overview: `${current.condition} conditions are expected today. UV is ${uv.index}, with peak exposure ${uv.peakHours}; the suggested activity window is ${outdoorWindow}.`,
      window: outdoorWindow,
      factors: [
        { label: "UV", value: `${uv.index} · ${uv.label}` },
        { label: "Sunrise", value: astronomy.sunrise },
        { label: "Sunset", value: astronomy.sunset },
      ],
      tiles: [
        {
          icon: "sun",
          title: "UV",
          value: `${uv.index} · ${uv.label}`,
          detail: `Peak ${uv.peakHours}`,
          tone: "amber",
        },
        {
          icon: "evening",
          title: "Sun",
          value: astronomy.goldenHour,
          detail: `Sunset ${astronomy.sunset}`,
          tone: "violet",
        },
        {
          icon: "outdoor",
          title: "Outdoors",
          value: outdoorWindow,
          detail: running.summary,
          tone: "green",
        },
        {
          icon: "shield",
          title: "Sun protection",
          value: uv.recommendation,
          detail: `Burn time ${uv.burnTime}`,
          tone: "rose",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: `Plan activity for ${outdoorWindow}`,
          reason: running.summary,
        },
        {
          icon: "shield",
          title: uv.recommendation,
          reason: `UV is expected to reach ${uv.index}.`,
        },
        {
          icon: "evening",
          title: "Use the golden-hour window",
          reason: `Gentler light begins around ${astronomy.goldenHour}.`,
        },
      ],
    }
  }

  if (variant === "cold") {
    return {
      variant,
      ...base,
      headline: `${current.condition}, ranging from ${temperatureRange}.`,
      overview: `Today is ${current.temperature}°C with a low of ${current.low}°C. Since you marked cold sensitivity, use the suggested ${outdoorWindow} window and keep a layer ready around the cooler edges of the day.`,
      window: outdoorWindow,
      factors: [
        { label: "Low", value: `${current.low}°C` },
        { label: "Now", value: `${current.temperature}°C` },
        { label: "High", value: `${current.high}°C` },
      ],
      tiles: [
        {
          icon: "cold",
          title: "Cold",
          value: `${current.low}°C low`,
          detail: "Coolest forecast reading",
          tone: "blue",
        },
        {
          icon: "comfort",
          title: "Comfort",
          value: `${current.feelsLike}°C feel`,
          detail: weather.comfort.label,
          tone: "green",
        },
        {
          icon: "temperature",
          title: "Temperature",
          value: `${current.high}°C high`,
          detail: current.condition,
          tone: "amber",
        },
        {
          icon: "evening",
          title: "Evening",
          value: `Sunset ${astronomy.sunset}`,
          detail: `Range ${temperatureRange}`,
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "outdoor",
          title: `Use ${outdoorWindow} for outdoor plans`,
          reason: running.summary,
        },
        {
          icon: "cold",
          title: "Keep a light extra layer ready",
          reason: `The forecast low is ${current.low}°C.`,
        },
        {
          icon: "evening",
          title: "Recheck conditions near sunset",
          reason: `Sunset is at ${astronomy.sunset}.`,
        },
      ],
    }
  }

  if (variant === "air-quality" && airQuality) {
    return {
      variant,
      ...base,
      headline: `Air quality is ${airQuality.label.toLowerCase()} today.`,
      overview: `AQI is ${airQuality.index}. ${airQuality.advice}`,
      window: outdoorWindow,
      factors: [
        { label: "AQI", value: `${airQuality.index} · ${airQuality.label}` },
        {
          label: primaryPollutant?.label ?? "Pollutant",
          value: primaryPollutant
            ? `${primaryPollutant.value} ${primaryPollutant.unit}`
            : "Not available",
        },
        { label: "Visibility", value: `${current.visibility} km` },
      ],
      tiles: [
        {
          icon: "air",
          title: "Air quality",
          value: `AQI ${airQuality.index}`,
          detail: airQuality.label,
          tone: "rose",
        },
        {
          icon: "air",
          title: primaryPollutant?.label ?? "Pollution",
          value: primaryPollutant
            ? `${primaryPollutant.value} ${primaryPollutant.unit}`
            : "Not available",
          detail: "Primary reported pollutant",
          tone: "amber",
        },
        {
          icon: "indoor",
          title: "Guidance",
          value: airQuality.label,
          detail: airQuality.updatedLabel,
          tone: "green",
        },
        {
          icon: "outdoor",
          title: "Activity window",
          value: outdoorWindow,
          detail: running.summary,
          tone: "violet",
        },
      ],
      recommendations: [
        {
          icon: "air",
          title: `Plan for AQI ${airQuality.index}`,
          reason: airQuality.advice,
        },
        {
          icon: "outdoor",
          title: `Use ${outdoorWindow} if heading out`,
          reason: running.summary,
        },
        {
          icon: "indoor",
          title: "Recheck the latest reading",
          reason: airQuality.updatedLabel,
        },
      ],
    }
  }

  return {
    variant,
    ...base,
    headline: `${current.condition}, with today’s details in one place.`,
    overview: `It is ${current.temperature}°C and feels like ${current.feelsLike}°C. Rain chance is ${rainfall.chance}%, humidity is ${current.humidity}%, and winds are ${current.windSpeed} km/h ${current.windDirection}.`,
    window: outdoorWindow,
    basis: `Today’s ${current.city} conditions`,
    factors: [
      { label: "Temperature", value: `${current.temperature}°C` },
      { label: "Rain", value: `${rainfall.chance}%` },
      { label: "Humidity", value: `${current.humidity}%` },
      {
        label: "Wind",
        value: `${current.windSpeed} km/h ${current.windDirection}`,
      },
    ],
    tiles: [
      {
        icon: "rain",
        title: "Rain",
        value: `${rainfall.chance}% chance`,
        detail: `${rainfall.today} ${rainfall.unit} ${rainfall.periodLabel.toLowerCase()}`,
        tone: "blue",
      },
      {
        icon: "comfort",
        title: "Comfort",
        value: `Feels ${current.feelsLike}°C`,
        detail: `${current.humidity}% humidity`,
        tone: "rose",
      },
      {
        icon: "wind",
        title: "Wind",
        value: `${current.windSpeed} km/h ${current.windDirection}`,
        detail: `Gusts ${current.windGust} km/h`,
        tone: "green",
      },
      {
        icon: "evening",
        title: "Sun",
        value: `Sunset ${astronomy.sunset}`,
        detail: `Golden hour ${astronomy.goldenHour}`,
        tone: "violet",
      },
    ],
    recommendations: [
      {
        icon: "outdoor",
        title: `Use ${outdoorWindow} for outdoor plans`,
        reason: running.summary,
      },
      {
        icon: "rain",
        title: `Plan for a ${rainfall.chance}% rain chance`,
        reason: `${rainfall.today} ${rainfall.unit} is reported ${rainfall.periodLabel.toLowerCase()}.`,
      },
      {
        icon: "comfort",
        title: `Expect it to feel like ${current.feelsLike}°C`,
        reason: `Humidity is ${current.humidity}%.`,
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
      !Array.isArray(profile.goals)
    )
      return null
    if (
      typeof profile.age !== "number" ||
      typeof profile.height !== "number" ||
      typeof profile.weight !== "number" ||
      typeof profile.activity !== "string"
    )
      return null
    // Rebuild the object explicitly so legacy profiles lose the old
    // hardcoded `location: "Kolkata"` field when they are next saved.
    return {
      name: profile.name,
      sensitivities: profile.sensitivities,
      concerns: profile.concerns,
      goals: profile.goals,
      age: profile.age,
      height: profile.height,
      weight: profile.weight,
      activity: profile.activity,
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
      <span className="chip-mark">{selected ? "✓" : "+"}</span>
      {label}
    </button>
  )
}

function Setup({
  weather,
  onComplete,
}: {
  weather: DashboardWeatherData
  onComplete: (profile: Profile) => void
}) {
  const [step, setStep] = useState<SetupStep>("welcome")
  const [name, setName] = useState("")
  const [age, setAge] = useState(29)
  const [height, setHeight] = useState(168)
  const [weight, setWeight] = useState(64)
  const [sex, setSex] = useState("Prefer not to say")
  const [sensitivities, setSensitivities] = useState<string[]>([])
  const [concerns, setConcerns] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>(["Daily energy"])
  const [activity, setActivity] = useState("Moderate")
  const [nameError, setNameError] = useState("")
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
      setNameError("Please enter your name to continue.")
      return
    }
    setNameError("")
    setStep(SETUP_STEPS[Math.min(stepIndex + 1, SETUP_STEPS.length - 1)])
  }
  const back = () => setStep(SETUP_STEPS[Math.max(stepIndex - 1, 0)])
  const slider = (
    label: string,
    value: number,
    min: number,
    max: number,
    unit: string,
    setValue: (value: number) => void,
  ) => (
    <div className="setup-slider-row">
      <div className="setup-slider-heading">
        <span>
          <i>◈</i>
          {label}
        </span>
        <strong>
          {value} <small>{unit}</small>
        </strong>
      </div>
      <div className="slider-console">
        <div className="slider-ticks">
          {Array.from({ length: 11 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
        <input
          className="vayu-slider setup-range"
          style={
            {
              "--slider-progress": `${((value - min) / (max - min)) * 100}%`,
            } as React.CSSProperties
          }
          type="range"
          min={min}
          max={max}
          value={value}
          aria-label={label}
          onChange={(event) => setValue(Number(event.target.value))}
        />
        <output
          className="slider-value-bubble"
          style={
            {
              "--slider-progress": `${((value - min) / (max - min)) * 100}%`,
            } as React.CSSProperties
          }
        >
          {value}
        </output>
      </div>
      <div className="range-ends">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  )
  return (
    <main className="setup-shell">
      <div className="setup-noise" />
      <div className="setup-topbar">
        <div className="brand-mark">
          <span>✦</span> MAUSAM
        </div>
        {step !== "welcome" && (
          <div className="setup-progress">
            <span style={{ width: `${Math.max(9, (stepIndex / 4) * 100)}%` }} />
          </div>
        )}
        {step !== "welcome" && (
          <button className="setup-back" onClick={back} type="button">
            ←
          </button>
        )}
      </div>
      <div className="setup-content">
        {step === "welcome" && (
          <section className="setup-hero welcome-glass setup-animate">
            <div className="welcome-orb welcome-orb-a" />
            <div className="welcome-orb welcome-orb-b" />
            <div className="welcome-menu">
              <span className="welcome-menu-active">today</span>
              <span>discover</span>
              <span>for you</span>
              <span>mausam</span>
            </div>
            <div className="welcome-brand">
              <span>✦</span> MAUSAM
            </div>
            <div className="setup-eyebrow">PERSONAL WEATHER INTELLIGENCE</div>
            <h1>
              feel the
              <br />
              <em>weather.</em>
            </h1>
            <p>
              Personal signals for a clearer day. Mausam turns the air, light
              and rain around you into guidance made for your body.
            </p>
            <div className="welcome-reading">
              <span className="reading-dot" />
              <div>
                <small>FIRST READING</small>
                <strong>
                  {weather.current.city} · {weather.current.condition}
                </strong>
              </div>
              <b>{weather.current.temperature}°</b>
            </div>
            <button className="welcome-start" onClick={next} type="button">
              <span>start your profile</span>
              <b>→</b>
            </button>
            <div className="setup-footnote">
              Your weather. Your rhythm. Your way.
            </div>
          </section>
        )}
        {step === "name" && (
          <section className="setup-panel setup-name-panel setup-animate">
            <div className="setup-eyebrow">01 / YOUR NAME</div>
            <h2>
              What should we
              <br />
              <em>call you?</em>
            </h2>
            <p className="setup-copy">
              Your name is used only to make your daily Mausam briefing feel
              personal.
            </p>
            <label className="setup-label" htmlFor="profile-name">
              YOUR NAME <span>REQUIRED</span>
            </label>
            <input
              id="profile-name"
              className={`setup-input${nameError ? " input-error" : ""}`}
              autoComplete="name"
              placeholder="Enter your name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setNameError("")
              }}
              aria-invalid={Boolean(nameError)}
            />
            {nameError && <div className="setup-error">{nameError}</div>}
            <button className="setup-primary" onClick={next} type="button">
              Continue <span>→</span>
            </button>
          </section>
        )}
        {step === "body" && (
          <section className="setup-panel setup-animate">
            <div className="setup-eyebrow">02 / YOUR BASELINE</div>
            <h2>
              A little context
              <br />
              <em>goes a long way.</em>
            </h2>
            <p className="setup-copy">
              These numbers help us make hydration, heat and activity guidance
              more personal.
            </p>
            <div className="setup-body-stack">
              <div>
                <label className="setup-label">AGE</label>
                {slider("Age", age, 13, 90, "yrs", setAge)}
              </div>
              <div>
                <label className="setup-label">GENDER</label>
                <div className="gender-options">
                  {["Female", "Male", "Non-binary", "Prefer not to say"].map(
                    (item) => (
                      <button
                        key={item}
                        className={sex === item ? "active" : ""}
                        onClick={() => setSex(item)}
                        type="button"
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
              </div>
              {slider("Height", height, 120, 220, "cm", setHeight)}
              {slider("Weight", weight, 35, 180, "kg", setWeight)}
            </div>
            <button
              className="setup-primary"
              onClick={() => setStep("sensitivities")}
              type="button"
            >
              Save baseline <span>→</span>
            </button>
          </section>
        )}
        {step === "sensitivities" && (
          <section className="setup-panel setup-animate">
            <div className="setup-eyebrow">03 / YOUR RESPONSE</div>
            <h2>
              What does the
              <br />
              <em>weather stir up?</em>
            </h2>
            <p className="setup-copy">
              Select everything that affects you. We’ll surface the risk before
              it becomes a bad day.
            </p>
            <label className="setup-label">WEATHER & AIR TRIGGERS</label>
            <div className="setup-chips">
              {choiceSets.sensitivities.map((item) => (
                <SetupChip
                  key={item}
                  label={item}
                  selected={sensitivities.includes(item)}
                  onClick={() => toggle(item, sensitivities, setSensitivities)}
                />
              ))}
            </div>
            <label className="setup-label">
              HEALTH CONCERNS <span>OPTIONAL</span>
            </label>
            <div className="setup-chips">
              {choiceSets.concerns.map((item) => (
                <SetupChip
                  key={item}
                  label={item}
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
              Tune my alerts <span>→</span>
            </button>
          </section>
        )}
        {step === "routine" && (
          <section className="setup-panel setup-animate">
            <div className="setup-eyebrow">04 / YOUR RHYTHM</div>
            <h2>
              What should your
              <br />
              <em>day feel like?</em>
            </h2>
            <p className="setup-copy">
              We’ll turn conditions into useful nudges for the way you actually
              live.
            </p>
            <label className="setup-label">WHAT MATTERS MOST</label>
            <div className="setup-chips">
              {choiceSets.goals.map((item) => (
                <SetupChip
                  key={item}
                  label={item}
                  selected={goals.includes(item)}
                  onClick={() => toggle(item, goals, setGoals)}
                />
              ))}
            </div>
            <label className="setup-label">YOUR USUAL ACTIVITY</label>
            <div className="setup-segmented">
              {["Low", "Moderate", "High"].map((item) => (
                <button
                  key={item}
                  className={activity === item ? "active" : ""}
                  onClick={() => setActivity(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="setup-preview">
              <span>✦</span>
              <div>
                <strong>Your first insight</strong>
                <small>
                  {weather.current.condition} · {weather.current.temperature}°C
                  · {weather.current.humidity}% humidity. We’ll suggest your
                  best outdoor window and daily guidance.
                </small>
              </div>
            </div>
            <button
              className="setup-primary"
              onClick={() =>
                onComplete({
                  name,
                  sensitivities,
                  concerns,
                  goals,
                  age,
                  height,
                  weight,
                  activity,
                })
              }
              type="button"
            >
              Continue <span>→</span>
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

function PersonalizedIconGraphic({ name }: { name: PersonalizedIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "sun" && (
        <>
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2.5v2M12 19.5v2M4.7 4.7l1.4 1.4M17.9 17.9l1.4 1.4M2.5 12h2M19.5 12h2M4.7 19.3l1.4-1.4M17.9 6.1l1.4-1.4" />
        </>
      )}
      {name === "outdoor" && (
        <>
          <path d="M3 18h18M5 18l4-7 3 4 2-3 5 6" />
          <path d="M16 5h5v5M21 5l-6 6" />
        </>
      )}
      {name === "comfort" && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m8.5 12 2.2 2.2 4.8-5" />
        </>
      )}
      {name === "shield" && (
        <>
          <path d="M12 3 5.5 5.7v5.2c0 4.2 2.6 7.8 6.5 10.1 3.9-2.3 6.5-5.9 6.5-10.1V5.7Z" />
          <path d="M9.2 12.2 11 14l3.9-4" />
        </>
      )}
      {name === "cold" && (
        <>
          <path d="M12 2.5v19M4.6 6.8l14.8 10.4M19.4 6.8 4.6 17.2M8 4.8l4 2.3 4-2.3M8 19.2l4-2.3 4 2.3" />
        </>
      )}
      {name === "temperature" && (
        <>
          <path d="M14.5 14.2V5.5a3 3 0 0 0-6 0v8.7a5 5 0 1 0 6 0Z" />
          <path d="M11.5 7v9" />
        </>
      )}
      {name === "evening" && (
        <path d="M20 15.3A8.5 8.5 0 0 1 8.7 4 8.5 8.5 0 1 0 20 15.3Z" />
      )}
      {name === "air" && (
        <>
          <path d="M3 8h10.5a2.5 2.5 0 1 0-2.3-3.5M3 12h16a2.5 2.5 0 1 1-2.3 3.5M3 16h7" />
        </>
      )}
      {name === "indoor" && (
        <>
          <path d="m3 11 9-7 9 7" />
          <path d="M5.5 9.5V20h13V9.5M10 20v-6h4v6" />
        </>
      )}
      {name === "rain" && (
        <>
          <path d="M6.5 15.5h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.6 9.2a3.2 3.2 0 0 0-.1 6.3Z" />
          <path d="m8 18-1 2M12.5 18l-1 2M17 18l-1 2" />
        </>
      )}
      {name === "wind" && (
        <>
          <path d="M3 8h11a2.5 2.5 0 1 0-2.3-3.5M3 12h17M3 16h11a2.5 2.5 0 1 1-2.3 3.5" />
        </>
      )}
    </svg>
  )
}

function PersonalizedWeatherPage({
  profile,
  location,
  weather,
  onBack,
}: {
  profile: Profile
  location: UserLocation
  weather: DashboardWeatherData
  onBack: () => void
}) {
  const localFallback = useMemo(
    () => getPersonalizedWeather(profile, weather),
    [profile, weather],
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
          aria-label="Back to home"
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
          <strong>Your Mausam</strong>
          <span>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
            </svg>
            {formatUserLocation(location)}
          </span>
        </div>
      </header>

      <section className="personalized-intro">
        <span className="personalized-eyebrow">
          FOR {profile.name || "YOU"}
        </span>
        <h1>
          Your weather,
          <br />
          <span>made personal.</span>
        </h1>
        <p>A clear view of today, shaped around what matters to you.</p>
      </section>

      <article className="personalized-overview personalized-glass">
        <div className="personalized-card-heading">
          <span className="personalized-spark" aria-hidden="true">
            ✦
          </span>
          <div>
            <span>Today at a glance</span>
          </div>
        </div>
        <h2>{personalized.headline}</h2>
        <p>{personalized.overview}</p>
        <div
          className="personalized-factor-pills"
          aria-label="Key weather factors"
        >
          {personalized.factors.slice(0, 3).map((factor) => (
            <span key={factor.label}>
              <small>{factor.label}</small>
              <strong>{factor.value}</strong>
            </span>
          ))}
        </div>
        <div className="personalized-window">
          <span className="personalized-window-icon">
            <PersonalizedIconGraphic name="outdoor" />
          </span>
          <div>
            <small>{personalized.windowLabel}</small>
            <strong>{personalized.window}</strong>
          </div>
        </div>
        <div className="personalized-basis">
          <span>✦</span> Based on your profile · {personalized.basis}
        </div>
      </article>

      <section
        className="personalized-section"
        aria-labelledby="personalized-tiles-title"
      >
        <div className="personalized-section-heading">
          <div>
            <span>FOR YOUR DAY</span>
            <h2 id="personalized-tiles-title">Today, personalized for you</h2>
          </div>
          <small>{personalized.tiles.length} essentials</small>
        </div>
        <div className="personalized-tile-grid">
          {personalized.tiles.map((tile) => (
            <article
              className={`personalized-tile personalized-glass tone-${tile.tone}`}
              key={tile.title}
            >
              <span className="personalized-tile-icon">
                <PersonalizedIconGraphic name={tile.icon} />
              </span>
              <span className="personalized-tile-title">{tile.title}</span>
              <strong>{tile.value}</strong>
              <small>{tile.detail}</small>
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
            <span>SIMPLE NEXT STEPS</span>
            <h2 id="personalized-actions-title">What should I do?</h2>
          </div>
        </div>
        <div className="personalized-actions personalized-glass">
          {personalized.recommendations.map((recommendation, index) => (
            <article key={recommendation.title}>
              <span className="personalized-action-number">0{index + 1}</span>
              <span className="personalized-action-icon">
                <PersonalizedIconGraphic name={recommendation.icon} />
              </span>
              <div>
                <strong>{recommendation.title}</strong>
                <p>{recommendation.reason}</p>
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
            <strong>Why these recommendations?</strong>
            <small>See the signals used for your briefing</small>
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
            <p>
              Mausam combines today’s weather factors with the sensitivities you
              selected during setup.
            </p>
            <div className="personalized-factor-list">
              {personalized.factors.map((factor) => (
                <div key={factor.label}>
                  <span>{factor.label}</span>
                  <strong>{factor.value}</strong>
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
                  <span key={item}>{item}</span>
                ))}
              {!profile.sensitivities.length &&
                !profile.concerns.filter((item) => item !== "None of these")
                  .length && <span>General weather profile</span>}
            </div>
          </div>
        </div>
      </section>

      {personalized.disclaimer && (
        <p className="personalized-disclaimer">{personalized.disclaimer}</p>
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
  const [entryProgress, setEntryProgress] = useState(0)
  return (
    <main className="setup-shell">
      <div className="setup-noise" />
      <div className="setup-topbar">
        <div className="brand-mark">
          <span>✦</span> MAUSAM
        </div>
        {onBack && (
          <button
            className="setup-back"
            onClick={onBack}
            type="button"
            aria-label="Go back"
          >
            ←
          </button>
        )}
      </div>
      <div className="setup-content">
        <section className="setup-panel setup-login setup-animate">
          <div className="login-symbol">✦</div>
          <div className="setup-eyebrow">MAUSAM PROFILE READY</div>
          <h2>
            Your world,
            <br />
            <em>in sync.</em>
          </h2>
          <p className="setup-copy">
            Your personal weather intelligence is ready. Pull the slider to
            enter your daily view.
          </p>
          <div
            className="entry-slider"
            style={
              {
                "--entry-progress": `${entryProgress}%`,
                "--entry-progress-ratio": entryProgress / 100,
              } as React.CSSProperties
            }
          >
            <input
              aria-label="Slide to enter Mausam"
              type="range"
              min="0"
              max="100"
              value={entryProgress}
              onChange={(event) => {
                const value = Number(event.target.value)
                setEntryProgress(value)
                if (value === 100) onComplete()
              }}
            />
            <span />
            <strong>
              SLIDE TO DIVE IN <b>→</b>
            </strong>
            <i className="entry-handle">→</i>
          </div>
          <div className="setup-consent">
            Your answers stay on this device until you choose to create an
            account.
          </div>
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
  const [locating, setLocating] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [manualOpen, setManualOpen] = useState(false)
  const [manualQuery, setManualQuery] = useState("")
  const [manualResults, setManualResults] = useState<LocationSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState("")

  const finishSelection = async (
    location: UserLocation,
    enrichedLocation?: Promise<UserLocation>,
  ) => {
    const [locationResult, weatherResult] = await Promise.allSettled([
      enrichedLocation ?? Promise.resolve(location),
      fetchWeatherDashboard(location),
    ])
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
    saveLocation(resolvedLocation)
    onResolved(resolvedLocation, resolvedWeather)
  }

  const useCurrentLocation = async () => {
    setLocating(true)
    setErrorMessage("")
    try {
      const coordinates = await resolveDeviceCoordinates()
      // Address resolution and weather are independent once coordinates
      // exist. Fetching them together avoids a serial network round trip
      // and prevents demo temperature/time data flashing on the dashboard.
      await finishSelection(coordinates, enrichDeviceLocation(coordinates))
    } catch (error) {
      const reason =
        error instanceof GeolocationError
          ? error.reason
          : "position-unavailable"
      setErrorMessage(
        reason === "permission-denied"
          ? "Location access is blocked. Allow it in this browser’s Site Permissions, then try again — or search manually."
          : reason === "insecure-context"
            ? "Location only works on HTTPS or localhost. Open the local preview at http://localhost:8443 and try again."
            : reason === "unsupported"
              ? "Location isn't supported on this device. Search for your area instead."
              : reason === "services-disabled"
                ? "Location permission is allowed, but device Location Services are off. Turn them on and try again."
                : reason === "timeout"
                  ? "Location took too long to respond. Check that device Location Services are on, then try again — or search manually."
                  : "Permission was allowed, but the device did not provide coordinates. Enable Location Services for your browser or VS Code, then try again — or search manually.",
      )
      setManualOpen(true)
    } finally {
      setLocating(false)
    }
  }

  const runSearch = async (query: string) => {
    setManualQuery(query)
    setSearchError("")
    if (!query.trim()) {
      setManualResults([])
      return
    }
    if (/^\d+$/.test(query.trim()) && !/^[1-9]\d{5}$/.test(query.trim())) {
      setManualResults([])
      setSearchError("Enter a valid 6-digit Indian PIN code.")
      return
    }
    setSearching(true)
    try {
      const results = await searchLocations(query)
      setManualResults(results)
      if (results.length === 0)
        setSearchError(
          "No matching location was found in India. Check the area name or PIN code.",
        )
    } catch {
      setManualResults([])
      setSearchError(
        "Location search is temporarily unavailable. Please try again.",
      )
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
          <span>✦</span> MAUSAM
        </div>
        {onBack && (
          <button
            className="setup-back"
            onClick={onBack}
            type="button"
            aria-label="Go back"
          >
            ←
          </button>
        )}
      </div>
      <div className="setup-content">
        <section className="setup-panel setup-animate">
          <div className="setup-eyebrow">ALMOST THERE</div>
          <h2>
            Where are
            <br />
            <em>you right now?</em>
          </h2>
          <p className="setup-copy">
            Mausam needs your real location to show live, accurate weather for
            where you actually are — not a fixed city.
          </p>

          <button
            className="setup-primary"
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
          >
            {locating ? "Finding you…" : "Use my current area"} <span>→</span>
          </button>

          {errorMessage && <div className="setup-error">{errorMessage}</div>}

          <button
            type="button"
            style={{
              marginTop: 16,
              background: "none",
              border: 0,
              color: "rgba(255,255,255,0.6)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
            onClick={() => setManualOpen((open) => !open)}
          >
            Search manually instead
          </button>

          {manualOpen && (
            <div style={{ marginTop: 12 }}>
              <form
                className="location-search-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void runSearch(manualQuery)
                }}
              >
                <label className="setup-label" htmlFor="india-location-search">
                  SEARCH INDIA BY AREA, CITY OR 6-DIGIT PIN
                </label>
                <div className="location-search-row">
                  <input
                    id="india-location-search"
                    className="setup-input"
                    inputMode="search"
                    autoComplete="postal-code"
                    placeholder="e.g. Kadamtala or 711101"
                    value={manualQuery}
                    onChange={(event) => {
                      setManualQuery(event.target.value)
                      setManualResults([])
                      setSearchError("")
                    }}
                  />
                  <button
                    type="submit"
                    className="location-search-button"
                    disabled={searching || !manualQuery.trim()}
                  >
                    {searching ? "…" : "Search"}
                  </button>
                </div>
              </form>
              {searching && <div className="setup-copy">Searching…</div>}
              {searchError && <div className="setup-error">{searchError}</div>}
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
                  onClick={() => chooseResult(result)}
                >
                  <span className="location-icon">◉</span>
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
            style={{
              marginTop: 16,
              background: "none",
              border: 0,
              color: "rgba(255,255,255,0.4)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
            onClick={useDemoLocation}
          >
            Continue with Kolkata demo location
          </button>
        </section>
      </div>
    </main>
  )
}

// ── App Root ───────────────────────────────────────────────────────────────────

export default function App() {
  // Development-only, one-shot route for reviewing the complete onboarding
  // without manually clearing browser storage. The query parameter is
  // removed immediately so completing onboarding still persists normally.
  resetOnboardingPreviewIfRequested()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [profile, setProfile] = useState<Profile | null>(loadStoredProfile)
  const [weather, setWeather] =
    useState<DashboardWeatherData>(DEMO_WEATHER_DATA)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(
    loadStoredLocation,
  )
  const [pendingLocation, setPendingLocation] = useState<{
    location: UserLocation
    weather?: DashboardWeatherData
  } | null>(null)
  const [weatherSource, setWeatherSource] =
    useState<"demo" | "loading" | "live" | "error">(() =>
      import.meta.env.VITE_WEATHER_API_URL?.trim() && loadStoredLocation()
        ? "loading"
        : "demo",
    )
  const [tab, setTab] = useState<Tab>("home")
  const [showPersonalized, setShowPersonalized] = useState(false)
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    localStorage.getItem("mausam-theme") === "dark" ? "dark" : "light",
  )
  const prefetchedLocationKey = useRef<string | null>(null)

  const resolveLocation = (
    location: UserLocation,
    prefetchedWeather?: DashboardWeatherData,
  ) => {
    if (prefetchedWeather) {
      setWeather(prefetchedWeather)
      setWeatherSource(
        import.meta.env.VITE_WEATHER_API_URL?.trim() ? "live" : "demo",
      )
      prefetchedLocationKey.current = `${location.latitude},${location.longitude}`
    }
    setUserLocation(location)
  }

  useEffect(() => {
    localStorage.setItem("mausam-theme", theme)
  }, [theme])

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

    const controller = new AbortController()
    const endpointConfigured = Boolean(
      import.meta.env.VITE_WEATHER_API_URL?.trim(),
    )
    const configuredRefresh = Number(import.meta.env.VITE_WEATHER_REFRESH_MS)
    const refreshMs =
      Number.isFinite(configuredRefresh) && configuredRefresh >= 10_000
        ? configuredRefresh
        : 300_000

    const refreshWeather = async () => {
      try {
        const nextWeather = await fetchWeatherDashboard(
          userLocation,
          controller.signal,
        )
        setWeather(nextWeather)
        setWeatherSource(endpointConfigured ? "live" : "demo")
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        setWeatherSource("error")
      }
    }

    const locationKey = `${userLocation.latitude},${userLocation.longitude}`
    if (prefetchedLocationKey.current === locationKey) {
      prefetchedLocationKey.current = null
    } else {
      void refreshWeather()
    }
    const refreshTimer = endpointConfigured
      ? window.setInterval(refreshWeather, refreshMs)
      : undefined

    return () => {
      controller.abort()
      if (refreshTimer !== undefined) window.clearInterval(refreshTimer)
    }
  }, [userLocation])

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [tab, showPersonalized])

  if (!profile) return <Setup weather={weather} onComplete={setProfile} />

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
  // Asserts non-null values for the rest of the app render tree.
  if (!userLocation || !weather) return null

  return (
    <div
      className={`mausam-app theme-${theme}`}
      data-theme={theme}
      data-weather-source={weatherSource}
      style={{
        background: "#04050a",
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
          background: "#07080e",
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
          {showPersonalized ? (
            <PersonalizedWeatherPage
              profile={profile}
              location={userLocation}
              weather={weather}
              onBack={() => setShowPersonalized(false)}
            />
          ) : (
            <>
              {tab === "home" && (
                <HomeTab
                  profile={profile}
                  location={userLocation}
                  theme={theme}
                  setTheme={setTheme}
                  onOpenPersonalized={() => setShowPersonalized(true)}
                  onChangeLocation={() => {
                    clearStoredLocation()
                    setUserLocation(null)
                  }}
                  weather={weather}
                />
              )}
              {tab === "health" && <HealthTab weather={weather} />}
              {tab === "forecast" && <ForecastTab weather={weather} />}
              {tab === "alerts" && <AlertsTab weather={weather} />}
            </>
          )}
        </div>
        {!showPersonalized && <BottomNav tab={tab} setTab={setTab} />}
      </div>
    </div>
  )
}
