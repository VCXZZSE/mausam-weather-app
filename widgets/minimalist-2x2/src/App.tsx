import { useState } from 'react'
import { useWeather } from './hooks/useWeather'
import { WidgetA } from './components/WidgetA'
import { WidgetB } from './components/WidgetB'

/* ── Wallpaper gradients ───────────────────────────────────────────────── */
const DARK_WALL  = 'linear-gradient(145deg, #0d0d18 0%, #111827 55%, #0f1729 100%)'
const LIGHT_WALL = 'linear-gradient(145deg, #d4e4f7 0%, #e2ecf9 50%, #cfe0f5 100%)'

export default function App() {
  const [dark, setDark] = useState(true)
  const weather = useWeather()

  const bg       = dark ? '#0a0a10' : '#e5edf7'
  const labelClr = dark ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)'
  const wallGrad = dark ? DARK_WALL : LIGHT_WALL

  /* ambient orb colours */
  const orb1 = dark ? 'rgba(99,102,241,0.22)'  : 'rgba(147,197,253,0.50)'
  const orb2 = dark ? 'rgba(168,85,247,0.18)'  : 'rgba(196,181,253,0.40)'

  return (
    <div style={{
      minHeight: '100vh',
      background: bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px 60px',
      gap: 0,
      fontFamily: "'Google Sans', 'Roboto', system-ui, sans-serif",
      transition: 'background 0.35s ease',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: 660,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 40,
      }}>
        <div>
          <p style={{
            fontSize: 18, fontWeight: 700,
            color: dark ? '#fff' : '#1a1a1a',
            margin: 0, letterSpacing: '-0.02em',
          }}>
            Weather Widget
          </p>
          <p style={{
            fontSize: 12, fontWeight: 500,
            color: labelClr, margin: '2px 0 0',
            letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>
            Android 2×2 · Live API
          </p>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setDark(d => !d)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 100,
            background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
            border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            color: dark ? '#fff' : '#1a1a1a',
            letterSpacing: '0.01em',
            fontFamily: 'inherit',
            transition: 'all 0.25s ease',
          }}
        >
          <span style={{ fontSize: 16 }}>{dark ? '☀️' : '🌙'}</span>
          {dark ? 'Light' : 'Dark'}
        </button>
      </div>

      {/* ── Labels row ─────────────────────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: 660,
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 24, marginBottom: 12,
      }}>
        {['Minimal', 'Visual'].map(label => (
          <p key={label} style={{
            textAlign: 'center', margin: 0,
            fontSize: 11, fontWeight: 600,
            color: labelClr, letterSpacing: '0.10em', textTransform: 'uppercase',
          }}>{label}</p>
        ))}
      </div>

      {/* ── Wallpaper + widgets ─────────────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: 660,
        borderRadius: 32,
        background: wallGrad,
        padding: '32px 24px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        position: 'relative', overflow: 'hidden',
        transition: 'background 0.4s ease',
      }}>
        {/* ambient orbs on the wallpaper */}
        <div style={{
          position: 'absolute', width: 200, height: 200, borderRadius: '50%',
          background: `radial-gradient(circle, ${orb1} 0%, transparent 70%)`,
          top: '-10%', left: '5%', filter: 'blur(30px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 160, height: 160, borderRadius: '50%',
          background: `radial-gradient(circle, ${orb2} 0%, transparent 70%)`,
          bottom: '0%', right: '8%', filter: 'blur(24px)', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <WidgetA data={weather} dark={dark} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <WidgetB data={weather} dark={dark} />
        </div>
      </div>

      {/* ── Status note ─────────────────────────────────────────────────── */}
      <p style={{
        marginTop: 24, fontSize: 12, fontWeight: 400,
        color: labelClr, letterSpacing: '0.01em', textAlign: 'center',
      }}>
        {weather.loading
          ? 'Fetching weather…'
          : weather.error
          ? 'Could not load weather — showing cached data'
          : `Live data · ${weather.city} · updates on load`}
      </p>
    </div>
  )
}
