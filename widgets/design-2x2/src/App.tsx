import { useState } from 'react';
import { SunnyWidget, ThunderstormWidget, MoonWidget, OvercastWidget } from './presets';
import type { WeatherData, ThemeMode } from './presets';

// ── Demo data (replace with live API values in production) ───────────────────
const DEMO_DATA: Record<string, WeatherData> = {
  sunny: {
    temperature: '26°',
    location:    'San Francisco',
    condition:   'Sunny',
    hi:          '29°',
    lo:          '18°',
  },
  thunderstorm: {
    temperature: '14°',
    location:    'New York',
    condition:   'Thunderstorm',
    hi:          '17°',
    lo:          '11°',
  },
  moon: {
    temperature: '19°',
    location:    'Tokyo',
    condition:   'Clear Night',
    hi:          '22°',
    lo:          '15°',
  },
  overcast: {
    temperature: '17°',
    location:    'London',
    condition:   'Overcast',
    hi:          '19°',
    lo:          '13°',
  },
};

const PRESETS = [
  { key: 'sunny',        label: 'Sunny',        Widget: SunnyWidget },
  { key: 'thunderstorm', label: 'Thunderstorm',  Widget: ThunderstormWidget },
  { key: 'moon',         label: 'Clear Night',   Widget: MoonWidget },
  { key: 'overcast',     label: 'Overcast',      Widget: OvercastWidget },
] as const;

export default function App() {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const isDark = mode === 'dark';

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'linear-gradient(160deg, #05070F 0%, #0A0E1E 50%, #080C18 100%)'
          : 'linear-gradient(160deg, #EEF0F8 0%, #DDE2F0 50%, #E8ECF8 100%)',
        transition: 'background 0.5s ease',
        gap: 'clamp(24px, 5vh, 48px)',
        padding: 'clamp(20px, 4vw, 40px) 16px',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <p style={{
          margin: 0,
          fontSize: 'clamp(10px, 2.5vw, 11px)',
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: isDark ? 'rgba(180,190,220,0.45)' : 'rgba(50,60,100,0.4)',
          marginBottom: 6,
        }}>
          Mausam · Weather Presets · 2×2
        </p>
        <h1 style={{
          margin: 0,
          fontSize: 'clamp(22px, 5vw, 28px)',
          fontWeight: 300,
          letterSpacing: '-0.025em',
          color: isDark ? 'rgba(230,236,255,0.95)' : 'rgba(15,20,50,0.9)',
        }}>
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </h1>
      </div>

      {/* Widget grid — phone-ready 2-column on mobile, wrap on desktop */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 170px))',
          gap: 'clamp(14px, 3vw, 24px)',
          justifyContent: 'center',
          width: '100%',
          maxWidth: 780,
        }}
      >
        {PRESETS.map(({ key, label, Widget }) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Widget data={DEMO_DATA[key]} mode={mode} />
            <p style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isDark ? 'rgba(180,190,220,0.4)' : 'rgba(50,60,100,0.38)',
            }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Mode toggle */}
      <button
        type="button"
        onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 28px',
          borderRadius: 100,
          border: isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(0,0,0,0.12)',
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: isDark ? 'rgba(220,230,255,0.9)' : 'rgba(20,30,80,0.85)',
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: '0.04em',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontFamily: 'inherit',
          boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        {isDark ? '☀ Switch to Light Mode' : '◗ Switch to Dark Mode'}
      </button>
    </div>
  );
}
