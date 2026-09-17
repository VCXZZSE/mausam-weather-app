import { useState } from 'react';
import { SunnyWidget, ThunderstormWidget, MoonWidget } from './presets';
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
};

const PRESETS = [
  { key: 'sunny',        label: 'Sunny',        Widget: SunnyWidget },
  { key: 'thunderstorm', label: 'Thunderstorm',  Widget: ThunderstormWidget },
  { key: 'moon',         label: 'Clear Night',   Widget: MoonWidget },
] as const;

export default function App() {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const isDark = mode === 'dark';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: isDark
          ? 'linear-gradient(160deg, #05070F 0%, #0A0E1E 50%, #080C18 100%)'
          : 'linear-gradient(160deg, #EEF0F8 0%, #DDE2F0 50%, #E8ECF8 100%)',
        transition: 'background 0.5s ease',
        gap: 48,
        padding: 40,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: isDark ? 'rgba(180,190,220,0.35)' : 'rgba(50,60,100,0.3)',
          marginBottom: 6,
        }}>
          Antigravity · Weather Presets · 2×2
        </p>
        <h1 style={{
          margin: 0,
          fontSize: 26,
          fontWeight: 300,
          letterSpacing: '-0.025em',
          color: isDark ? 'rgba(230,236,255,0.9)' : 'rgba(15,20,50,0.85)',
        }}>
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </h1>
      </div>

      {/* Widget row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center' }}>
        {PRESETS.map(({ key, label, Widget }) => (
          <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Widget data={DEMO_DATA[key]} mode={mode} />
            <p style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isDark ? 'rgba(180,190,220,0.3)' : 'rgba(50,60,100,0.28)',
            }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Mode toggle */}
      <button
        onClick={() => setMode(m => m === 'dark' ? 'light' : 'dark')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 24px',
          borderRadius: 100,
          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)',
          color: isDark ? 'rgba(210,220,248,0.8)' : 'rgba(20,30,80,0.7)',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.05em',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontFamily: 'inherit',
        }}
      >
        {isDark ? '☀ Light Mode' : '◗ Dark Mode'}
      </button>
    </div>
  );
}
