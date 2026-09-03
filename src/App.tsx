import { useState, useEffect, type ReactNode } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = 'home' | 'health' | 'forecast' | 'alerts'

// ── Kolkata Data · Monsoon Season · 28 August 2026 ────────────────────────────
const W = {
  city: 'Kolkata', region: 'West Bengal',
  temp: 31, feelsLike: 37, condition: 'Heavy Monsoon Rain',
  high: 32, low: 25,
  humidity: 89, wind: 22, windDir: 'SW', windGust: 38,
  visibility: 3.2, pressure: 1008, dewPoint: 28,
  aqi: 78, pm25: 42, pm10: 68, o3: 38, no2: 22, aqiLabel: 'Moderate',
  uvIndex: 6, uvLabel: 'High',
  pollenTree: 'Low', pollenGrass: 'Moderate', pollenWeed: 'High',
  sunrise: '5:21 AM', sunset: '6:14 PM',
  rainChance: 92, rainfall24h: 34.2, rainfallMonth: 312,
  bestRunStart: '5:30', bestRunEnd: '7:00 AM',
  waveHeight: 2.1, waterTemp: 28, tideHigh: '11:23 AM', tideLow: '5:42 AM',
  comfortIndex: 38, heatIndex: 41,
  soilMoisture: 'Saturated', cropAdvice: 'Aman rice transplanting season',
  festivalDays: 33,
}

const HOURLY = [
  { t: 'Now', temp: 31, icon: '⛈️', rain: 92 },
  { t: '1 PM', temp: 30, icon: '⛈️', rain: 95 },
  { t: '2 PM', temp: 29, icon: '⛈️', rain: 88 },
  { t: '3 PM', temp: 30, icon: '🌦️', rain: 72 },
  { t: '4 PM', temp: 31, icon: '🌦️', rain: 65 },
  { t: '5 PM', temp: 30, icon: '🌧️', rain: 80 },
  { t: '6 PM', temp: 29, icon: '🌧️', rain: 85 },
  { t: '7 PM', temp: 28, icon: '🌦️', rain: 68 },
  { t: '8 PM', temp: 27, icon: '🌧️', rain: 58 },
  { t: '9 PM', temp: 27, icon: '🌧️', rain: 45 },
]

const WEEKLY = [
  { day: 'Today', hi: 31, lo: 25, icon: '⛈️', rain: 92, desc: 'Thunderstorms' },
  { day: 'Fri', hi: 30, lo: 25, icon: '🌧️', rain: 85, desc: 'Heavy Rain' },
  { day: 'Sat', hi: 32, lo: 26, icon: '🌦️', rain: 60, desc: 'Showers' },
  { day: 'Sun', hi: 33, lo: 27, icon: '🌤️', rain: 30, desc: 'Partly Cloudy' },
  { day: 'Mon', hi: 34, lo: 27, icon: '⛅', rain: 40, desc: 'Cloudy' },
  { day: 'Tue', hi: 31, lo: 25, icon: '🌧️', rain: 80, desc: 'Rain' },
  { day: 'Wed', hi: 30, lo: 24, icon: '⛈️', rain: 90, desc: 'Storms' },
]

const ALERTS = [
  {
    level: 'Red', dot: '#ef4444',
    bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)',
    title: 'Heavy Rainfall Warning',
    body: 'IMD red alert: 115mm+ rain expected in next 24h. Avoid underpasses, the Maidan, and low-lying Behala.',
    time: '2h ago',
  },
  {
    level: 'Orange', dot: '#f97316',
    bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)',
    title: 'Waterlogging — EM Bypass',
    body: 'Severe waterlogging on EM Bypass, Park Street, Kasba. Metro running on modified schedule. Allow extra time.',
    time: '3h ago',
  },
  {
    level: 'Yellow', dot: '#eab308',
    bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)',
    title: 'Ganga Ferry Suspended',
    body: 'Wind gusts 45 km/h. All ferry services on the Hooghly (Howrah–Chandpal Ghat) suspended until further notice.',
    time: '5h ago',
  },
]

const LOCATIONS = [
  { name: 'Darjeeling', temp: 16, icon: '🌧️', cond: 'Foggy Rain', dist: '600 km' },
  { name: 'Digha Beach', temp: 28, icon: '⛈️', cond: 'Rough Seas', dist: '180 km' },
  { name: 'Sundarbans', temp: 30, icon: '🌦️', cond: 'Showers', dist: '130 km' },
  { name: 'Siliguri', temp: 24, icon: '🌧️', cond: 'Heavy Rain', dist: '570 km' },
]

const RAIN_DROPS = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 4.7 + 1.5) % 97}%`,
  h: 22 + (i * 9) % 44,
  delay: `${((i * 0.28) % 2.9).toFixed(2)}s`,
  dur: `${(0.7 + (i * 0.11) % 0.65).toFixed(2)}s`,
}))

// ── Shared UI ──────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="section-label" style={{
      fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)',
      letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10,
    }}>{children}</div>
  )
}

function Card({
  grad, border, children, span2, pad = 16,
}: {
  grad: string; border?: string; children: ReactNode; span2?: boolean; pad?: number
}) {
  return (
    <div className="futuristic-card interactive-tile" style={{
      background: grad,
      border: `1px solid ${border ?? 'rgba(255,255,255,0.05)'}`,
      borderRadius: 20, padding: pad, overflow: 'hidden', position: 'relative',
      gridColumn: span2 ? '1 / -1' : undefined,
    }}>{children}</div>
  )
}

function CardLabel({ children }: { children: ReactNode }) {
  return (
    <div className="card-label" style={{
      fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.3)',
      letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
    }}>{children}</div>
  )
}

function Badge({ children, color, bg }: { children: ReactNode; color: string; bg: string }) {
  return (
    <span style={{
      position: 'absolute', top: 12, right: 12,
      background: bg, border: `1px solid ${color}44`,
      borderRadius: 20, padding: '3px 8px',
      fontSize: 8, fontWeight: 900, color, letterSpacing: '0.07em',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>{children}</span>
  )
}

function Bar({ pct, fill, height = 4 }: { pct: number; fill: string; height?: number }) {
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.08)', borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: fill, borderRadius: height / 2 }} />
    </div>
  )
}

// ── Nav Icons ──────────────────────────────────────────────────────────────────

function NavIcon({ id, active }: { id: Tab; active: boolean }) {
  const c = active ? '#fff' : '#4a4a5a'
  const sw = 1.8
  if (id === 'home') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
  if (id === 'health') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? c : 'none'} stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" fill="none" />
      <path d="m7.5 12 3 3 6-6" fill="none" />
    </svg>
  )
  if (id === 'forecast') return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" fill="none" />
      <path d="M8 16 16 8M10 8h6v6" fill="none" />
    </svg>
  )
}

// ── Bottom Nav ─────────────────────────────────────────────────────────────────

const NAV_TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'health', label: 'Health' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'alerts', label: 'Alerts' },
]

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <nav style={{
      background: 'rgba(7,8,14,0.98)',
      backdropFilter: 'blur(28px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexShrink: 0,
      paddingBottom: 8,
    }}>
      {NAV_TABS.map(item => {
        const active = tab === item.id
        return (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`mausam-nav-button${active ? ' active' : ''}`}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, padding: '11px 0 7px', background: 'none', border: 'none', cursor: 'pointer',
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

function AudienceFocus() {
  const items = [
    { icon: '♥', label: 'Health', value: 'AQI 78 · UV 6', tone: 'focus-health' },
    { icon: '↗', label: 'Move', value: 'Run 5:30–7 AM', tone: 'focus-move' },
    { icon: '⌁', label: 'Commute', value: 'Flooding nearby', tone: 'focus-commute' },
    { icon: '⌂', label: 'Outdoors', value: 'Rough seas · 2.1m', tone: 'focus-outdoors' },
  ]
  return (
    <div className="audience-focus">
      <div className="audience-focus-heading">Today, at a glance</div>
      <div className="audience-focus-grid">
        {items.map(item => (
          <div key={item.label} className={`audience-focus-card ${item.tone}`}>
            <span className="audience-focus-icon">{item.icon}</span>
            <div><strong>{item.label}</strong><small>{item.value}</small></div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Home Tab ───────────────────────────────────────────────────────────────────

function HomeTab({ time, profile }: { time: Date; profile: Profile }) {
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const isRainy = /rain|storm|shower|drizzle/i.test(W.condition)

  return (
    <div className="home-screen" style={{ padding: '52px 16px 24px', animation: 'fadeUp 0.4s ease' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#60a5fa">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', letterSpacing: '-0.01em' }}>
              {W.city}, {W.region}
            </span>
          </div>
          <div style={{ fontSize: 11, color: '#35374a', fontWeight: 600 }}>{fmtDate(time)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'white', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(time)}
          </div>
          <div style={{
            display: 'inline-block', marginTop: 5,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: 20, padding: '2px 9px',
            fontSize: 8, fontWeight: 900, color: '#f87171', letterSpacing: '0.08em',
          }}>● MONSOON ACTIVE</div>
        </div>
      </div>

      <div className="personal-insight home-insight">
        <div className="insight-spark">✦</div>
        <div><strong>{profile.name ? `Good morning, ${profile.name}` : 'Your Mausam briefing'}</strong><span>Personalised for {profile.location || 'your location'}{profile.sensitivities.length ? ` · Watching ${profile.sensitivities.slice(0, 2).join(' + ')}` : ''}</span></div>
        <div className="insight-arrow">›</div>
      </div>
      {/* Hero Card */}
      <div style={{
        background: 'linear-gradient(150deg, #192f52 0%, #0e1c38 40%, #070d1e 100%)',
        borderRadius: 24, padding: '26px 22px 22px', marginBottom: 14,
        position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Ambient glows */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -50, left: -30, width: 180, height: 180, background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)', borderRadius: '50%', pointerEvents: 'none' }} />

        {/* Rain animation */}
        {RAIN_DROPS.map((r, i) => (
          <div key={i} className="hourly-tile" style={{
            position: 'absolute', left: r.left, top: 0,
            width: 1, height: r.h,
            background: 'linear-gradient(to bottom, transparent, rgba(147,197,253,0.28))',
            borderRadius: 1, pointerEvents: 'none',
            animation: `rainFall ${r.dur} ${r.delay} linear infinite`,
          }} />
        ))}

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 82, fontWeight: 800, color: 'white', lineHeight: 1, letterSpacing: '-0.05em' }}>
                {W.temp}<span style={{ fontSize: 38, fontWeight: 300, color: 'rgba(255,255,255,0.4)' }}>°</span>
              </div>
              <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', fontWeight: 500, marginTop: 6 }}>{W.condition}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
                Feels {W.feelsLike}° &nbsp;·&nbsp; H:{W.high}° L:{W.low}°
              </div>
            </div>
            <div className={`weather-companion ${isRainy ? 'weather-companion-rain' : 'weather-companion-sun'}`} aria-label={isRainy ? 'Person opening an umbrella in the rain' : 'Person putting on a sun cap'}>
              <svg className="companion-illustration" viewBox="0 0 140 140" aria-hidden="true">
                {isRainy ? <>
                  <g className="illustration-rain" stroke="#c8f2fa" strokeWidth="2" strokeLinecap="round" opacity=".65">
                    <path d="M16 16l-6 14" /><path d="M48 8l-6 14" /><path d="M114 12l-6 14" />
                    <path d="M25 49l-6 14" /><path d="M128 48l-6 14" />
                  </g>
                  <ellipse className="illustration-puddle" cx="78" cy="124" rx="47" ry="8" fill="#b9e7ef" opacity=".3" />
                  <ellipse className="illustration-reflection" cx="78" cy="125" rx="20" ry="3" fill="#e4fbff" opacity=".35" />
                </> : <circle cx="106" cy="28" r="20" fill="#f7d36b" opacity=".9" />}
                <g className="illustration-person">
                  {isRainy ? <>
                    <path d="M58 51q19-18 39 0l-5 42H63Z" fill="#f4cf57" />
                    <path d="M57 51q-1-22 20-25 22 3 20 25-20 14-40 0Z" fill="#f8d95e" />
                    <path d="M66 45q11-13 22 0v12H66Z" fill="#fff3db" />
                    <circle cx="73" cy="49" r="2.4" fill="#303846" /><circle cx="82" cy="49" r="2.4" fill="#303846" />
                    <path d="M76 55q3 2 6 0" fill="none" stroke="#d38f86" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M67 68v15M87 68v15" stroke="#d19e2e" strokeWidth="2" strokeLinecap="round" />
                    <path d="M65 91l-2 28M89 91l2 28" stroke="#f4cf57" strokeWidth="9" strokeLinecap="round" />
                    <path d="M58 119q7-4 14 0M84 119q7-4 14 0" fill="none" stroke="#d49d32" strokeWidth="5" strokeLinecap="round" />
                  </> : <>
                    <circle cx="81" cy="55" r="8" fill="#efc4ac" />
                    <path d="M74 53q3-10 13-3l-2 6Z" fill="#283746" />
                    <path d="M75 64q10-5 18 3l-4 29H72Z" fill="#58a9b4" />
                    <path d="M77 70l-12 15M89 71l-8 14" fill="none" stroke="#efc4ac" strokeWidth="5" strokeLinecap="round" />
                    <path d="M75 94l-2 28M87 94l7 28" fill="none" stroke="#344555" strokeWidth="7" strokeLinecap="round" />
                  </>}
                </g>
                {!isRainy && <path d="M71 48q10-13 24-3l-13 4Z" fill="#d8ed75" />}
              </svg>
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            marginTop: 20, paddingTop: 18,
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}>
            {[
              { icon: '💨', v: `${W.wind}`, u: 'km/h', l: W.windDir },
              { icon: '💧', v: `${W.humidity}`, u: '%', l: 'Humidity' },
              { icon: '👁️', v: `${W.visibility}`, u: 'km', l: 'Visibility' },
              { icon: '🌡️', v: `${W.dewPoint}`, u: '°', l: 'Dew Pt.' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15 }}>{s.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'white', marginTop: 4 }}>
                  {s.v}<span style={{ fontSize: 9, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>{s.u}</span>
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AudienceFocus />

      {/* Hourly Forecast */}
      <div style={{ marginBottom: 22 }}>
        <SectionLabel>Hourly · Rain Chance</SectionLabel>
        <div className="no-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {HOURLY.map((h, i) => (
            <div key={i} style={{
              flexShrink: 0, width: 62, borderRadius: 16, padding: '11px 6px',
              background: i === 0 ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${i === 0 ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.06)'}`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: i === 0 ? '#60a5fa' : 'rgba(255,255,255,0.35)', fontWeight: 700, marginBottom: 6 }}>{h.t}</div>
              <div style={{ fontSize: 20 }}>{h.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginTop: 4 }}>{h.temp}°</div>
              <div style={{ fontSize: 9, color: '#60a5fa', marginTop: 2, fontWeight: 700 }}>{h.rain}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Grid */}
      <div style={{ marginBottom: 22 }}>
        <SectionLabel>Today's Metrics</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* AQI */}
          <Card grad="linear-gradient(140deg,#431407 0%,#1c0803 100%)" border="rgba(245,158,11,0.12)">
            <Badge color="#fbbf24" bg="rgba(245,158,11,0.14)">AQI 78</Badge>
            <CardLabel>Air Quality</CardLabel>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>Moderate</div>
            <Bar pct={(78 / 300) * 100} fill="linear-gradient(90deg,#22c55e,#f59e0b 50%,#ef4444)" height={5} />
            <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
              {[['PM2.5','42','#f59e0b'],['PM10','68','#f97316']].map(([l,v,c]) => (
                <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{l}</div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: c }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* UV */}
          <Card grad="linear-gradient(140deg,#7c2d12 0%,#2c0e07 100%)" border="rgba(251,146,60,0.1)">
            <Badge color="#fb923c" bg="rgba(251,146,60,0.14)">HIGH</Badge>
            <CardLabel>UV Index</CardLabel>
            <div style={{ fontSize: 46, fontWeight: 800, color: 'white', lineHeight: 1 }}>{W.uvIndex}</div>
            <div style={{ fontSize: 11, color: '#fb923c', fontWeight: 700, marginTop: 5 }}>SPF 30+ needed</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>Peak 11AM–2PM</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>Burn time ~25 min</div>
          </Card>

          {/* Best Run */}
          <Card grad="linear-gradient(140deg,#064e3b 0%,#022c22 100%)" border="rgba(52,211,153,0.1)">
            <Badge color="#34d399" bg="rgba(52,211,153,0.14)">FITNESS</Badge>
            <CardLabel>Best Run Time</CardLabel>
            <div style={{ fontSize: 21, fontWeight: 800, color: 'white', lineHeight: 1.3 }}>
              {W.bestRunStart}–<br />{W.bestRunEnd}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 7 }}>Before peak humidity</div>
            <div style={{ fontSize: 10, color: '#34d399', marginTop: 5 }}>🌅 Sunrise {W.sunrise}</div>
          </Card>

          {/* Rain Today */}
          <Card grad="linear-gradient(140deg,#1e3a5f 0%,#0a1830 100%)" border="rgba(96,165,250,0.1)">
            <Badge color="#60a5fa" bg="rgba(96,165,250,0.14)">{W.rainChance}%</Badge>
            <CardLabel>Rainfall Today</CardLabel>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1 }}>
              {W.rainfall24h}<span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>mm</span>
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>Recorded today</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>Month: {W.rainfallMonth}mm</div>
          </Card>

          {/* Commute — full width */}
          <Card grad="linear-gradient(140deg,#2e1065 0%,#100522 100%)" border="rgba(167,139,250,0.1)" span2>
            <Badge color="#f87171" bg="rgba(239,68,68,0.14)">DISRUPTED</Badge>
            <CardLabel>Commute Status · Kolkata</CardLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
              {[
                { icon: '🚇', name: 'Metro Line', val: 'Modified', sub: 'Delays expected' },
                { icon: '🚗', name: 'EM Bypass', val: 'Flooded', sub: 'Park St · Behala' },
                { icon: '👁️', name: 'Howrah Br.', val: '1.8 km', sub: 'Visibility' },
              ].map(c => (
                <div key={c.name} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18 }}>{c.icon}</div>
                  <div style={{ fontSize: 8, color: '#a78bfa', fontWeight: 800, marginTop: 5, letterSpacing: '0.04em' }}>{c.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'white', marginTop: 2 }}>{c.val}</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.28)', marginTop: 1 }}>{c.sub}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Digha Beach */}
          <Card grad="linear-gradient(140deg,#083344 0%,#031520 100%)" border="rgba(34,211,238,0.08)">
            <Badge color="#f87171" bg="rgba(239,68,68,0.14)">ROUGH</Badge>
            <CardLabel>Digha Beach · 180km</CardLabel>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1 }}>
              {W.waveHeight}<span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>m</span>
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 5 }}>Wave height</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>
              💧 {W.waterTemp}°C · High {W.tideHigh}
            </div>
            <div style={{ fontSize: 9, color: '#f87171', marginTop: 5 }}>🚫 No swimming advised</div>
          </Card>

          {/* Garden */}
          <Card grad="linear-gradient(140deg,#14532d 0%,#071a10 100%)" border="rgba(74,222,128,0.08)">
            <Badge color="#4ade80" bg="rgba(74,222,128,0.14)">AMAN</Badge>
            <CardLabel>Garden & Crops</CardLabel>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.45 }}>{W.cropAdvice}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 7 }}>🌱 Soil: {W.soilMoisture}</div>
            <div style={{ fontSize: 9, color: '#4ade80', marginTop: 5 }}>🐟 Hilsa season active!</div>
          </Card>
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div style={{ marginBottom: 14 }}>
        <SectionLabel>7-Day Forecast</SectionLabel>
        <div style={{
          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20, overflow: 'hidden',
        }}>
          {WEEKLY.map((w, i) => (
            <div key={w.day} style={{
              display: 'flex', alignItems: 'center', padding: '13px 16px',
              borderBottom: i < WEEKLY.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              background: i === 0 ? 'rgba(59,130,246,0.05)' : 'transparent',
            }}>
              <div style={{ width: 44, fontSize: 12, fontWeight: 700, color: i === 0 ? '#60a5fa' : 'rgba(255,255,255,0.6)' }}>{w.day}</div>
              <div style={{ fontSize: 20, marginRight: 8 }}>{w.icon}</div>
              <div style={{ flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.32)' }}>{w.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 8, fontWeight: 800, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', borderRadius: 8, padding: '2px 5px' }}>{w.rain}%</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.32)', minWidth: 22 }}>{w.lo}°</span>
                <div style={{ width: 34, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, ((w.hi - 24) / 10) * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#60a5fa,#f59e0b)', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'white', minWidth: 22 }}>{w.hi}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Durga Puja Countdown */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(251,191,36,0.07) 0%,rgba(239,68,68,0.04) 100%)',
        border: '1px solid rgba(251,191,36,0.14)', borderRadius: 16, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ fontSize: 26 }}>🪔</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#fbbf24' }}>Durga Puja in {W.festivalDays} days</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>Oct 2–6 · Expect pleasant post-monsoon weather!</div>
        </div>
        <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.18)' }}>›</div>
      </div>
    </div>
  )
}

// ── Health Tab ─────────────────────────────────────────────────────────────────

function HealthTab() {
  return (
    <div style={{ padding: '52px 16px 24px', animation: 'fadeUp 0.4s ease' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.03em', marginBottom: 18 }}>Health Metrics</div>

      {/* AQI Detailed */}
      <Card grad="linear-gradient(140deg,#431407 0%,#1a0803 100%)" border="rgba(245,158,11,0.12)" pad={20}>
        <CardLabel>Air Quality Index · Kolkata</CardLabel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 52, fontWeight: 800, color: 'white', lineHeight: 1 }}>78</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fbbf24', marginTop: 5 }}>Moderate</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Updated just now</div>
          </div>
          <div style={{ fontSize: 40 }}>😷</div>
        </div>
        <Bar pct={(78 / 300) * 100} fill="linear-gradient(90deg,#22c55e 0%,#f59e0b 35%,#ef4444 70%,#dc2626 100%)" height={6} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'rgba(255,255,255,0.22)', marginTop: 5, marginBottom: 16 }}>
          {['Good','Moderate','Sensitive','Poor','Very Poor'].map(l => <span key={l}>{l}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { n: 'PM2.5', v: 42, max: 100, fill: '#f59e0b', u: 'µg/m³' },
            { n: 'PM10', v: 68, max: 150, fill: '#f97316', u: 'µg/m³' },
            { n: 'O₃', v: 38, max: 120, fill: '#60a5fa', u: 'µg/m³' },
            { n: 'NO₂', v: 22, max: 80, fill: '#a78bfa', u: 'µg/m³' },
          ].map(p => (
            <div key={p.n} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>{p.n}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: p.fill }}>{p.v}</span>
              </div>
              <Bar pct={(p.v / p.max) * 100} fill={p.fill} height={3} />
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', marginTop: 3 }}>{p.u}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, background: 'rgba(245,158,11,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 11, color: '#fbbf24', lineHeight: 1.55 }}>
          💡 Asthma / COPD sufferers: limit outdoor time. Mask recommended near high-traffic zones.
        </div>
      </Card>

      <div style={{ height: 12 }} />

      {/* UV Detailed */}
      <Card grad="linear-gradient(140deg,#7c2d12 0%,#2c0e07 100%)" border="rgba(251,146,60,0.1)" pad={20}>
        <CardLabel>UV Index</CardLabel>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: 'white', lineHeight: 1 }}>6</div>
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#fb923c' }}>High</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>SPF 30+ needed</div>
          </div>
        </div>
        <div style={{
          height: 6, borderRadius: 3,
          background: 'linear-gradient(90deg,#22c55e,#eab308 30%,#f97316 60%,#ef4444 80%,#dc2626)',
          marginBottom: 8, overflow: 'hidden', position: 'relative',
        }}>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${((11 - W.uvIndex) / 11) * 100}%`, background: 'rgba(0,0,0,0.5)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: 'rgba(255,255,255,0.22)', marginBottom: 14 }}>
          {['Low','Moderate','High','Very High','Extreme'].map(l => <span key={l}>{l}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Peak Hours</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'white', marginTop: 4 }}>11AM – 2PM</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Burn Time</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#fb923c', marginTop: 4 }}>~25 min</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>
          ☂️ Carry umbrella &nbsp;·&nbsp; 😎 Wear sunglasses &nbsp;·&nbsp; 🧴 Reapply SPF every 2h
        </div>
      </Card>

      <div style={{ height: 12 }} />

      {/* Pollen */}
      <Card grad="linear-gradient(140deg,#14532d 0%,#071a10 100%)" border="rgba(74,222,128,0.08)" pad={20}>
        <CardLabel>Pollen Count</CardLabel>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>Moderate</div>
          <div style={{ fontSize: 28 }}>🌿</div>
        </div>
        {[
          { type: 'Tree', level: 'Low', pct: 20, fill: '#4ade80' },
          { type: 'Grass', level: 'Moderate', pct: 55, fill: '#eab308' },
          { type: 'Weed', level: 'High', pct: 80, fill: '#f97316' },
        ].map(p => (
          <div key={p.type} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{p.type}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: p.fill }}>{p.level}</span>
            </div>
            <Bar pct={p.pct} fill={p.fill} height={3} />
          </div>
        ))}
        <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.38)', background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '9px 12px', lineHeight: 1.55 }}>
          🤧 Keep windows closed 10AM–3PM · Antihistamine recommended if allergy-prone
        </div>
      </Card>

      <div style={{ height: 12 }} />

      {/* Heat & Hydration */}
      <Card grad="linear-gradient(140deg,#1e3a5f 0%,#0a1830 100%)" border="rgba(96,165,250,0.08)" pad={20}>
        <CardLabel>Heat & Hydration</CardLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#f87171', lineHeight: 1 }}>{W.heatIndex}°</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 4 }}>Heat Index</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>{W.humidity}%</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 4 }}>Humidity</div>
          </div>
        </div>
        <div style={{ background: 'rgba(96,165,250,0.08)', borderRadius: 10, padding: '10px 12px', fontSize: 11, color: '#60a5fa', lineHeight: 1.6 }}>
          💧 Drink 3–4L water today &nbsp;·&nbsp; Avoid exertion 11AM–4PM &nbsp;·&nbsp; ORS if feeling dehydrated
        </div>
      </Card>
    </div>
  )
}

// ── Forecast Tab ───────────────────────────────────────────────────────────────

function ForecastTab() {
  return (
    <div style={{ padding: '52px 16px 24px', animation: 'fadeUp 0.4s ease' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.03em', marginBottom: 18 }}>Extended Forecast</div>

      {/* 7 Day */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Next 7 Days</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {WEEKLY.map((w, i) => (
            <div key={w.day} style={{
              background: i === 0 ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${i === 0 ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 16, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ width: 44, fontSize: 12, fontWeight: 700, color: i === 0 ? '#60a5fa' : 'rgba(255,255,255,0.65)' }}>{w.day}</div>
              <div style={{ fontSize: 22 }}>{w.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{w.desc}</div>
                <span style={{ fontSize: 8, fontWeight: 800, color: '#60a5fa', background: 'rgba(96,165,250,0.1)', borderRadius: 8, padding: '1px 5px', marginTop: 4, display: 'inline-block' }}>
                  🌧️ {w.rain}%
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)' }}>{w.lo}°</span>
                <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, ((w.hi - 24) / 10) * 100)}%`, height: '100%', background: 'linear-gradient(90deg,#60a5fa,#f59e0b)', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{w.hi}°</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sun & Moon */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Sun & Moon</SectionLabel>
        <Card grad="linear-gradient(140deg,#1a2a4a 0%,#0d1730 100%)" border="rgba(255,255,255,0.06)" pad={20}>
          <div className="sun-times-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="sun-time-tile">
              <div className="sun-time-icon sunrise-icon">☼</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fbbf24', marginTop: 6 }}>{W.sunrise}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)' }}>Sunrise</div>
            </div>
            <div className="sun-time-tile">
              <div className="sun-time-icon sunset-icon">◒</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f97316', marginTop: 6 }}>{W.sunset}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)' }}>Sunset</div>
            </div>
          </div>
          <svg viewBox="0 0 280 68" style={{ width: '100%', height: 58, marginBottom: 4 }}>
            <path d="M10 60 Q140 -12 270 60" fill="none" stroke="rgba(251,191,36,0.22)" strokeWidth="2" strokeDasharray="5 4" />
            <circle cx="140" cy="18" r="9" fill="#fbbf24" />
            <circle cx="140" cy="18" r="15" fill="rgba(251,191,36,0.14)" />
            <line x1="0" y1="61" x2="280" y2="61" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.22)', marginBottom: 16 }}>
            <span>{W.sunrise}</span>
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>Solar noon · 12:47 PM</span>
            <span>{W.sunset}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { icon: '◐', label: 'Moon Phase', val: 'Waxing Gibbous', className: 'moon-detail-tile' },
              { icon: '☼', label: 'Golden Hour', val: '5:51 PM', className: 'golden-hour-tile' },
              { icon: '◔', label: 'Moonrise', val: '8:45 PM', className: 'moon-detail-tile' },
            ].map(m => (
              <div key={m.label} className={`sun-detail-tile ${m.className}`} style={{ textAlign: 'center' }}>
                <div className="sun-detail-icon">{m.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'white', marginTop: 5 }}>{m.val}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', marginTop: 2 }}>{m.label}</div>
                {m.label === 'Golden Hour' && <div className="golden-progress"><span /></div>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Monthly Rainfall */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>August Rainfall</SectionLabel>
        <Card grad="linear-gradient(140deg,#1e3a5f 0%,#0a1830 100%)" border="rgba(96,165,250,0.08)" pad={20}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 34, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                {W.rainfallMonth} <span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.35)' }}>mm</span>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 4 }}>of ~395mm August avg</div>
            </div>
            <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 800 }}>79%</div>
          </div>
          <Bar pct={(W.rainfallMonth / 395) * 100} fill="linear-gradient(90deg,#60a5fa,#818cf8)" height={5} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 60, marginTop: 16 }}>
            {[28, 12, 45, 18, 52, 38, 34].map((v, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{
                  width: '100%', borderRadius: '3px 3px 0 0',
                  height: `${(v / 55) * 46}px`,
                  background: i === 6 ? '#60a5fa' : 'rgba(96,165,250,0.22)',
                }} />
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.22)' }}>
                  {['22','23','24','25','26','27','28'][i]}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Comfort Index */}
      <SectionLabel>Comfort & Feel</SectionLabel>
      <Card grad="linear-gradient(140deg,#2e1065 0%,#100522 100%)" border="rgba(167,139,250,0.08)" pad={20}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 46, fontWeight: 800, color: '#f87171', lineHeight: 1 }}>{W.comfortIndex}°</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f87171', marginTop: 5 }}>Uncomfortable</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Comfort Index</div>
          </div>
          <div style={{ fontSize: 36 }}>🥵</div>
        </div>
        {[
          { l: 'Temperature', v: `${W.temp}°C`, pct: 60, fill: '#f59e0b' },
          { l: 'Humidity', v: `${W.humidity}%`, pct: 89, fill: '#60a5fa' },
          { l: 'Wind', v: `${W.wind} km/h`, pct: 40, fill: '#a78bfa' },
        ].map(c => (
          <div key={c.l} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{c.l}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>{c.v}</span>
            </div>
            <Bar pct={c.pct} fill={c.fill} height={3} />
          </div>
        ))}
        <div style={{ marginTop: 12, background: 'rgba(167,139,250,0.06)', borderRadius: 10, padding: '10px 12px', fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.55 }}>
          🎪 Event planners: Provide shade & water stations. Rain disruption probability ~30%.
        </div>
      </Card>
    </div>
  )
}

// ── Alerts Tab ─────────────────────────────────────────────────────────────────

function AlertsTab() {
  return (
    <div style={{ padding: '52px 16px 24px', animation: 'fadeUp 0.4s ease' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'white', letterSpacing: '-0.03em', marginBottom: 18 }}>Alerts & Travel</div>

      {/* Active Alerts */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Active Alerts · 3</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ALERTS.map(a => (
            <div key={a.title} style={{
              background: a.bg, border: `1px solid ${a.border}`, borderRadius: 16, padding: 16,
            }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.dot, flexShrink: 0, marginTop: 4 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{a.title}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', marginLeft: 8, flexShrink: 0 }}>{a.time}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.52)', lineHeight: 1.55 }}>{a.body}</div>
                  <div style={{
                    display: 'inline-block', marginTop: 8,
                    background: a.border, borderRadius: 8, padding: '2px 8px',
                    fontSize: 8, fontWeight: 900, color: a.dot, letterSpacing: '0.06em',
                  }}>{a.level.toUpperCase()} ALERT · IMD</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved Locations */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Saved Locations</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {LOCATIONS.map(l => (
            <div key={l.name} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 22 }}>{l.icon}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.28)', fontWeight: 600 }}>{l.dist}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>{l.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)', marginBottom: 8 }}>{l.cond}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'white' }}>{l.temp}°</div>
            </div>
          ))}
        </div>
      </div>

      {/* Packing List */}
      <div style={{ marginBottom: 20 }}>
        <SectionLabel>Today's Packing List</SectionLabel>
        <Card grad="linear-gradient(140deg,#1a3256 0%,#0d1a2e 100%)" border="rgba(96,165,250,0.08)" pad={16}>
          <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 800, marginBottom: 14 }}>For Kolkata · 28 Aug 2026</div>
          {[
            { icon: '☂️', item: 'Heavy duty umbrella', why: '92% rain chance' },
            { icon: '👟', item: 'Waterproof footwear', why: 'Severe waterlogging' },
            { icon: '🧴', item: 'Sunscreen SPF 30+', why: 'UV Index 6 (High)' },
            { icon: '💧', item: 'Water bottle (1L+)', why: 'Heat index 41°C' },
            { icon: '😷', item: 'N95 mask', why: 'AQI 78 (Moderate)' },
            { icon: '📱', item: 'Power bank', why: 'Power cuts likely' },
          ].map((p, i, arr) => (
            <div key={p.item} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              paddingBottom: i < arr.length - 1 ? 12 : 0,
              marginBottom: i < arr.length - 1 ? 12 : 0,
              borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{ fontSize: 22, width: 30, flexShrink: 0, textAlign: 'center' }}>{p.icon}</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{p.item}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)', marginTop: 1 }}>{p.why}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Durga Puja Event Planner */}
      <SectionLabel>Event Planner</SectionLabel>
      <Card grad="linear-gradient(140deg,rgba(251,191,36,0.08) 0%,rgba(239,68,68,0.04) 100%)" border="rgba(251,191,36,0.14)" pad={18}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 3 }}>🪔 Durga Puja 2026</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.38)' }}>Oct 2–6 · Starts in {W.festivalDays} days</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.32)' }}>Expected</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>Post-monsoon</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'white' }}>28°C avg</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>Expected temp</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#4ade80' }}>Low Rain</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.32)', marginTop: 2 }}>~15% chance</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>
          💡 Plan pandal visits 5–9 AM for best weather. Avoid afternoons during first two days.
        </div>
      </Card>
    </div>
  )
}

// ── Personal setup ─────────────────────────────────────────────────────────────

type SetupStep = 'welcome' | 'location' | 'body' | 'sensitivities' | 'routine' | 'ready'
type Profile = { name: string; location: string; sensitivities: string[]; concerns: string[]; goals: string[]; age: number; height: number; weight: number; activity: string }

const SETUP_STEPS: SetupStep[] = ['welcome', 'location', 'body', 'sensitivities', 'routine', 'ready']

const choiceSets = {
  sensitivities: ['Dust', 'Pollen', 'AQI / smoke', 'Humidity', 'Heat', 'Monsoon damp', 'Cold', 'UV / sun'],
  concerns: ['Asthma', 'Allergies', 'Migraine', 'Skin sensitivity', 'Heart health', 'None of these'],
  goals: ['Daily energy', 'Outdoor plans', 'Fitness', 'Sleep', 'Travel', 'Family care'],
}

function SetupChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return <button className={`setup-chip${selected ? ' selected' : ''}`} onClick={onClick} type="button"><span className="chip-mark">{selected ? '✓' : '+'}</span>{label}</button>
}

function Setup({ onComplete }: { onComplete: (profile: Profile) => void }) {
  const [step, setStep] = useState<SetupStep>('welcome')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('Kolkata')
  const [age, setAge] = useState(29)
  const [height, setHeight] = useState(168)
  const [weight, setWeight] = useState(64)
  const [sex, setSex] = useState('Prefer not to say')
  const [sensitivities, setSensitivities] = useState<string[]>([])
  const [concerns, setConcerns] = useState<string[]>([])
  const [goals, setGoals] = useState<string[]>(['Daily energy'])
  const [activity, setActivity] = useState('Moderate')
  const [entryProgress, setEntryProgress] = useState(0)
  const stepIndex = SETUP_STEPS.indexOf(step)
  const toggle = (value: string, values: string[], setValues: (next: string[]) => void) => setValues(values.includes(value) ? values.filter(item => item !== value) : [...values, value])
  const next = () => setStep(SETUP_STEPS[Math.min(stepIndex + 1, SETUP_STEPS.length - 1)])
  const back = () => setStep(SETUP_STEPS[Math.max(stepIndex - 1, 0)])
  const slider = (label: string, value: number, min: number, max: number, unit: string, setValue: (value: number) => void) => (
    <div className="setup-slider-row">
      <div className="setup-slider-heading"><span><i>◈</i>{label}</span><strong>{value} <small>{unit}</small></strong></div>
      <div className="slider-console">
        <div className="slider-ticks">{Array.from({ length: 11 }, (_, index) => <i key={index} />)}</div>
        <input className="vayu-slider setup-range" style={{ '--slider-progress': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties} type="range" min={min} max={max} value={value} aria-label={label} onChange={event => setValue(Number(event.target.value))} />
        <output className="slider-value-bubble" style={{ '--slider-progress': `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}>{value}</output>
      </div>
      <div className="range-ends"><span>{min} {unit}</span><span>{max} {unit}</span></div>
    </div>
  )
  return (
    <main className="setup-shell"><div className="setup-noise" /><div className="setup-topbar"><div className="brand-mark"><span>✦</span> MAUSAM</div>{step !== 'welcome' && step !== 'ready' && <div className="setup-progress"><span style={{ width: `${Math.max(9, (stepIndex / 5) * 100)}%` }} /></div>}{step !== 'welcome' && <button className="setup-back" onClick={back} type="button">←</button>}</div>
      <div className="setup-content">
        {step === 'welcome' && <section className="setup-hero welcome-glass setup-animate"><div className="welcome-orb welcome-orb-a" /><div className="welcome-orb welcome-orb-b" /><div className="welcome-menu"><span className="welcome-menu-active">today</span><span>discover</span><span>for you</span><span>mausam</span></div><div className="welcome-brand"><span>✦</span> MAUSAM</div><div className="setup-eyebrow">PERSONAL WEATHER INTELLIGENCE</div><h1>feel the<br /><em>weather.</em></h1><p>Personal signals for a clearer day. Mausam turns the air, light and rain around you into guidance made for your body.</p><div className="welcome-reading"><span className="reading-dot" /><div><small>FIRST READING</small><strong>Kolkata · monsoon</strong></div><b>31°</b></div><button className="welcome-start" onClick={next} type="button"><span>start your profile</span><b>→</b></button><div className="setup-footnote">Your weather. Your rhythm. Your way.</div></section>}
        {step === 'location' && <section className="setup-panel setup-animate"><div className="setup-eyebrow">01 / YOUR PLACE</div><h2>Where should we<br /><em>start looking?</em></h2><p className="setup-copy">Your local weather, air quality and seasonal patterns will shape every insight.</p><label className="setup-label">YOUR NAME <span>OPTIONAL</span></label><input className="setup-input" placeholder="What should we call you?" value={name} onChange={event => setName(event.target.value)} /><label className="setup-label">HOME LOCATION</label><div className="location-field"><span>⌖</span><input className="setup-input" value={location} onChange={event => setLocation(event.target.value)} /><b>Current</b></div><div className="location-card"><span className="location-icon">◉</span><div><strong>{location || 'Your location'}</strong><small>West Bengal · India</small></div><span className="location-check">✓</span></div><button className="setup-primary" onClick={next} type="button">That’s right <span>→</span></button></section>}
        {step === 'body' && <section className="setup-panel setup-animate"><div className="setup-eyebrow">02 / YOUR BASELINE</div><h2>A little context<br /><em>goes a long way.</em></h2><p className="setup-copy">These numbers help us make hydration, heat and activity guidance more personal.</p><div className="setup-body-stack"><div><label className="setup-label">AGE</label>{slider('Age', age, 13, 90, 'yrs', setAge)}</div><div><label className="setup-label">GENDER</label><div className="gender-options">{['Female', 'Male', 'Non-binary', 'Prefer not to say'].map(item => <button key={item} className={sex === item ? 'active' : ''} onClick={() => setSex(item)} type="button">{item}</button>)}</div></div>{slider('Height', height, 120, 220, 'cm', setHeight)}{slider('Weight', weight, 35, 180, 'kg', setWeight)}</div><button className="setup-primary" onClick={() => setStep('sensitivities')} type="button">Save baseline <span>→</span></button></section>}
        {step === 'sensitivities' && <section className="setup-panel setup-animate"><div className="setup-eyebrow">03 / YOUR RESPONSE</div><h2>What does the<br /><em>weather stir up?</em></h2><p className="setup-copy">Select everything that affects you. We’ll surface the risk before it becomes a bad day.</p><label className="setup-label">WEATHER & AIR TRIGGERS</label><div className="setup-chips">{choiceSets.sensitivities.map(item => <SetupChip key={item} label={item} selected={sensitivities.includes(item)} onClick={() => toggle(item, sensitivities, setSensitivities)} />)}</div><label className="setup-label">HEALTH CONCERNS <span>OPTIONAL</span></label><div className="setup-chips">{choiceSets.concerns.map(item => <SetupChip key={item} label={item} selected={concerns.includes(item)} onClick={() => toggle(item, concerns, setConcerns)} />)}</div><button className="setup-primary" onClick={next} type="button">Tune my alerts <span>→</span></button></section>}
        {step === 'routine' && <section className="setup-panel setup-animate"><div className="setup-eyebrow">04 / YOUR RHYTHM</div><h2>What should your<br /><em>day feel like?</em></h2><p className="setup-copy">We’ll turn conditions into useful nudges for the way you actually live.</p><label className="setup-label">WHAT MATTERS MOST</label><div className="setup-chips">{choiceSets.goals.map(item => <SetupChip key={item} label={item} selected={goals.includes(item)} onClick={() => toggle(item, goals, setGoals)} />)}</div><label className="setup-label">YOUR USUAL ACTIVITY</label><div className="setup-segmented">{['Low', 'Moderate', 'High'].map(item => <button key={item} className={activity === item ? 'active' : ''} onClick={() => setActivity(item)} type="button">{item}</button>)}</div><div className="setup-preview"><span>✦</span><div><strong>Your first insight</strong><small>Monsoon humidity is high today. We’ll suggest your best outdoor window and hydration target.</small></div></div><button className="setup-primary" onClick={next} type="button">See my plan <span>→</span></button></section>}
        {step === 'ready' && <section className="setup-panel setup-login setup-animate"><div className="login-symbol">✦</div><div className="setup-eyebrow">MAUSAM PROFILE READY</div><h2>Your world,<br /><em>in sync.</em></h2><p className="setup-copy">Your personal weather intelligence is ready. Pull the slider to enter your daily view.</p><div className="entry-slider" style={{ '--entry-progress': `${entryProgress}%`, '--entry-progress-ratio': entryProgress / 100 } as React.CSSProperties}><input aria-label="Slide to enter Mausam" type="range" min="0" max="100" value={entryProgress} onChange={event => { const value = Number(event.target.value); setEntryProgress(value); if (value === 100) onComplete({ name, location, sensitivities, concerns, goals, age, height, weight, activity }) }} /><span /><strong>SLIDE TO DIVE IN <b>→</b></strong><i className="entry-handle">→</i></div><div className="setup-consent">Your answers stay on this device until you choose to create an account.</div></section>}
      </div>{step !== 'welcome' && step !== 'ready' && <div className="setup-step-count">{String(stepIndex).padStart(2, '0')} <span>/ 04</span></div>}
    </main>
  )
}

// ── App Root ───────────────────────────────────────────────────────────────────

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tab, setTab] = useState<Tab>('home')
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!profile) return <Setup onComplete={setProfile} />

  return (
    <div className="mausam-app" style={{
      background: '#04050a',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: 430,
        height: '100%',
        background: '#07080e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'home' && <HomeTab time={time} profile={profile} />}
          {tab === 'health' && <HealthTab />}
          {tab === 'forecast' && <ForecastTab />}
          {tab === 'alerts' && <AlertsTab />}
        </div>
        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </div>
  )
}
