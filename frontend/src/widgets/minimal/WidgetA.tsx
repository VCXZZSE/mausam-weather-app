import React from 'react'
import type { ConditionKey } from './WeatherIcon'

export interface MinimalWeatherData {
  temp: number
  feelsLike: number
  city: string
  condition: string
  conditionKey: ConditionKey
  nextHours: number
  loading?: boolean
  error?: boolean
}

interface Props {
  data: MinimalWeatherData
  dark: boolean
}

const W = 288
const R = 20

export function WidgetA({ data, dark }: Props) {
  const hi  = dark ? '#FFFFFF'              : '#1A1A1A'
  const lo  = dark ? 'rgba(255,255,255,0.40)' : 'rgba(26,26,26,0.36)'
  const bg  = dark ? 'rgba(28,28,32,0.94)'  : 'rgba(248,248,250,0.90)'
  const bdr = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'

  const font = "'Google Sans', 'Roboto', system-ui, sans-serif"

  const T = (clr: string, sz: number, wt: number, extra?: React.CSSProperties) => ({
    color: clr, fontSize: sz, fontWeight: wt, lineHeight: 1,
    fontFamily: font, ...extra,
  } as React.CSSProperties)

  if (data.loading || data.error) {
    return (
      <div style={{
        width: W, height: W, borderRadius: R,
        background: bg,
        border: `1px solid ${bdr}`,
        backdropFilter: 'blur(32px) saturate(160%)',
        WebkitBackdropFilter: 'blur(32px) saturate(160%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxSizing: 'border-box',
      }}>
        <span style={T(lo, 14, 400)}>
          {data.loading ? 'Loading…' : 'Unavailable'}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      width: W, height: W, borderRadius: R,
      background: bg,
      border: `1px solid ${bdr}`,
      backdropFilter: 'blur(32px) saturate(160%)',
      WebkitBackdropFilter: 'blur(32px) saturate(160%)',
      padding: '28px 26px',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
      overflow: 'hidden',
      boxSizing: 'border-box',
    }}>
      {/* 24°  now */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={T(hi, 46, 700)}>{data.temp}°</span>
        <span style={T(lo, 46, 400)}>now</span>
      </div>

      {/* in  New York */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 2 }}>
        <span style={T(lo, 36, 400)}>in</span>
        <span style={T(hi, 36, 700, { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 190 })}>
          {data.city}
        </span>
      </div>

      {/* feels  18° */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginTop: 2 }}>
        <span style={T(lo, 30, 400)}>feels</span>
        <span style={T(hi, 30, 700)}>{data.feelsLike}°</span>
      </div>

      {/* ⛅ rain  next */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
        <span style={{ fontSize: 26, lineHeight: 1 }}>
          {conditionEmoji(data.conditionKey)}
        </span>
        <span style={T(hi, 28, 700)}>{data.condition}</span>
        <span style={T(lo, 28, 400)}>next</span>
      </div>

      {/* 2 hrs */}
      <div style={{ marginTop: 0 }}>
        <span style={T(lo, 28, 400)}>{data.nextHours} hrs</span>
      </div>
    </div>
  )
}

function conditionEmoji(key: string) {
  const map: Record<string, string> = {
    clear: '☀️', 'partly-cloudy': '⛅', cloudy: '☁️', foggy: '🌫️',
    drizzle: '🌦️', rain: '🌧️', 'heavy-rain': '🌧️', snow: '🌨️',
    thunderstorm: '⛈️', unknown: '🌡️',
  }
  return map[key] ?? '🌡️'
}
